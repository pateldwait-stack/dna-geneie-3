import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { db, DB_FILE_PATH, initializeDatabase, OWNER_ADMIN_EMAIL } from './server/db.ts';
import {
  createRateLimiter,
  decryptSensitive,
  encryptSensitive,
  extractClientIp,
  extractDeviceInfo,
  generateRandomToken,
  generateTotpSecret,
  hashPassword,
  hashToken,
  isValidPhone,
  normalizePhone,
  phoneMatches,
  verifyPassword,
  verifyTotpCode,
} from './server/security.ts';
import {
  getMailerConfigStatus,
  notifyOwnerSecurityEvent,
  sendUserTransactionalEmail,
} from './server/mailer.ts';

initializeDatabase();

interface AuthUser {
  id: number;
  role: 'member' | 'advisor' | 'admin';
  full_name: string;
  username: string | null;
  email: string;
  phone: string;
  specialization: string;
  status: string;
  email_verified: number;
  assigned_advisor_id: number | null;
  totp_enabled: number;
  consent_privacy: number;
  consent_genomic: number;
  consent_marketing: number;
  deletion_requested_at: string | null;
  created_at: string;
}

interface AuthedRequest extends Request {
  authUser?: AuthUser;
  sessionTokenHash?: string;
}

const SESSION_COOKIE_NAME = 'dnageneie_session';
const SESSION_TTL_DAYS = 7;

function getAppBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function setSessionCookie(req: Request, res: Response, rawToken: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  });
}

function createSessionForUser(req: Request, res: Response, user: AuthUser): string {
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, role, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, tokenHash, user.role, extractClientIp(req), extractDeviceInfo(req), expiresAt);

  setSessionCookie(req, res, rawToken);
  return rawToken;
}

function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const rawToken = cookieToken || bearerToken;

  if (!rawToken) {
    next();
    return;
  }

  const tokenHash = hashToken(rawToken);
  const sessionRow = db
    .prepare(
      `SELECT s.user_id, s.expires_at, u.id, u.role, u.full_name, u.username, u.email, u.phone, u.specialization,
              u.status, u.email_verified, u.assigned_advisor_id, u.totp_enabled, u.consent_privacy, u.consent_genomic,
              u.consent_marketing, u.deletion_requested_at, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as (AuthUser & { expires_at: string }) | undefined;

  if (!sessionRow) {
    next();
    return;
  }

  if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    next();
    return;
  }

  if (sessionRow.status !== 'active') {
    next();
    return;
  }

  req.authUser = {
    id: sessionRow.id,
    role: sessionRow.role,
    full_name: sessionRow.full_name,
    username: sessionRow.username,
    email: sessionRow.email,
    phone: sessionRow.phone,
    specialization: sessionRow.specialization,
    status: sessionRow.status,
    email_verified: sessionRow.email_verified,
    assigned_advisor_id: sessionRow.assigned_advisor_id,
    totp_enabled: sessionRow.totp_enabled,
    consent_privacy: sessionRow.consent_privacy,
    consent_genomic: sessionRow.consent_genomic,
    consent_marketing: sessionRow.consent_marketing,
    deletion_requested_at: sessionRow.deletion_requested_at,
    created_at: sessionRow.created_at,
  };
  req.sessionTokenHash = tokenHash;
  next();
}

function requireRole(...allowedRoles: Array<'member' | 'advisor' | 'admin'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'You do not have permission to access this portal.' });
      return;
    }
    if (req.authUser.role === 'admin' && req.authUser.email.toLowerCase() !== OWNER_ADMIN_EMAIL) {
      res.status(403).json({ error: 'Restricted to authorized website owner administrator account.' });
      return;
    }
    next();
  };
}

function logActivity(params: {
  userId?: number | null;
  email: string;
  accountType: string;
  eventType: string;
  success: boolean;
  details?: string;
  req: Request;
}) {
  db.prepare(`
    INSERT INTO login_activity (user_id, email, account_type, event_type, success, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.userId ?? null,
    params.email.toLowerCase(),
    params.accountType,
    params.eventType,
    params.success ? 1 : 0,
    params.details || '',
    extractClientIp(params.req),
    extractDeviceInfo(params.req)
  );
}

function logAdminAudit(req: AuthedRequest, action: string, targetType: string, targetId: string | number, details: string) {
  if (!req.authUser) return;
  db.prepare(`
    INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.authUser.id,
    req.authUser.email,
    action,
    targetType,
    String(targetId),
    details,
    extractClientIp(req)
  );
}

async function handleFailedLogin(
  req: Request,
  email: string,
  accountType: 'Member' | 'Advisor' | 'Admin',
  reason: string,
  matchedUser?: { id: number; full_name: string; phone: string }
) {
  logActivity({
    userId: matchedUser?.id ?? null,
    email,
    accountType,
    eventType: 'login_failed',
    success: false,
    details: reason,
    req,
  });

  const ip = extractClientIp(req);
  const recentFailures = db
    .prepare(
      `SELECT COUNT(*) as count FROM login_activity
       WHERE success = 0
         AND (email = ? OR ip_address = ?)
         AND datetime(created_at) >= datetime('now', '-15 minutes')`
    )
    .get(email.toLowerCase(), ip) as { count: number };

  if (recentFailures.count >= 3 && recentFailures.count % 3 === 0) {
    logActivity({
      userId: matchedUser?.id ?? null,
      email,
      accountType,
      eventType: 'multiple_failed_attempts',
      success: false,
      details: `${recentFailures.count} failed login attempts detected in the last 15 minutes`,
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'multiple_failed_attempts',
      accountType,
      fullName: matchedUser?.full_name || 'Unidentified Attempt',
      email: email.toLowerCase(),
      phone: matchedUser?.phone || '',
      ipAddress: ip,
      deviceInfo: extractDeviceInfo(req),
      extraNote: `${recentFailures.count} recent failed login attempts within 15 minutes (${reason}).`,
    });
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeUserProjection(row: any): AuthUser {
  return {
    id: row.id,
    role: row.role,
    full_name: row.full_name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    specialization: row.specialization,
    status: row.status,
    email_verified: row.email_verified,
    assigned_advisor_id: row.assigned_advisor_id,
    totp_enabled: row.totp_enabled || 0,
    consent_privacy: row.consent_privacy ?? 1,
    consent_genomic: row.consent_genomic ?? 1,
    consent_marketing: row.consent_marketing ?? 0,
    deletion_requested_at: row.deletion_requested_at || null,
    created_at: row.created_at,
  };
}

function hydrateReportRow(r: any) {
  const rawSummary = decryptSensitive(r.summary || '');
  const rawRecs = decryptSensitive(r.recommendations_json || '[]');
  let recommendations: string[] = [];
  try {
    recommendations = JSON.parse(rawRecs);
  } catch {
    recommendations = rawRecs ? [rawRecs] : [];
  }
  return {
    ...r,
    summary: rawSummary,
    recommendations,
  };
}

function csvCell(val: unknown): string {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(attachAuth);

  const generatedImagesDir = path.resolve(process.cwd(), 'src/assets/images');
  if (fs.existsSync(generatedImagesDir)) {
    app.use('/assets/images', express.static(generatedImagesDir));
  }

  // Rate limiters for authentication, registration, and enquiries
  const authLoginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    name: 'auth-login',
    message: 'Too many sign-in attempts. Please wait before trying again.',
  });
  const authRegisterLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    name: 'auth-register',
    message: 'Too many registration or enquiry submissions. Please try again shortly.',
  });
  const authResetLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 12,
    name: 'auth-reset',
    message: 'Too many password reset or verification requests. Please try again later.',
  });

  function findAccountByEmailOrPhone(role: 'member' | 'advisor', cleanEmail: string, cleanPhoneDigits: string) {
    if (cleanEmail) {
      const byEmail = db
        .prepare('SELECT * FROM users WHERE role = ? AND lower(email) = ?')
        .get(role, cleanEmail) as any;
      if (!byEmail) return null;
      if (cleanPhoneDigits && !phoneMatches(byEmail.phone_normalized || normalizePhone(byEmail.phone), cleanPhoneDigits)) {
        return null;
      }
      return byEmail;
    }
    if (cleanPhoneDigits) {
      const candidates = db
        .prepare("SELECT * FROM users WHERE role = ? AND phone != ''")
        .all(role) as any[];
      return (
        candidates.find((u) => phoneMatches(u.phone_normalized || normalizePhone(u.phone), cleanPhoneDigits)) || null
      );
    }
    return null;
  }

  function generateUniqueUsername(fullName: string, email: string): string {
    const baseSource = fullName.trim() || email.split('@')[0] || 'member';
    const base = baseSource
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 18) || 'member';
    let candidate = `${base}_${generateRandomToken(2)}`;
    while (db.prepare('SELECT id FROM users WHERE lower(username) = ?').get(candidate)) {
      candidate = `${base}_${generateRandomToken(3)}`;
    }
    return candidate;
  }

  // ---------- PUBLIC CATALOG, PROMOS, REVIEWS, SEARCH ----------
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'DNA GENEIE API' });
  });

  app.get('/api/public/catalog', (_req, res) => {
    const reviewStats = db
      .prepare('SELECT product_slug, ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count FROM reviews GROUP BY product_slug')
      .all() as Array<{ product_slug: string; avg_rating: number; review_count: number }>;

    const statsMap = new Map(reviewStats.map((s) => [s.product_slug, s]));

    const products = db
      .prepare(
        `SELECT id, slug, name, category, tagline, description, price_inr, original_price_inr, status, is_active, stock_count, offer_label,
                markers_count, turnaround_days, sample_type, image_url, highlights_json
         FROM products
         WHERE is_active = 1 OR status = 'coming_soon'
         ORDER BY id ASC`
      )
      .all()
      .map((p: any) => {
        const st = statsMap.get(p.slug);
        return {
          ...p,
          highlights: JSON.parse(p.highlights_json || '[]'),
          avg_rating: st?.avg_rating || 4.9,
          review_count: st?.review_count || 0,
        };
      });

    const bundles = db
      .prepare(
        `SELECT id, slug, name, description, included_product_slugs_json, price_inr, individual_total_inr, savings_inr, status, is_active
         FROM bundles
         WHERE is_active = 1 OR status = 'coming_soon'
         ORDER BY id ASC`
      )
      .all()
      .map((b: any) => ({
        ...b,
        included_product_slugs: JSON.parse(b.included_product_slugs_json || '[]'),
      }));

    const promos = db
      .prepare('SELECT id, code, title, description, discount_type, discount_value, min_order_inr, valid_until FROM promos WHERE is_active = 1 ORDER BY id DESC')
      .all();

    const usaSetting = db
      .prepare('SELECT value FROM site_settings WHERE key = ?')
      .get('usa_lab_section_published') as { value: string } | undefined;

    res.json({
      products,
      bundles,
      promos,
      usaLabSectionPublished: usaSetting?.value === 'true',
    });
  });

  app.get('/api/public/reviews/:slug', (req, res) => {
    const reviews = db
      .prepare('SELECT id, product_slug, author_name, rating, title, comment, verified_purchase, created_at FROM reviews WHERE product_slug = ? ORDER BY id DESC')
      .all(String(req.params.slug));
    res.json({ reviews });
  });

  app.post('/api/reviews', requireRole('member'), (req: AuthedRequest, res) => {
    const { productSlug, rating, title, comment } = req.body || {};
    const prod = db.prepare('SELECT slug FROM products WHERE slug = ?').get(String(productSlug));
    if (!prod) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    if (!title || String(title).trim().length < 3 || !comment || String(comment).trim().length < 8) {
      res.status(400).json({ error: 'Please provide a review headline and detailed feedback.' });
      return;
    }

    // Check if member has verified order for this product
    const orders = db
      .prepare("SELECT items_json FROM orders WHERE user_id = ? AND payment_status = 'verified'")
      .all(req.authUser!.id) as Array<{ items_json: string }>;
    const verifiedPurchase = orders.some((o) => {
      const items = JSON.parse(o.items_json || '[]');
      return items.some((i: any) => i.slug === productSlug || (i.includedProducts || []).includes(productSlug));
    });

    const ins = db
      .prepare(
        `INSERT INTO reviews (product_slug, user_id, author_name, rating, title, comment, verified_purchase)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(String(productSlug), req.authUser!.id, req.authUser!.full_name, numRating, String(title).trim(), String(comment).trim(), verifiedPurchase ? 1 : 0);

    res.status(201).json({
      review: db.prepare('SELECT id, product_slug, author_name, rating, title, comment, verified_purchase, created_at FROM reviews WHERE id = ?').get(ins.lastInsertRowid),
    });
  });

  app.post('/api/public/promo/validate', (req, res) => {
    const { code, subtotalInr } = req.body || {};
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) {
      res.status(400).json({ error: 'Enter a promo code.' });
      return;
    }
    const promo = db.prepare('SELECT * FROM promos WHERE upper(code) = ? AND is_active = 1').get(cleanCode) as any;
    if (!promo) {
      res.status(404).json({ error: 'Invalid or expired promo code.' });
      return;
    }
    const amount = Number(subtotalInr) || 0;
    if (amount < promo.min_order_inr) {
      res.status(400).json({ error: `Minimum order of ₹${promo.min_order_inr.toLocaleString('en-IN')} required for ${promo.code}.` });
      return;
    }
    const discountInr =
      promo.discount_type === 'percent'
        ? Math.round((amount * promo.discount_value) / 100)
        : Math.min(amount, promo.discount_value);

    res.json({
      promo: {
        code: promo.code,
        title: promo.title,
        discountInr,
      },
    });
  });

  // ---------- PUBLIC ENQUIRIES ----------
  app.post('/api/enquiries', authRegisterLimiter, async (req: AuthedRequest, res) => {
    const { name, email, phone, subject, interestProduct, message } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!phone || typeof phone !== 'string' || !isValidPhone(phone.trim())) {
      res.status(400).json({ error: 'Please enter a valid phone number (10 to 15 digits).' });
      return;
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      res.status(400).json({ error: 'Please enter a short message about your enquiry.' });
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanInterest =
      typeof interestProduct === 'string' && interestProduct.trim()
        ? interestProduct.trim()
        : typeof subject === 'string' && subject.trim()
          ? subject.trim()
          : 'General DNA Consultation';
    const cleanSubject =
      typeof subject === 'string' && subject.trim() ? subject.trim().slice(0, 160) : cleanInterest;
    const cleanMessage = message.trim();

    const userId = req.authUser?.id ?? null;
    const assignedAdvisorId = req.authUser?.assigned_advisor_id ?? null;

    const info = db
      .prepare(
        `INSERT INTO enquiries (name, email, phone, subject, interest_product, message, user_id, assigned_advisor_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`
      )
      .run(cleanName, cleanEmail, cleanPhone, cleanSubject, cleanInterest, cleanMessage, userId, assignedAdvisorId);

    await notifyOwnerSecurityEvent({
      eventType: 'new_enquiry',
      accountType: 'Customer',
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: `Subject: ${cleanSubject} | Topic: ${cleanInterest} | Message: ${cleanMessage.slice(0, 220)}`,
    });

    res.status(201).json({
      id: info.lastInsertRowid,
      message: 'Your enquiry has been sent to support@dnageneie.com. A DNA GENEIE specialist will contact you shortly.',
    });
  });

  // ---------- AUTHENTICATION: MEMBER ----------
  app.post('/api/auth/member/register', authRegisterLimiter, async (req, res) => {
    const { fullName, username, email, phone, password, confirmPassword, consentPrivacy, consentGenomic, consentMarketing } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
      return;
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!phone || typeof phone !== 'string' || !isValidPhone(phone.trim())) {
      res.status(400).json({ error: 'Please enter a valid phone number (10 to 15 digits).' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }
    if (consentPrivacy === false) {
      res.status(400).json({ error: 'Privacy Notice consent under the DPDP Act is required to create an account.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const phoneDigits = normalizePhone(cleanPhone);

    let cleanUsername = '';
    if (typeof username === 'string' && username.trim().length > 0) {
      if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
        res.status(400).json({ error: 'Username must be 3–30 characters (letters, numbers, _, ., -).' });
        return;
      }
      cleanUsername = username.trim().toLowerCase();
    } else {
      cleanUsername = generateUniqueUsername(fullName, cleanEmail);
    }

    if (cleanEmail === OWNER_ADMIN_EMAIL) {
      res.status(403).json({ error: 'This email address is reserved for the website owner administrator.' });
      return;
    }

    const existing = db
      .prepare('SELECT id, email, username FROM users WHERE lower(email) = ? OR lower(username) = ?')
      .get(cleanEmail, cleanUsername) as { id: number; email: string; username: string | null } | undefined;

    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
      res.status(409).json({ error: 'This username is already taken.' });
      return;
    }

    const existingPhone = findAccountByEmailOrPhone('member', '', phoneDigits);
    if (existingPhone) {
      res.status(409).json({ error: 'A Member account with this phone number already exists.' });
      return;
    }

    const verifyRawToken = generateRandomToken(24);
    const verifyHash = hashToken(verifyRawToken);

    const insertRes = db
      .prepare(
        `INSERT INTO users (
          role, full_name, username, email, phone, phone_normalized, password_hash, status, email_verified, email_verify_token_hash,
          consent_privacy, consent_genomic, consent_marketing, consent_updated_at
        ) VALUES ('member', ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        fullName.trim(),
        cleanUsername,
        cleanEmail,
        cleanPhone,
        phoneDigits,
        hashPassword(password),
        verifyHash,
        consentPrivacy === false ? 0 : 1,
        consentGenomic === false ? 0 : 1,
        consentMarketing ? 1 : 0
      );

    const newUserId = Number(insertRes.lastInsertRowid);
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
    const user = safeUserProjection(userRow);

    logActivity({
      userId: user.id,
      email: user.email,
      accountType: 'Member',
      eventType: 'register_member',
      success: true,
      details: `Member registered (${user.email})`,
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'register_member',
      accountType: 'Member',
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: `New Member account created`,
    });

    const verifyUrl = `${getAppBaseUrl(req)}/#verify-email?token=${verifyRawToken}`;
    const emailRes = await sendUserTransactionalEmail(
      user.email,
      'Verify your DNA GENEIE Member Email',
      `Welcome to DNA GENEIE, ${user.full_name}`,
      [
        'Thank you for creating your DNA GENEIE Member account.',
        'Please verify your email address using the button below to confirm your contact information.',
      ],
      'Verify Email Address',
      verifyUrl
    );

    const sessionToken = createSessionForUser(req, res, user);

    res.status(201).json({
      user,
      sessionToken,
      emailVerificationStatus: emailRes.status,
      message:
        emailRes.status === 'sent'
          ? 'Member account created. A verification link has been sent to your email.'
          : 'Member account created. Email verification dispatch awaits RESEND_API_KEY or SMTP credentials on the server.',
    });
  });

  app.post('/api/auth/member/login', authLoginLimiter, async (req, res) => {
    const { email, phone, identifier, password } = req.body || {};
    const rawEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPhone = typeof phone === 'string' ? phone.trim() : '';
    const rawIdent = typeof identifier === 'string' ? identifier.trim() : '';

    const cleanEmail = rawEmail || (rawIdent.includes('@') ? rawIdent.toLowerCase() : '');
    const cleanPhoneDigits = rawPhone ? normalizePhone(rawPhone) : (!rawIdent.includes('@') && rawIdent ? normalizePhone(rawIdent) : '');

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
    if (!cleanEmail && !cleanPhoneDigits && !rawIdent) {
      res.status(400).json({ error: 'Please enter either your registered Email Address or Phone Number.' });
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (rawPhone && !isValidPhone(rawPhone)) {
      res.status(400).json({ error: 'Please enter a valid phone number (10 to 15 digits).' });
      return;
    }

    let userRow = findAccountByEmailOrPhone('member', cleanEmail, cleanPhoneDigits);
    if (!userRow && rawIdent && !rawIdent.includes('@')) {
      userRow = db
        .prepare("SELECT * FROM users WHERE role = 'member' AND lower(username) = ?")
        .get(rawIdent.toLowerCase()) as any;
    }

    const logIdent = cleanEmail || rawPhone || rawIdent;

    if (!userRow) {
      await handleFailedLogin(req, logIdent, 'Member', 'Member account not found');
      res.status(401).json({ error: 'Invalid Member email/phone or password.' });
      return;
    }

    if (!verifyPassword(password, userRow.password_hash)) {
      await handleFailedLogin(req, userRow.email, 'Member', 'Incorrect password', userRow);
      res.status(401).json({ error: 'Invalid Member email/phone or password.' });
      return;
    }

    if (userRow.status !== 'active') {
      await handleFailedLogin(req, userRow.email, 'Member', `Account status: ${userRow.status}`, userRow);
      res.status(403).json({ error: 'Your member account is currently suspended. Contact support.' });
      return;
    }

    const user = safeUserProjection(userRow);

    logActivity({
      userId: user.id,
      email: user.email,
      accountType: 'Member',
      eventType: 'login_success',
      success: true,
      details: cleanEmail ? 'Member sign-in via email' : 'Member sign-in via phone number',
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'login_success',
      accountType: 'Member',
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
    });

    const sessionToken = createSessionForUser(req, res, user);
    res.json({ user, sessionToken });
  });

  // ---------- AUTHENTICATION: ADVISOR ----------
  app.post('/api/auth/advisor/register', authRegisterLimiter, async (req, res) => {
    const { fullName, email, phone, specialization, password, confirmPassword } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
      return;
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!phone || typeof phone !== 'string' || !isValidPhone(phone.trim())) {
      res.status(400).json({ error: 'Please enter a valid phone number (10 to 15 digits).' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const phoneDigits = normalizePhone(cleanPhone);

    if (cleanEmail === OWNER_ADMIN_EMAIL) {
      res.status(403).json({ error: 'This email address is reserved for the website owner administrator.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const existingPhone = findAccountByEmailOrPhone('advisor', '', phoneDigits);
    if (existingPhone) {
      res.status(409).json({ error: 'An Advisor account with this phone number already exists.' });
      return;
    }

    const verifyRawToken = generateRandomToken(24);
    const verifyHash = hashToken(verifyRawToken);

    const insertRes = db
      .prepare(
        `INSERT INTO users (role, full_name, email, phone, phone_normalized, specialization, password_hash, status, email_verified, email_verify_token_hash)
         VALUES ('advisor', ?, ?, ?, ?, ?, ?, 'pending_approval', 0, ?)`
      )
      .run(
        fullName.trim(),
        cleanEmail,
        cleanPhone,
        phoneDigits,
        typeof specialization === 'string' && specialization.trim() ? specialization.trim() : 'Clinical Wellness & Genomics',
        hashPassword(password),
        verifyHash
      );

    const advisorId = Number(insertRes.lastInsertRowid);

    logActivity({
      userId: advisorId,
      email: cleanEmail,
      accountType: 'Advisor',
      eventType: 'register_advisor',
      success: true,
      details: 'Advisor registration submitted for owner approval',
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'register_advisor',
      accountType: 'Advisor',
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: 'Advisor status is PENDING OWNER APPROVAL.',
    });

    const verifyUrl = `${getAppBaseUrl(req)}/#verify-email?token=${verifyRawToken}`;
    const emailRes = await sendUserTransactionalEmail(
      cleanEmail,
      'DNA GENEIE Advisor Registration Received',
      `Thank you for applying as a DNA GENEIE Advisor, ${fullName.trim()}`,
      [
        'Your Advisor Portal registration has been received and is pending owner approval.',
        'Please verify your email address now so your account is ready once approved.',
      ],
      'Verify Email Address',
      verifyUrl
    );

    res.status(201).json({
      pendingApproval: true,
      emailVerificationStatus: emailRes.status,
      message: 'Advisor registration submitted. Your account requires owner approval before you can sign in.',
    });
  });

  app.post('/api/auth/advisor/login', authLoginLimiter, async (req, res) => {
    const { email, phone, password } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanPhoneDigits = rawPhone ? normalizePhone(rawPhone) : '';

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
    if (!cleanEmail && !cleanPhoneDigits) {
      res.status(400).json({ error: 'Please enter either your registered Email Address or Phone Number.' });
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (rawPhone && !isValidPhone(rawPhone)) {
      res.status(400).json({ error: 'Please enter a valid phone number (10 to 15 digits).' });
      return;
    }

    const userRow = findAccountByEmailOrPhone('advisor', cleanEmail, cleanPhoneDigits);
    const logIdent = cleanEmail || rawPhone;

    if (!userRow) {
      await handleFailedLogin(req, logIdent, 'Advisor', 'Advisor account not found');
      res.status(401).json({ error: 'Invalid Advisor email/phone or password.' });
      return;
    }

    if (!verifyPassword(password, userRow.password_hash)) {
      await handleFailedLogin(req, userRow.email, 'Advisor', 'Incorrect password', userRow);
      res.status(401).json({ error: 'Invalid Advisor email/phone or password.' });
      return;
    }

    if (userRow.status === 'pending_approval') {
      logActivity({
        userId: userRow.id,
        email: userRow.email,
        accountType: 'Advisor',
        eventType: 'login_failed',
        success: false,
        details: 'Login blocked: advisor pending owner approval',
        req,
      });
      res.status(403).json({ error: 'Your advisor account is pending owner approval.' });
      return;
    }

    if (userRow.status !== 'active') {
      await handleFailedLogin(req, userRow.email, 'Advisor', `Advisor account status: ${userRow.status}`, userRow);
      res.status(403).json({ error: `Your advisor account is ${userRow.status}.` });
      return;
    }

    const user = safeUserProjection(userRow);

    logActivity({
      userId: user.id,
      email: user.email,
      accountType: 'Advisor',
      eventType: 'login_success',
      success: true,
      details: cleanEmail ? 'Advisor sign-in via email' : 'Advisor sign-in via phone number',
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'login_success',
      accountType: 'Advisor',
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
    });

    const sessionToken = createSessionForUser(req, res, user);
    res.json({ user, sessionToken });
  });

  // ---------- AUTHENTICATION: OWNER ADMIN (STRICTLY support@dnageneie.com + 2FA) ----------
  app.post('/api/auth/admin/login', authLoginLimiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Owner administrator email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== OWNER_ADMIN_EMAIL) {
      await handleFailedLogin(req, cleanEmail, 'Admin', 'Unauthorized email attempted Owner Admin login');
      res.status(403).json({ error: 'Access restricted strictly to the authorized administrator account (support@dnageneie.com).' });
      return;
    }

    const userRow = db
      .prepare("SELECT * FROM users WHERE role = 'admin' AND lower(email) = ?")
      .get(cleanEmail) as any;

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      await handleFailedLogin(req, cleanEmail, 'Admin', 'Invalid owner credentials', userRow);
      res.status(401).json({ error: 'Invalid owner administrator credentials.' });
      return;
    }

    if (userRow.email_verified !== 1) {
      const verifyRawToken = generateRandomToken(24);
      const verifyHash = hashToken(verifyRawToken);
      db.prepare('UPDATE users SET email_verify_token_hash = ? WHERE id = ?').run(verifyHash, userRow.id);
      const verifyUrl = `${getAppBaseUrl(req)}/#verify-email?token=${verifyRawToken}`;
      await sendUserTransactionalEmail(
        userRow.email,
        'Verify Official DNA GENEIE Administrator Email Ownership',
        'Verify Official Administrator Email',
        [
          'Administrator email ownership must be verified before dashboard sign-in or notifications are enabled.',
          'Please verify ownership of support@dnageneie.com using the button below.',
        ],
        'Verify Ownership',
        verifyUrl
      );
      res.status(403).json({
        error: 'Ownership of support@dnageneie.com must be verified before enabling administrator authentication.',
      });
      return;
    }

    // If 2FA is enabled on owner account, issue a short-lived challenge instead of full session
    if (userRow.totp_enabled === 1 && userRow.totp_secret) {
      const challengeRaw = generateRandomToken(24);
      const challengeHash = hashToken(challengeRaw);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      db.prepare('INSERT INTO auth_challenges (user_id, challenge_hash, expires_at) VALUES (?, ?, ?)').run(
        userRow.id,
        challengeHash,
        expiresAt
      );
      res.json({ requires2FA: true, challengeToken: challengeRaw });
      return;
    }

    const user = safeUserProjection(userRow);

    logActivity({
      userId: user.id,
      email: user.email,
      accountType: 'Admin',
      eventType: 'login_success',
      success: true,
      details: 'Owner admin console sign-in',
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'login_success',
      accountType: 'Admin',
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
    });

    const sessionToken = createSessionForUser(req, res, user);
    res.json({ user, sessionToken });
  });

  app.post('/api/auth/admin/verify-2fa', authLoginLimiter, async (req, res) => {
    const { challengeToken, code } = req.body || {};
    if (!challengeToken || !code) {
      res.status(400).json({ error: 'Challenge token and 6-digit authenticator code are required.' });
      return;
    }

    const challengeHash = hashToken(String(challengeToken));
    const row = db
      .prepare(
        `SELECT c.id as challenge_id, c.expires_at, u.*
         FROM auth_challenges c
         JOIN users u ON u.id = c.user_id
         WHERE c.challenge_hash = ?`
      )
      .get(challengeHash) as any;

    if (!row || new Date(row.expires_at).getTime() < Date.now() || row.role !== 'admin' || row.email.toLowerCase() !== OWNER_ADMIN_EMAIL) {
      res.status(401).json({ error: '2FA challenge is invalid or expired.' });
      return;
    }

    const secret = decryptSensitive(row.totp_secret);
    if (!verifyTotpCode(secret, String(code))) {
      await handleFailedLogin(req, row.email, 'Admin', 'Invalid 2FA TOTP code', row);
      res.status(401).json({ error: 'Invalid 6-digit authenticator code.' });
      return;
    }

    db.prepare('DELETE FROM auth_challenges WHERE id = ?').run(row.challenge_id);
    const user = safeUserProjection(row);

    logActivity({
      userId: user.id,
      email: user.email,
      accountType: 'Admin',
      eventType: 'login_success',
      success: true,
      details: 'Owner admin 2FA verified sign-in',
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'login_success',
      accountType: 'Admin',
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: 'Two-factor authentication verified.',
    });

    const sessionToken = createSessionForUser(req, res, user);
    res.json({ user, sessionToken });
  });

  // ---------- COMMON AUTH ROUTES ----------
  app.get('/api/auth/me', (req: AuthedRequest, res) => {
    if (!req.authUser) {
      res.json({ user: null });
      return;
    }
    res.json({ user: req.authUser });
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res) => {
    if (req.sessionTokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post('/api/auth/verify-email', (req, res) => {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }
    const tokenHash = hashToken(token.trim());
    const user = db
      .prepare('SELECT id, email, role, full_name FROM users WHERE email_verify_token_hash = ?')
      .get(tokenHash) as { id: number; email: string; role: string; full_name: string } | undefined;

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired email verification link.' });
      return;
    }

    db.prepare("UPDATE users SET email_verified = 1, email_verify_token_hash = NULL, updated_at = datetime('now') WHERE id = ?").run(user.id);

    logActivity({
      userId: user.id,
      email: user.email,
      accountType: user.role === 'advisor' ? 'Advisor' : user.role === 'admin' ? 'Admin' : 'Member',
      eventType: 'email_verified',
      success: true,
      details: 'Email address verified',
      req,
    });

    res.json({ ok: true, message: 'Your email address has been verified.' });
  });

  app.post('/api/auth/resend-verification', authResetLimiter, async (req: AuthedRequest, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Sign in required.' });
      return;
    }
    const verifyRawToken = generateRandomToken(24);
    const verifyHash = hashToken(verifyRawToken);
    db.prepare('UPDATE users SET email_verify_token_hash = ? WHERE id = ?').run(verifyHash, req.authUser.id);

    const verifyUrl = `${getAppBaseUrl(req)}/#verify-email?token=${verifyRawToken}`;
    const emailRes = await sendUserTransactionalEmail(
      req.authUser.email,
      'Verify your DNA GENEIE Email Address',
      `Email Verification — DNA GENEIE`,
      ['Please click the button below to verify your email address.'],
      'Verify Email Address',
      verifyUrl
    );

    if (emailRes.status !== 'sent') {
      res.status(503).json({
        error: 'Email delivery service is not configured yet. Configure RESEND_API_KEY or SMTP credentials on the server.',
        deliveryStatus: emailRes.status,
      });
      return;
    }

    res.json({ ok: true, message: 'Verification email sent to your registered email address.' });
  });

  app.post('/api/auth/forgot-password', authResetLimiter, async (req, res) => {
    const { email, accountType } = req.body || {};
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const roleFilter = accountType === 'advisor' ? 'advisor' : 'member';
    const user = db
      .prepare('SELECT id, role, full_name, email, phone FROM users WHERE lower(email) = ? AND role = ?')
      .get(cleanEmail, roleFilter) as { id: number; role: string; full_name: string; email: string; phone: string } | undefined;

    const accountTypeLabel: 'Advisor' | 'Member' = roleFilter === 'advisor' ? 'Advisor' : 'Member';

    logActivity({
      userId: user?.id ?? null,
      email: cleanEmail,
      accountType: accountTypeLabel,
      eventType: 'password_reset_requested',
      success: Boolean(user),
      details: user ? 'Password reset email requested' : 'Password reset requested for unregistered email',
      req,
    });

    await notifyOwnerSecurityEvent({
      eventType: 'password_reset_requested',
      accountType: accountTypeLabel,
      fullName: user?.full_name || 'Unknown / Unregistered',
      email: cleanEmail,
      phone: user?.phone || '',
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: user ? 'Password reset requested by registered account.' : 'Reset attempted for non-matching email/role.',
    });

    if (user) {
      const rawToken = generateRandomToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
        user.id,
        tokenHash,
        expiresAt
      );

      const resetUrl = `${getAppBaseUrl(req)}/#reset-password?token=${rawToken}`;
      const mailRes = await sendUserTransactionalEmail(
        user.email,
        'DNA GENEIE Password Reset Instructions',
        'Reset Your Password',
        [
          `We received a password reset request for your DNA GENEIE ${accountTypeLabel} account.`,
          'This link expires in 1 hour. If you did not request this, you can safely ignore this message.',
        ],
        'Reset Password',
        resetUrl
      );

      if (mailRes.status !== 'sent') {
        res.json({
          ok: true,
          emailConfigured: false,
          message:
            'Security notification logged for the owner. User reset email delivery requires RESEND_API_KEY or SMTP credentials on the server.',
        });
        return;
      }
    }

    res.json({
      ok: true,
      emailConfigured: true,
      message: 'If an account matches that email address, password reset instructions have been sent.',
    });
  });

  app.post('/api/auth/reset-password', authResetLimiter, (req, res) => {
    const { token, newPassword, confirmPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Reset token is required.' });
      return;
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const tokenHash = hashToken(token.trim());
    const resetRow = db
      .prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?')
      .get(tokenHash) as { id: number; user_id: number; expires_at: string; used_at: string | null } | undefined;

    if (!resetRow || resetRow.used_at || new Date(resetRow.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
      return;
    }

    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      hashPassword(newPassword),
      resetRow.user_id
    );
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(resetRow.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(resetRow.user_id);

    res.json({ ok: true, message: 'Password updated successfully. Please sign in with your new password.' });
  });

  app.post('/api/auth/change-password', (req: AuthedRequest, res) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Valid current password and matching new password are required.' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.authUser.id) as { password_hash: string };
    if (!verifyPassword(currentPassword, row.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      hashPassword(newPassword),
      req.authUser.id
    );

    res.json({ ok: true, message: 'Password updated securely.' });
  });

  // ---------- AUTHORITATIVE SERVER-SIDE CHECKOUT & PAYMENT ----------
  app.post('/api/orders', async (req: AuthedRequest, res) => {
    const { items, shipping, paymentMethod, paymentReference, promoCode, simulatePaymentFailure } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }
    if (
      !shipping ||
      !shipping.fullName ||
      !shipping.email ||
      !isValidEmail(String(shipping.email)) ||
      !shipping.phone ||
      !shipping.address ||
      !shipping.city ||
      !shipping.state ||
      !shipping.pincode
    ) {
      res.status(400).json({ error: 'Complete shipping name, email, phone, address, city, state, and PIN code are required.' });
      return;
    }

    const verifiedItems: Array<{
      itemType: 'product' | 'bundle';
      slug: string;
      name: string;
      unitPriceInr: number;
      quantity: number;
      lineTotalInr: number;
      includedProducts: string[];
    }> = [];

    let subtotalInr = 0;

    for (const rawItem of items) {
      const qty = Math.max(1, Math.min(10, Math.floor(Number(rawItem.quantity) || 1)));
      if (rawItem.itemType === 'product') {
        const product = db
          .prepare('SELECT slug, name, price_inr, status, is_active, stock_count FROM products WHERE slug = ?')
          .get(String(rawItem.slug)) as any;

        if (!product) {
          res.status(400).json({ error: `Unknown product: ${rawItem.slug}` });
          return;
        }
        if (product.status !== 'available' || !product.is_active || !product.price_inr) {
          res.status(400).json({ error: `${product.name} is currently Coming Soon and cannot be purchased.` });
          return;
        }
        if (product.stock_count < qty) {
          res.status(400).json({ error: `Insufficient inventory for ${product.name}.` });
          return;
        }
        const lineTotal = product.price_inr * qty;
        subtotalInr += lineTotal;
        verifiedItems.push({
          itemType: 'product',
          slug: product.slug,
          name: product.name,
          unitPriceInr: product.price_inr,
          quantity: qty,
          lineTotalInr: lineTotal,
          includedProducts: [product.slug],
        });
      } else if (rawItem.itemType === 'bundle') {
        const bundle = db
          .prepare('SELECT slug, name, price_inr, status, is_active, included_product_slugs_json FROM bundles WHERE slug = ?')
          .get(String(rawItem.slug)) as any;

        if (!bundle) {
          res.status(400).json({ error: `Unknown bundle: ${rawItem.slug}` });
          return;
        }
        if (bundle.status !== 'available' || !bundle.is_active) {
          res.status(400).json({ error: `${bundle.name} is Coming Soon and cannot be purchased yet.` });
          return;
        }
        const includedSlugs: string[] = JSON.parse(bundle.included_product_slugs_json);
        for (const pSlug of includedSlugs) {
          const prod = db.prepare('SELECT name, status, is_active, stock_count FROM products WHERE slug = ?').get(pSlug) as any;
          if (!prod || prod.status !== 'available' || !prod.is_active || prod.stock_count < qty) {
            res.status(400).json({ error: `Bundle contains ${prod?.name || pSlug}, which is currently unavailable.` });
            return;
          }
        }
        const lineTotal = bundle.price_inr * qty;
        subtotalInr += lineTotal;
        verifiedItems.push({
          itemType: 'bundle',
          slug: bundle.slug,
          name: bundle.name,
          unitPriceInr: bundle.price_inr,
          quantity: qty,
          lineTotalInr: lineTotal,
          includedProducts: includedSlugs,
        });
      } else {
        res.status(400).json({ error: 'Invalid cart item type.' });
        return;
      }
    }

    // Automatic Bundle of 2 savings when both NutriG & FitG are purchased
    let discountInr = 0;
    const hasSingleNutrig = verifiedItems.find((i) => i.itemType === 'product' && i.slug === 'nutrig');
    const hasSingleFitg = verifiedItems.find((i) => i.itemType === 'product' && i.slug === 'fitg');
    if (hasSingleNutrig && hasSingleFitg) {
      const pairCount = Math.min(hasSingleNutrig.quantity, hasSingleFitg.quantity);
      const bundle2 = db.prepare("SELECT savings_inr FROM bundles WHERE slug = 'bundle-2' AND status = 'available'").get() as
        | { savings_inr: number }
        | undefined;
      if (bundle2) {
        discountInr += bundle2.savings_inr * pairCount;
      }
    }

    // Server-validated Promo Code
    let appliedPromo = '';
    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      const cleanPromo = promoCode.trim().toUpperCase();
      const promo = db.prepare('SELECT * FROM promos WHERE upper(code) = ? AND is_active = 1').get(cleanPromo) as any;
      if (promo && subtotalInr >= promo.min_order_inr) {
        const promoDiscount =
          promo.discount_type === 'percent'
            ? Math.round((subtotalInr * promo.discount_value) / 100)
            : promo.discount_value;
        discountInr += promoDiscount;
        appliedPromo = promo.code;
      }
    }

    const totalInr = Math.max(0, subtotalInr - discountInr);
    const orderNumber = `DG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const trackingCode = `TRK-${generateRandomToken(4).toUpperCase()}`;
    const cleanMethod = typeof paymentMethod === 'string' && paymentMethod.trim() ? paymentMethod.trim() : 'UPI Instant Payment';
    const cleanRef =
      typeof paymentReference === 'string' && paymentReference.trim()
        ? paymentReference.trim()
        : `PAY-${generateRandomToken(5).toUpperCase()}`;

    const paymentFailed = Boolean(simulatePaymentFailure);
    const paymentStatus = paymentFailed
      ? 'failed'
      : cleanMethod === 'Bank Transfer (Pending Verification)'
        ? 'pending'
        : 'verified';

    const custName = String(shipping.fullName).trim();
    const custEmail = String(shipping.email).trim().toLowerCase();
    const custPhone = String(shipping.phone).trim();

    const orderInsert = db
      .prepare(
        `INSERT INTO orders (
          order_number, invoice_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address, city, state, pincode,
          items_json, subtotal_inr, discount_inr, promo_code, total_inr,
          payment_method, payment_status, payment_reference, order_status, tracking_code, advisor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?)`
      )
      .run(
        orderNumber,
        invoiceNumber,
        req.authUser?.id ?? null,
        custName,
        custEmail,
        custPhone,
        String(shipping.address).trim(),
        String(shipping.city).trim(),
        String(shipping.state).trim(),
        String(shipping.pincode).trim(),
        JSON.stringify(verifiedItems),
        subtotalInr,
        discountInr,
        appliedPromo,
        totalInr,
        cleanMethod,
        paymentStatus,
        cleanRef,
        trackingCode,
        req.authUser?.assigned_advisor_id ?? null
      );

    const orderId = Number(orderInsert.lastInsertRowid);

    db.prepare(
      `INSERT INTO payments (order_id, user_id, amount_inr, currency, gateway, transaction_ref, status)
       VALUES (?, ?, ?, 'INR', ?, ?, ?)`
    ).run(orderId, req.authUser?.id ?? null, totalInr, cleanMethod, cleanRef, paymentStatus);

    if (paymentStatus === 'verified') {
      // Decrement inventory safely
      for (const item of verifiedItems) {
        for (const pSlug of item.includedProducts) {
          db.prepare('UPDATE products SET stock_count = MAX(0, stock_count - ?) WHERE slug = ?').run(item.quantity, pSlug);
        }
      }
    }

    // Owner Email Notifications
    await notifyOwnerSecurityEvent({
      eventType: 'new_order',
      accountType: req.authUser ? 'Member' : 'Customer',
      fullName: custName,
      email: custEmail,
      phone: custPhone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: `Order ${orderNumber} | Total: ₹${totalInr.toLocaleString('en-IN')} | Items: ${verifiedItems.map((i) => `${i.name}×${i.quantity}`).join(', ')}`,
    });

    if (paymentStatus === 'verified') {
      await notifyOwnerSecurityEvent({
        eventType: 'payment_success',
        accountType: req.authUser ? 'Member' : 'Customer',
        fullName: custName,
        email: custEmail,
        phone: custPhone,
        ipAddress: extractClientIp(req),
        deviceInfo: extractDeviceInfo(req),
        extraNote: `Payment verified for ${orderNumber} | ₹${totalInr.toLocaleString('en-IN')} | Ref: ${cleanRef}`,
      });
    } else if (paymentStatus === 'failed') {
      await notifyOwnerSecurityEvent({
        eventType: 'payment_failed',
        accountType: req.authUser ? 'Member' : 'Customer',
        fullName: custName,
        email: custEmail,
        phone: custPhone,
        ipAddress: extractClientIp(req),
        deviceInfo: extractDeviceInfo(req),
        extraNote: `Payment FAILED for ${orderNumber} | ₹${totalInr.toLocaleString('en-IN')} | Method: ${cleanMethod}`,
      });
      res.status(402).json({
        error: 'Payment authorization failed. Order saved as payment failed so you can retry.',
        orderNumber,
      });
      return;
    }

    // Save address if requested by authenticated member
    if (req.authUser?.role === 'member' && shipping.saveAddress) {
      db.prepare(
        `INSERT INTO addresses (user_id, label, full_name, phone, address_line, city, state, pincode, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
      ).run(
        req.authUser.id,
        String(shipping.addressLabel || 'Home').trim(),
        custName,
        custPhone,
        String(shipping.address).trim(),
        String(shipping.city).trim(),
        String(shipping.state).trim(),
        String(shipping.pincode).trim()
      );
    }

    res.status(201).json({
      order: {
        id: orderId,
        orderNumber,
        invoiceNumber,
        trackingCode,
        items: verifiedItems,
        subtotalInr,
        discountInr,
        promoCode: appliedPromo,
        totalInr,
        paymentMethod: cleanMethod,
        paymentStatus,
        paymentReference: cleanRef,
        orderStatus: 'placed',
        customerName: custName,
        customerEmail: custEmail,
        customerPhone: custPhone,
        shippingAddress: `${shipping.address}, ${shipping.city}, ${shipping.state} - ${shipping.pincode}`,
        createdAt: new Date().toISOString(),
      },
      message: 'Order placed securely with server-verified INR pricing.',
    });
  });

  // ---------- MEMBER PORTAL: DASHBOARD, ADDRESSES, WISHLIST, ORDERS, KITS, REPORTS, DPDP ----------
  app.get('/api/member/dashboard', requireRole('member'), (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    const orders = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
      .all(userId)
      .map((o: any) => ({ ...o, items: JSON.parse(o.items_json || '[]') }));

    const payments = db
      .prepare(
        `SELECT p.*, o.order_number
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE p.user_id = ?
         ORDER BY p.id DESC`
      )
      .all(userId);

    const kits = db.prepare('SELECT * FROM dna_kits WHERE user_id = ? ORDER BY id DESC').all(userId);

    const reports = db
      .prepare("SELECT * FROM reports WHERE user_id = ? AND status = 'available' ORDER BY id DESC")
      .all(userId)
      .map(hydrateReportRow);

    const addresses = db
      .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
      .all(userId);

    const wishlist = db
      .prepare('SELECT product_slug FROM wishlist_items WHERE user_id = ? ORDER BY id DESC')
      .all(userId)
      .map((w: any) => w.product_slug);

    const refunds = db
      .prepare(
        `SELECT r.*, o.order_number
         FROM refund_requests r
         JOIN orders o ON o.id = r.order_id
         WHERE r.user_id = ?
         ORDER BY r.id DESC`
      )
      .all(userId);

    const advisor = req.authUser!.assigned_advisor_id
      ? db
          .prepare('SELECT id, full_name, email, phone, specialization FROM users WHERE id = ?')
          .get(req.authUser!.assigned_advisor_id)
      : null;

    res.json({
      profile: req.authUser,
      advisor,
      orders,
      payments,
      kits,
      reports,
      addresses,
      wishlist,
      refunds,
    });
  });

  app.put('/api/member/profile', requireRole('member'), (req: AuthedRequest, res) => {
    const { fullName, phone } = req.body || {};
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Valid full name is required.' });
      return;
    }
    db.prepare("UPDATE users SET full_name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?").run(
      fullName.trim(),
      typeof phone === 'string' ? phone.trim() : req.authUser!.phone,
      req.authUser!.id
    );
    const updated = safeUserProjection(db.prepare('SELECT * FROM users WHERE id = ?').get(req.authUser!.id));
    res.json({ user: updated });
  });

  // Delivery Addresses CRUD
  app.post('/api/member/addresses', requireRole('member'), (req: AuthedRequest, res) => {
    const { label, fullName, phone, addressLine, city, state, pincode, isDefault } = req.body || {};
    if (!fullName || !phone || !addressLine || !city || !state || !pincode) {
      res.status(400).json({ error: 'All address fields are required.' });
      return;
    }
    if (isDefault) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.authUser!.id);
    }
    const ins = db
      .prepare(
        `INSERT INTO addresses (user_id, label, full_name, phone, address_line, city, state, pincode, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.authUser!.id,
        String(label || 'Home').trim(),
        String(fullName).trim(),
        String(phone).trim(),
        String(addressLine).trim(),
        String(city).trim(),
        String(state).trim(),
        String(pincode).trim(),
        isDefault ? 1 : 0
      );
    res.status(201).json({ address: db.prepare('SELECT * FROM addresses WHERE id = ?').get(ins.lastInsertRowid) });
  });

  app.delete('/api/member/addresses/:id', requireRole('member'), (req: AuthedRequest, res) => {
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.authUser!.id);
    res.json({ ok: true });
  });

  // Wishlist Sync
  app.post('/api/member/wishlist/toggle', requireRole('member'), (req: AuthedRequest, res) => {
    const { productSlug } = req.body || {};
    if (!productSlug) {
      res.status(400).json({ error: 'Product slug is required.' });
      return;
    }
    const existing = db
      .prepare('SELECT id FROM wishlist_items WHERE user_id = ? AND product_slug = ?')
      .get(req.authUser!.id, String(productSlug)) as { id: number } | undefined;

    if (existing) {
      db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO wishlist_items (user_id, product_slug) VALUES (?, ?)').run(
        req.authUser!.id,
        String(productSlug)
      );
    }
    const items = db
      .prepare('SELECT product_slug FROM wishlist_items WHERE user_id = ?')
      .all(req.authUser!.id)
      .map((w: any) => w.product_slug);
    res.json({ wishlist: items });
  });

  // Order Cancellation & Refund Request (Member)
  app.post('/api/member/orders/:id/cancel', requireRole('member'), async (req: AuthedRequest, res) => {
    const orderId = Number(req.params.id);
    const { reason } = req.body || {};
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.authUser!.id) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.order_status === 'cancelled') {
      res.status(400).json({ error: 'Order is already cancelled.' });
      return;
    }
    if (['lab_processing', 'report_ready'].includes(order.order_status)) {
      res.status(400).json({ error: 'Orders already in laboratory sequencing or completed cannot be cancelled directly.' });
      return;
    }

    const cleanReason = String(reason || 'Cancelled by customer').trim();
    db.prepare("UPDATE orders SET order_status = 'cancelled', cancellation_reason = ?, updated_at = datetime('now') WHERE id = ?").run(
      cleanReason,
      orderId
    );

    if (order.payment_status === 'verified') {
      db.prepare("INSERT INTO refund_requests (order_id, user_id, amount_inr, reason, status) VALUES (?, ?, ?, ?, 'requested')").run(
        orderId,
        req.authUser!.id,
        order.total_inr,
        cleanReason
      );
      await notifyOwnerSecurityEvent({
        eventType: 'refund_requested',
        accountType: 'Member',
        fullName: req.authUser!.full_name,
        email: req.authUser!.email,
        phone: req.authUser!.phone,
        ipAddress: extractClientIp(req),
        deviceInfo: extractDeviceInfo(req),
        extraNote: `Refund requested for cancelled Order ${order.order_number} (₹${order.total_inr.toLocaleString('en-IN')})`,
      });
    }

    await notifyOwnerSecurityEvent({
      eventType: 'order_cancelled',
      accountType: 'Member',
      fullName: req.authUser!.full_name,
      email: req.authUser!.email,
      phone: req.authUser!.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: `Order ${order.order_number} cancelled. Reason: ${cleanReason}`,
    });

    res.json({ ok: true, message: 'Order cancelled successfully.' });
  });

  app.post('/api/member/orders/:id/refund', requireRole('member'), async (req: AuthedRequest, res) => {
    const orderId = Number(req.params.id);
    const { reason } = req.body || {};
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.authUser!.id) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.payment_status !== 'verified') {
      res.status(400).json({ error: 'Refunds can only be requested for verified payments.' });
      return;
    }
    const existing = db.prepare("SELECT id FROM refund_requests WHERE order_id = ? AND status IN ('requested', 'approved')").get(orderId);
    if (existing) {
      res.status(400).json({ error: 'A refund request is already open for this order.' });
      return;
    }
    const cleanReason = String(reason || 'Customer refund request').trim();
    db.prepare("INSERT INTO refund_requests (order_id, user_id, amount_inr, reason, status) VALUES (?, ?, ?, ?, 'requested')").run(
      orderId,
      req.authUser!.id,
      order.total_inr,
      cleanReason
    );

    await notifyOwnerSecurityEvent({
      eventType: 'refund_requested',
      accountType: 'Member',
      fullName: req.authUser!.full_name,
      email: req.authUser!.email,
      phone: req.authUser!.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: `Refund requested for Order ${order.order_number} (₹${order.total_inr.toLocaleString('en-IN')}): ${cleanReason}`,
    });

    res.status(201).json({ ok: true, message: 'Refund request submitted for owner review.' });
  });

  // DNA Kit Registration
  app.post('/api/member/kits/register', requireRole('member'), (req: AuthedRequest, res) => {
    const { kitBarcode, productSlug, recipientName, orderId } = req.body || {};
    if (!kitBarcode || typeof kitBarcode !== 'string' || kitBarcode.trim().length < 5) {
      res.status(400).json({ error: 'Enter a valid DNA kit barcode (minimum 5 characters).' });
      return;
    }
    const cleanBarcode = kitBarcode.trim().toUpperCase();
    const existingKit = db.prepare('SELECT id FROM dna_kits WHERE kit_barcode = ?').get(cleanBarcode);
    if (existingKit) {
      res.status(409).json({ error: 'This kit barcode has already been registered.' });
      return;
    }

    const prod = db.prepare('SELECT slug, name, status FROM products WHERE slug = ?').get(String(productSlug)) as
      | { slug: string; name: string; status: string }
      | undefined;
    if (!prod || prod.status !== 'available') {
      res.status(400).json({ error: 'Please select an active DNA test panel (NutriG or FitG).' });
      return;
    }

    let verifiedOrderId: number | null = null;
    if (orderId) {
      const orderRow = db
        .prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
        .get(Number(orderId), req.authUser!.id) as { id: number } | undefined;
      if (!orderRow) {
        res.status(403).json({ error: 'Selected order does not belong to your account.' });
        return;
      }
      verifiedOrderId = orderRow.id;
    }

    const result = db
      .prepare(
        `INSERT INTO dna_kits (kit_barcode, user_id, order_id, product_slug, product_name, recipient_name, status)
         VALUES (?, ?, ?, ?, ?, ?, 'registered')`
      )
      .run(
        cleanBarcode,
        req.authUser!.id,
        verifiedOrderId,
        prod.slug,
        prod.name,
        typeof recipientName === 'string' && recipientName.trim() ? recipientName.trim() : req.authUser!.full_name
      );

    res.status(201).json({
      kit: db.prepare('SELECT * FROM dna_kits WHERE id = ?').get(result.lastInsertRowid),
      message: 'DNA kit barcode registered to your account.',
    });
  });

  app.get('/api/member/reports/:id', requireRole('member'), (req: AuthedRequest, res) => {
    const report = db
      .prepare("SELECT * FROM reports WHERE id = ? AND user_id = ? AND status = 'available'")
      .get(Number(req.params.id), req.authUser!.id) as any;
    if (!report) {
      res.status(404).json({ error: 'Report not found or unauthorized.' });
      return;
    }
    res.json(hydrateReportRow(report));
  });

  // DPDP Act Consent, Data Export, and Account Deletion Request
  app.put('/api/member/privacy/consent', requireRole('member'), (req: AuthedRequest, res) => {
    const { consentGenomic, consentMarketing } = req.body || {};
    db.prepare(
      "UPDATE users SET consent_genomic = ?, consent_marketing = ?, consent_updated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(consentGenomic ? 1 : 0, consentMarketing ? 1 : 0, req.authUser!.id);

    db.prepare("INSERT INTO dpdp_requests (user_id, request_type, details, status, completed_at) VALUES (?, 'consent_update', ?, 'completed', datetime('now'))").run(
      req.authUser!.id,
      `genomic=${Boolean(consentGenomic)}, marketing=${Boolean(consentMarketing)}`
    );

    const updated = safeUserProjection(db.prepare('SELECT * FROM users WHERE id = ?').get(req.authUser!.id));
    res.json({ user: updated, message: 'DPDP privacy consent preferences updated.' });
  });

  app.get('/api/member/privacy/export', requireRole('member'), (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    const profile = safeUserProjection(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(userId);
    const orders = db
      .prepare('SELECT * FROM orders WHERE user_id = ?')
      .all(userId)
      .map((o: any) => ({ ...o, items: JSON.parse(o.items_json || '[]') }));
    const kits = db.prepare('SELECT * FROM dna_kits WHERE user_id = ?').all(userId);
    const reports = db.prepare('SELECT * FROM reports WHERE user_id = ?').all(userId).map(hydrateReportRow);

    db.prepare("INSERT INTO dpdp_requests (user_id, request_type, details, status, completed_at) VALUES (?, 'export', 'Customer exported personal data under DPDP Act', 'completed', datetime('now'))").run(
      userId
    );

    res.json({
      exportedAt: new Date().toISOString(),
      notice: 'Personal data export provided under India Digital Personal Data Protection (DPDP) Act.',
      profile,
      addresses,
      orders,
      kits,
      reports,
    });
  });

  app.post('/api/member/privacy/delete-request', requireRole('member'), async (req: AuthedRequest, res) => {
    const { reason } = req.body || {};
    db.prepare("UPDATE users SET deletion_requested_at = datetime('now') WHERE id = ?").run(req.authUser!.id);
    db.prepare("INSERT INTO dpdp_requests (user_id, request_type, details, status) VALUES (?, 'deletion', ?, 'pending')").run(
      req.authUser!.id,
      String(reason || 'Customer requested personal data erasure under DPDP Act').trim()
    );

    await notifyOwnerSecurityEvent({
      eventType: 'security_alert',
      accountType: 'Member',
      fullName: req.authUser!.full_name,
      email: req.authUser!.email,
      phone: req.authUser!.phone,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: 'DPDP Act Right to Erasure / Data Deletion Request submitted by customer.',
    });

    res.json({ ok: true, message: 'Your data deletion request has been logged for compliance processing.' });
  });

  // ---------- ADVISOR PORTAL ----------
  app.get('/api/advisor/dashboard', requireRole('advisor'), (req: AuthedRequest, res) => {
    const advisorId = req.authUser!.id;

    const assignedClients = db
      .prepare(
        `SELECT id, full_name, username, email, phone, email_verified, created_at
         FROM users
         WHERE role = 'member' AND assigned_advisor_id = ?
         ORDER BY id DESC`
      )
      .all(advisorId);

    const assignedEnquiries = db
      .prepare('SELECT * FROM enquiries WHERE assigned_advisor_id = ? ORDER BY id DESC')
      .all(advisorId);

    const assignedOrders = db
      .prepare(
        `SELECT o.*
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         WHERE o.advisor_id = ? OR u.assigned_advisor_id = ?
         ORDER BY o.id DESC`
      )
      .all(advisorId, advisorId)
      .map((o: any) => ({ ...o, items: JSON.parse(o.items_json || '[]') }));

    res.json({
      profile: req.authUser,
      assignedClients,
      assignedEnquiries,
      assignedOrders,
    });
  });

  app.put('/api/advisor/profile', requireRole('advisor'), (req: AuthedRequest, res) => {
    const { fullName, phone, specialization } = req.body || {};
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Valid full name is required.' });
      return;
    }
    db.prepare(
      "UPDATE users SET full_name = ?, phone = ?, specialization = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(
      fullName.trim(),
      typeof phone === 'string' ? phone.trim() : req.authUser!.phone,
      typeof specialization === 'string' ? specialization.trim() : req.authUser!.specialization,
      req.authUser!.id
    );
    const updated = safeUserProjection(db.prepare('SELECT * FROM users WHERE id = ?').get(req.authUser!.id));
    res.json({ user: updated });
  });

  app.patch('/api/advisor/enquiries/:id', requireRole('advisor'), (req: AuthedRequest, res) => {
    const enquiryId = Number(req.params.id);
    const enquiry = db
      .prepare('SELECT * FROM enquiries WHERE id = ? AND assigned_advisor_id = ?')
      .get(enquiryId, req.authUser!.id) as any;

    if (!enquiry) {
      res.status(404).json({ error: 'Assigned enquiry not found.' });
      return;
    }

    const { status, advisorNotes } = req.body || {};
    const validStatuses = ['new', 'contacted', 'in_progress', 'resolved'];
    const nextStatus = validStatuses.includes(status) ? status : enquiry.status;
    const nextNotes = typeof advisorNotes === 'string' ? advisorNotes : enquiry.advisor_notes;

    db.prepare("UPDATE enquiries SET status = ?, advisor_notes = ?, updated_at = datetime('now') WHERE id = ?").run(
      nextStatus,
      nextNotes,
      enquiryId
    );

    res.json({ enquiry: db.prepare('SELECT * FROM enquiries WHERE id = ?').get(enquiryId) });
  });

  // ---------- PRIVATE OWNER ADMIN DASHBOARD (support@dnageneie.com ONLY) ----------
  app.get('/api/admin/dashboard', requireRole('admin'), (_req, res) => {
    const totalMembers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'member'").get() as { c: number }).c;
    const totalAdvisors = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'advisor' AND status = 'active'").get() as { c: number }).c;
    const pendingAdvisorApprovals = (
      db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'advisor' AND status = 'pending_approval'").get() as { c: number }
    ).c;
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as { c: number }).c;
    const verifiedRevenueRow = db
      .prepare("SELECT COALESCE(SUM(amount_inr), 0) as total FROM payments WHERE status = 'verified'")
      .get() as { total: number };
    const totalRefundedRow = db
      .prepare("SELECT COALESCE(SUM(amount_inr), 0) as total FROM refund_requests WHERE status = 'processed'")
      .get() as { total: number };
    const monthlyRevenueRow = db
      .prepare(
        "SELECT COALESCE(SUM(amount_inr), 0) as total FROM payments WHERE status = 'verified' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
      )
      .get() as { total: number };

    const allOrdersRaw = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as any[];
    const productCounts: Record<string, number> = {};
    for (const o of allOrdersRaw) {
      if (o.order_status === 'cancelled') continue;
      const items = JSON.parse(o.items_json || '[]');
      for (const item of items) {
        productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
      }
    }
    const mostPurchasedProducts = Object.entries(productCounts)
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units);

    const paidOrdersCount = allOrdersRaw.filter((o) => o.payment_status === 'verified').length;
    const conversionRate = totalMembers > 0 ? Math.min(100, Math.round((paidOrdersCount / totalMembers) * 100)) : 0;

    const members = db
      .prepare(
        `SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status, u.email_verified, u.assigned_advisor_id,
                u.consent_privacy, u.consent_genomic, u.consent_marketing, u.deletion_requested_at, u.created_at,
                a.full_name as advisor_name
         FROM users u
         LEFT JOIN users a ON a.id = u.assigned_advisor_id
         WHERE u.role = 'member'
         ORDER BY u.id DESC`
      )
      .all();

    const advisors = db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.phone, u.specialization, u.status, u.email_verified, u.created_at,
                (SELECT COUNT(*) FROM enquiries e WHERE e.assigned_advisor_id = u.id) as assigned_enquiries_count,
                (SELECT COUNT(*) FROM users m WHERE m.assigned_advisor_id = u.id) as assigned_clients_count
         FROM users u
         WHERE u.role = 'advisor'
         ORDER BY CASE WHEN u.status = 'pending_approval' THEN 0 ELSE 1 END, u.id DESC`
      )
      .all();

    const recentRegistrations = db
      .prepare(
        `SELECT id, role, full_name, email, phone, status, created_at
         FROM users
         WHERE role IN ('member', 'advisor')
         ORDER BY id DESC
         LIMIT 12`
      )
      .all();

    const loginActivity = db.prepare('SELECT * FROM login_activity ORDER BY id DESC LIMIT 120').all();
    const adminAuditLogs = db.prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 100').all();
    const activeSessions = db
      .prepare(
        `SELECT s.id, s.user_id, s.role, s.ip_address, s.user_agent, s.expires_at, s.created_at, u.email, u.full_name
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC`
      )
      .all();

    const failedAttemptsCount = (
      db.prepare('SELECT COUNT(*) as c FROM login_activity WHERE success = 0').get() as { c: number }
    ).c;

    const emailNotifications = db.prepare('SELECT * FROM email_notifications ORDER BY id DESC LIMIT 80').all();

    const orders = allOrdersRaw.map((o: any) => ({ ...o, items: JSON.parse(o.items_json || '[]') }));

    const payments = db
      .prepare(
        `SELECT p.*, o.order_number, o.customer_name, o.customer_email
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         ORDER BY p.id DESC`
      )
      .all();

    const refunds = db
      .prepare(
        `SELECT r.*, o.order_number, o.customer_name, o.customer_email
         FROM refund_requests r
         JOIN orders o ON o.id = r.order_id
         ORDER BY r.id DESC`
      )
      .all();

    const products = db
      .prepare('SELECT * FROM products ORDER BY id ASC')
      .all()
      .map((p: any) => ({ ...p, highlights: JSON.parse(p.highlights_json || '[]') }));

    const bundles = db
      .prepare('SELECT * FROM bundles ORDER BY id ASC')
      .all()
      .map((b: any) => ({ ...b, included_product_slugs: JSON.parse(b.included_product_slugs_json || '[]') }));

    const promos = db.prepare('SELECT * FROM promos ORDER BY id DESC').all();

    const enquiries = db
      .prepare(
        `SELECT e.*, a.full_name as advisor_name
         FROM enquiries e
         LEFT JOIN users a ON a.id = e.assigned_advisor_id
         ORDER BY e.id DESC`
      )
      .all();

    const kits = db
      .prepare(
        `SELECT k.*, u.full_name as member_name, u.email as member_email
         FROM dna_kits k
         JOIN users u ON u.id = k.user_id
         ORDER BY k.id DESC`
      )
      .all();

    const reports = db
      .prepare(
        `SELECT r.*, u.full_name as member_name, u.email as member_email, k.kit_barcode
         FROM reports r
         JOIN users u ON u.id = r.user_id
         JOIN dna_kits k ON k.id = r.kit_id
         ORDER BY r.id DESC`
      )
      .all()
      .map(hydrateReportRow);

    const dpdpRequests = db
      .prepare(
        `SELECT d.*, u.full_name, u.email
         FROM dpdp_requests d
         JOIN users u ON u.id = d.user_id
         ORDER BY d.id DESC
         LIMIT 50`
      )
      .all();

    const usaSetting = db
      .prepare('SELECT value FROM site_settings WHERE key = ?')
      .get('usa_lab_section_published') as { value: string } | undefined;

    const getSetting = (key: string, fallback: string) => {
      const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row?.value || fallback;
    };

    const ownerUser = db
      .prepare("SELECT totp_enabled FROM users WHERE role = 'admin' AND lower(email) = ?")
      .get(OWNER_ADMIN_EMAIL) as { totp_enabled: number } | undefined;

    res.json({
      summary: {
        totalMembers,
        totalAdvisors,
        pendingAdvisorApprovals,
        totalOrders,
        verifiedRevenueInr: verifiedRevenueRow.total,
        monthlyRevenueInr: monthlyRevenueRow.total,
        totalRefundedInr: totalRefundedRow.total,
        conversionRate,
        mostPurchasedProducts,
        failedAttemptsCount,
      },
      recentRegistrations,
      members,
      advisors,
      loginActivity,
      adminAuditLogs,
      activeSessions,
      emailNotifications,
      orders,
      payments,
      refunds,
      products,
      bundles,
      promos,
      enquiries,
      kits,
      reports,
      dpdpRequests,
      ownerTotpEnabled: ownerUser?.totp_enabled === 1,
      siteSettings: {
        usaLabSectionPublished: usaSetting?.value === 'true',
        contactEmail: getSetting('contact_email', 'support@dnageneie.com'),
        contactPhone: getSetting('contact_phone', '+91 90232 94189'),
        contactWhatsapp: getSetting('contact_whatsapp', '919023294189'),
        supportHours: getSetting('support_hours', 'Monday – Saturday, 9:30 AM – 6:30 PM IST'),
      },
      mailerStatus: getMailerConfigStatus(),
    });
  });

  // Owner 2FA Setup & Toggle
  app.post('/api/admin/security/2fa/setup', requireRole('admin'), (req: AuthedRequest, res) => {
    const secret = generateTotpSecret(20);
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(encryptSensitive(secret), req.authUser!.id);
    const otpauthUrl = `otpauth://totp/DNA%20GENEIE:${encodeURIComponent(req.authUser!.email)}?secret=${secret}&issuer=DNA%20GENEIE`;
    logAdminAudit(req, '2FA_SETUP_INITIATED', 'admin', req.authUser!.id, 'Generated TOTP secret for owner 2FA');
    res.json({ secret, otpauthUrl });
  });

  app.post('/api/admin/security/2fa/enable', requireRole('admin'), async (req: AuthedRequest, res) => {
    const { code } = req.body || {};
    const row = db.prepare('SELECT totp_secret FROM users WHERE id = ?').get(req.authUser!.id) as { totp_secret: string } | undefined;
    if (!row?.totp_secret) {
      res.status(400).json({ error: 'Generate a 2FA secret first.' });
      return;
    }
    const secret = decryptSensitive(row.totp_secret);
    if (!verifyTotpCode(secret, String(code))) {
      res.status(400).json({ error: 'Invalid 6-digit authenticator code. Verify your device time and try again.' });
      return;
    }
    db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.authUser!.id);
    logAdminAudit(req, '2FA_ENABLED', 'admin', req.authUser!.id, 'Owner 2FA enabled');
    await notifyOwnerSecurityEvent({
      eventType: 'security_alert',
      accountType: 'Admin',
      fullName: req.authUser!.full_name,
      email: req.authUser!.email,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: 'Two-factor authentication (TOTP) was ENABLED on the owner account.',
    });
    res.json({ ok: true });
  });

  app.post('/api/admin/security/2fa/disable', requireRole('admin'), async (req: AuthedRequest, res) => {
    db.prepare("UPDATE users SET totp_enabled = 0, totp_secret = '' WHERE id = ?").run(req.authUser!.id);
    logAdminAudit(req, '2FA_DISABLED', 'admin', req.authUser!.id, 'Owner 2FA disabled');
    await notifyOwnerSecurityEvent({
      eventType: 'security_alert',
      accountType: 'Admin',
      fullName: req.authUser!.full_name,
      email: req.authUser!.email,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: 'Two-factor authentication (TOTP) was DISABLED on the owner account.',
    });
    res.json({ ok: true });
  });

  app.delete('/api/admin/sessions/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const sid = Number(req.params.id);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
    logAdminAudit(req, 'SESSION_REVOKED', 'session', sid, 'Owner revoked an active user session');
    res.json({ ok: true });
  });

  // Exports (CSV) & Secure Database Backup
  app.get('/api/admin/export/customers', requireRole('admin'), (req: AuthedRequest, res) => {
    const rows = db
      .prepare("SELECT id, full_name, username, email, phone, status, email_verified, created_at FROM users WHERE role = 'member' ORDER BY id DESC")
      .all() as any[];
    const header = ['ID', 'Full Name', 'Username', 'Email', 'Phone', 'Status', 'Email Verified', 'Registered At'].join(',');
    const lines = rows.map((r) =>
      [r.id, r.full_name, r.username, r.email, r.phone, r.status, r.email_verified ? 'Yes' : 'No', r.created_at]
        .map(csvCell)
        .join(',')
    );
    logAdminAudit(req, 'EXPORT_CUSTOMERS_CSV', 'users', 'all', `Exported ${rows.length} customer records`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dnageneie-customers.csv"');
    res.send([header, ...lines].join('\n'));
  });

  app.get('/api/admin/export/payments', requireRole('admin'), (req: AuthedRequest, res) => {
    const rows = db
      .prepare(
        `SELECT p.id, o.order_number, o.invoice_number, o.customer_name, o.customer_email, p.amount_inr, p.currency, p.gateway, p.transaction_ref, p.status, p.created_at
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         ORDER BY p.id DESC`
      )
      .all() as any[];
    const header = ['Payment ID', 'Order #', 'Invoice #', 'Customer', 'Email', 'Amount (INR)', 'Currency', 'Gateway', 'Transaction Ref', 'Status', 'Date'].join(',');
    const lines = rows.map((r) =>
      [r.id, r.order_number, r.invoice_number, r.customer_name, r.customer_email, r.amount_inr, r.currency, r.gateway, r.transaction_ref, r.status, r.created_at]
        .map(csvCell)
        .join(',')
    );
    logAdminAudit(req, 'EXPORT_PAYMENTS_CSV', 'payments', 'all', `Exported ${rows.length} payment records`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dnageneie-payments.csv"');
    res.send([header, ...lines].join('\n'));
  });

  app.get('/api/admin/backup/download', requireRole('admin'), async (req: AuthedRequest, res) => {
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const filename = `dnageneie-backup-${Date.now()}.db`;
    const targetPath = path.join(backupDir, filename);
    await db.backup(targetPath);
    logAdminAudit(req, 'DATABASE_BACKUP_DOWNLOADED', 'database', filename, 'Owner triggered and downloaded SQLite backup snapshot');
    await notifyOwnerSecurityEvent({
      eventType: 'security_alert',
      accountType: 'Admin',
      fullName: req.authUser!.full_name,
      email: req.authUser!.email,
      ipAddress: extractClientIp(req),
      deviceInfo: extractDeviceInfo(req),
      extraNote: `Database backup snapshot (${filename}) downloaded.`,
    });
    res.download(targetPath, filename, () => {
      try {
        fs.unlinkSync(targetPath);
      } catch {
        // ignore cleanup error
      }
    });
  });

  app.patch('/api/admin/advisors/:id/approval', requireRole('admin'), async (req: AuthedRequest, res) => {
    const advisorId = Number(req.params.id);
    const { action } = req.body || {};
    const advisor = db
      .prepare("SELECT id, full_name, email, phone, status FROM users WHERE id = ? AND role = 'advisor'")
      .get(advisorId) as { id: number; full_name: string; email: string; phone: string; status: string } | undefined;

    if (!advisor) {
      res.status(404).json({ error: 'Advisor not found.' });
      return;
    }

    const nextStatus = action === 'approve' ? 'active' : action === 'suspend' ? 'suspended' : 'rejected';
    db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, advisorId);
    logAdminAudit(req, `ADVISOR_${nextStatus.toUpperCase()}`, 'advisor', advisorId, `Advisor ${advisor.email} set to ${nextStatus}`);

    if (nextStatus === 'active') {
      logActivity({
        userId: advisor.id,
        email: advisor.email,
        accountType: 'Advisor',
        eventType: 'advisor_approved',
        success: true,
        details: `Approved by owner ${req.authUser!.email}`,
        req,
      });

      await notifyOwnerSecurityEvent({
        eventType: 'advisor_approved',
        accountType: 'Advisor',
        fullName: advisor.full_name,
        email: advisor.email,
        phone: advisor.phone,
        ipAddress: extractClientIp(req),
        deviceInfo: extractDeviceInfo(req),
        extraNote: `Approved by owner (${req.authUser!.email}).`,
      });

      await sendUserTransactionalEmail(
        advisor.email,
        'Your DNA GENEIE Advisor Account is Approved',
        `Welcome to the DNA GENEIE Advisor Portal, ${advisor.full_name}`,
        [
          'Your Advisor account registration has been approved by our administration team.',
          'You can now sign in to the Advisor Portal to manage assigned clients and customer enquiries.',
        ],
        'Open Advisor Portal',
        `${getAppBaseUrl(req)}/#advisor-login`
      );
    }

    res.json({ ok: true, status: nextStatus });
  });

  app.patch('/api/admin/members/:id/assign-advisor', requireRole('admin'), (req: AuthedRequest, res) => {
    const memberId = Number(req.params.id);
    const { advisorId } = req.body || {};
    const nextAdvisorId = advisorId ? Number(advisorId) : null;
    if (nextAdvisorId) {
      const adv = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'advisor' AND status = 'active'").get(nextAdvisorId);
      if (!adv) {
        res.status(400).json({ error: 'Selected advisor must be active.' });
        return;
      }
    }
    db.prepare("UPDATE users SET assigned_advisor_id = ?, updated_at = datetime('now') WHERE id = ? AND role = 'member'").run(
      nextAdvisorId,
      memberId
    );
    logAdminAudit(req, 'MEMBER_ASSIGN_ADVISOR', 'member', memberId, `Assigned advisor ${nextAdvisorId ?? 'none'}`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/enquiries/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const enquiryId = Number(req.params.id);
    const { assignedAdvisorId, status } = req.body || {};
    const validStatuses = ['new', 'contacted', 'in_progress', 'resolved'];
    const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(enquiryId) as any;
    if (!row) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }

    const nextAdvisor = assignedAdvisorId === '' || assignedAdvisorId === null ? null : Number(assignedAdvisorId ?? row.assigned_advisor_id);
    const nextStatus = validStatuses.includes(status) ? status : row.status;

    db.prepare("UPDATE enquiries SET assigned_advisor_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(
      nextAdvisor,
      nextStatus,
      enquiryId
    );
    logAdminAudit(req, 'ENQUIRY_UPDATED', 'enquiry', enquiryId, `status=${nextStatus}, advisor=${nextAdvisor ?? 'none'}`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/orders/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const orderId = Number(req.params.id);
    const { orderStatus, paymentStatus, advisorId } = req.body || {};
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const validOrderStatuses = ['placed', 'kit_dispatched', 'sample_received', 'lab_processing', 'report_ready', 'cancelled'];
    const validPayStatuses = ['pending', 'verified', 'failed', 'refunded'];

    const nextOrderStatus = validOrderStatuses.includes(orderStatus) ? orderStatus : order.order_status;
    const nextPaymentStatus = validPayStatuses.includes(paymentStatus) ? paymentStatus : order.payment_status;
    const nextAdvisorId = advisorId === '' || advisorId === null ? null : Number(advisorId ?? order.advisor_id);

    db.prepare(
      "UPDATE orders SET order_status = ?, payment_status = ?, advisor_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(nextOrderStatus, nextPaymentStatus, nextAdvisorId, orderId);

    db.prepare('UPDATE payments SET status = ? WHERE order_id = ?').run(nextPaymentStatus, orderId);
    logAdminAudit(req, 'ORDER_UPDATED', 'order', order.order_number, `orderStatus=${nextOrderStatus}, paymentStatus=${nextPaymentStatus}`);

    res.json({ ok: true });
  });

  app.patch('/api/admin/refunds/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const refundId = Number(req.params.id);
    const { status, adminNote } = req.body || {};
    const valid = ['requested', 'approved', 'processed', 'rejected'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: 'Invalid refund status.' });
      return;
    }
    const refRow = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(refundId) as any;
    if (!refRow) {
      res.status(404).json({ error: 'Refund request not found.' });
      return;
    }
    db.prepare("UPDATE refund_requests SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      String(adminNote || refRow.admin_note || ''),
      refundId
    );
    if (status === 'processed') {
      db.prepare("UPDATE orders SET payment_status = 'refunded', updated_at = datetime('now') WHERE id = ?").run(refRow.order_id);
      db.prepare("UPDATE payments SET status = 'refunded' WHERE order_id = ?").run(refRow.order_id);
    }
    logAdminAudit(req, 'REFUND_UPDATED', 'refund', refundId, `status=${status}`);
    res.json({ ok: true });
  });

  // Products CRUD
  app.post('/api/admin/products', requireRole('admin'), (req: AuthedRequest, res) => {
    const { name, slug, category, tagline, description, priceInr, status, stockCount, markersCount, turnaroundDays, sampleType, offerLabel } = req.body || {};
    if (!name || !slug || !category || !description) {
      res.status(400).json({ error: 'Product name, slug, category, and description are required.' });
      return;
    }
    const cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const ins = db
      .prepare(
        `INSERT INTO products (slug, name, category, tagline, description, price_inr, original_price_inr, status, is_active, stock_count, offer_label, markers_count, turnaround_days, sample_type, image_url, highlights_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cleanSlug,
        String(name).trim(),
        String(category).trim(),
        String(tagline || '').trim() || String(name).trim(),
        String(description).trim(),
        priceInr ? Math.round(Number(priceInr)) : null,
        priceInr ? Math.round(Number(priceInr)) : null,
        status === 'coming_soon' ? 'coming_soon' : 'available',
        Number(stockCount) || 100,
        String(offerLabel || '').trim(),
        String(markersCount || '100+ Genomic Variants').trim(),
        String(turnaroundDays || '3–4 Weeks after Lab Receipt').trim(),
        String(sampleType || 'Non-invasive Buccal Cheek Swab').trim(),
        '/assets/images/product_nutrig_kit_1794562665944.jpg',
        JSON.stringify(['Personalized clinical DNA insights', 'Encrypted Member Dashboard reporting'])
      );
    logAdminAudit(req, 'PRODUCT_CREATED', 'product', cleanSlug, `Added product ${name}`);
    res.status(201).json({ id: ins.lastInsertRowid });
  });

  app.patch('/api/admin/products/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { priceInr, status, isActive, stockCount, offerLabel, tagline, description } = req.body || {};
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const nextStatus = status === 'available' || status === 'coming_soon' ? status : existing.status;
    const nextPrice = priceInr === null || priceInr === '' ? existing.price_inr : Math.max(0, Math.round(Number(priceInr)));
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;
    const nextStock = stockCount !== undefined ? Math.max(0, Math.round(Number(stockCount))) : existing.stock_count;

    db.prepare(
      `UPDATE products SET price_inr = ?, status = ?, is_active = ?, stock_count = ?, offer_label = ?, tagline = ?, description = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nextPrice,
      nextStatus,
      nextActive,
      nextStock,
      typeof offerLabel === 'string' ? offerLabel.trim() : existing.offer_label,
      typeof tagline === 'string' && tagline.trim() ? tagline.trim() : existing.tagline,
      typeof description === 'string' && description.trim() ? description.trim() : existing.description,
      id
    );
    logAdminAudit(req, 'PRODUCT_UPDATED', 'product', existing.slug, `price=${nextPrice}, status=${nextStatus}, active=${nextActive}, stock=${nextStock}`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/bundles/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { priceInr, status, isActive } = req.body || {};
    const existing = db.prepare('SELECT * FROM bundles WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Bundle not found.' });
      return;
    }
    const nextStatus = status === 'available' || status === 'coming_soon' ? status : existing.status;
    const nextPrice = priceInr !== undefined ? Math.max(0, Math.round(Number(priceInr))) : existing.price_inr;
    const nextSavings = Math.max(0, existing.individual_total_inr - nextPrice);
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare("UPDATE bundles SET price_inr = ?, savings_inr = ?, status = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?").run(
      nextPrice,
      nextSavings,
      nextStatus,
      nextActive,
      id
    );
    logAdminAudit(req, 'BUNDLE_UPDATED', 'bundle', existing.slug, `price=${nextPrice}, status=${nextStatus}`);
    res.json({ ok: true });
  });

  app.post('/api/admin/promos', requireRole('admin'), (req: AuthedRequest, res) => {
    const { code, title, description, discountType, discountValue, minOrderInr } = req.body || {};
    if (!code || !title || !discountValue) {
      res.status(400).json({ error: 'Promo code, title, and discount value are required.' });
      return;
    }
    const cleanCode = String(code).trim().toUpperCase();
    db.prepare(
      `INSERT INTO promos (code, title, description, discount_type, discount_value, min_order_inr, is_active, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, 1, '2027-12-31')`
    ).run(
      cleanCode,
      String(title).trim(),
      String(description || '').trim(),
      discountType === 'percent' ? 'percent' : 'flat',
      Math.max(1, Math.round(Number(discountValue))),
      Math.max(0, Math.round(Number(minOrderInr) || 0))
    );
    logAdminAudit(req, 'PROMO_CREATED', 'promo', cleanCode, `Created promo ${cleanCode}`);
    res.status(201).json({ ok: true });
  });

  app.patch('/api/admin/promos/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const { isActive } = req.body || {};
    db.prepare('UPDATE promos SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, Number(req.params.id));
    logAdminAudit(req, 'PROMO_TOGGLED', 'promo', req.params.id, `isActive=${Boolean(isActive)}`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/kits/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const valid = ['registered', 'sample_shipped', 'lab_received', 'sequencing', 'verified_complete'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: 'Invalid kit status.' });
      return;
    }
    db.prepare("UPDATE dna_kits SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    logAdminAudit(req, 'DNA_KIT_STATUS_UPDATED', 'dna_kit', id, `status=${status}`);
    res.json({ ok: true });
  });

  app.post('/api/admin/reports', requireRole('admin'), (req: AuthedRequest, res) => {
    const { kitId, reportTitle, summary, recommendations, markersAnalyzed, verifiedBy } = req.body || {};
    const kit = db.prepare('SELECT * FROM dna_kits WHERE id = ?').get(Number(kitId)) as any;
    if (!kit) {
      res.status(404).json({ error: 'DNA kit not found.' });
      return;
    }
    if (!reportTitle || !summary) {
      res.status(400).json({ error: 'Report title and summary are required.' });
      return;
    }

    const recList = Array.isArray(recommendations)
      ? recommendations
      : String(recommendations || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

    // Encrypt sensitive genomic summary & recommendations at rest
    const encryptedSummary = encryptSensitive(String(summary).trim());
    const encryptedRecs = encryptSensitive(JSON.stringify(recList));

    const ins = db
      .prepare(
        `INSERT INTO reports (kit_id, user_id, product_slug, product_name, report_title, summary, recommendations_json, markers_analyzed, verified_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`
      )
      .run(
        kit.id,
        kit.user_id,
        kit.product_slug,
        kit.product_name,
        String(reportTitle).trim(),
        encryptedSummary,
        encryptedRecs,
        Number(markersAnalyzed) || 120,
        typeof verifiedBy === 'string' && verifiedBy.trim() ? verifiedBy.trim() : 'DNA GENEIE Clinical Review Board'
      );

    db.prepare("UPDATE dna_kits SET status = 'verified_complete', updated_at = datetime('now') WHERE id = ?").run(kit.id);
    logAdminAudit(req, 'GENETIC_REPORT_PUBLISHED', 'report', Number(ins.lastInsertRowid), `Published encrypted report for kit ${kit.kit_barcode}`);

    res.status(201).json({ id: Number(ins.lastInsertRowid) });
  });

  app.patch('/api/admin/reports/:id/availability', requireRole('admin'), (req: AuthedRequest, res) => {
    const reportId = Number(req.params.id);
    const { status } = req.body || {};
    const nextStatus = status === 'available' ? 'available' : 'processing';
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(nextStatus, reportId);
    logAdminAudit(req, 'REPORT_AVAILABILITY_UPDATED', 'report', reportId, `status=${nextStatus}`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/settings/usa-lab', requireRole('admin'), (req: AuthedRequest, res) => {
    const { published, ownerConfirmed } = req.body || {};
    if (published === true && ownerConfirmed !== true) {
      res.status(400).json({
        error: 'Owner confirmation is required before publishing the US laboratory testing statement.',
      });
      return;
    }
    const nextVal = published === true ? 'true' : 'false';
    db.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('usa_lab_section_published', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).run(nextVal);
    logAdminAudit(req, 'USA_LAB_SECTION_TOGGLED', 'site_settings', 'usa_lab_section_published', `published=${nextVal}`);

    res.json({ usaLabSectionPublished: nextVal === 'true' });
  });

  app.patch('/api/admin/settings/contact', requireRole('admin'), (req: AuthedRequest, res) => {
    const { contactPhone, contactWhatsapp, supportHours } = req.body || {};
    const cleanPhone = typeof contactPhone === 'string' && isValidPhone(contactPhone) ? contactPhone.trim() : '+91 90232 94189';
    const cleanWa =
      typeof contactWhatsapp === 'string' && /^\d{10,15}$/.test(contactWhatsapp.replace(/\D/g, ''))
        ? contactWhatsapp.replace(/\D/g, '')
        : '919023294189';
    const cleanHours =
      typeof supportHours === 'string' && supportHours.trim().length > 2
        ? supportHours.trim().slice(0, 120)
        : 'Monday – Saturday, 9:30 AM – 6:30 PM IST';

    const upsert = db.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    );
    upsert.run('contact_email', OWNER_ADMIN_EMAIL);
    upsert.run('contact_phone', cleanPhone);
    upsert.run('contact_whatsapp', cleanWa);
    upsert.run('support_hours', cleanHours);

    logAdminAudit(req, 'CONTACT_SETTINGS_UPDATED', 'site_settings', 'contact', `email=${OWNER_ADMIN_EMAIL}, phone=${cleanPhone}`);
    res.json({
      contactEmail: OWNER_ADMIN_EMAIL,
      contactPhone: cleanPhone,
      contactWhatsapp: cleanWa,
      supportHours: cleanHours,
    });
  });

  // ---------- VITE DEV MIDDLEWARE / PRODUCTION STATIC ----------
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DNA GENEIE server running on http://0.0.0.0:${PORT} (DB: ${DB_FILE_PATH})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DNA GENEIE server:', err);
  process.exit(1);
});
