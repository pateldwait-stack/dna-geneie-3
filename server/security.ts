import crypto from 'node:crypto';
import type { Request } from 'express';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET || 'dna-geneie-dev-session-secret-change-me';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

// ---------- AES-256-GCM ENCRYPTION AT REST ----------
function getEncryptionKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'dna-geneie-dev-encryption-key-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSensitive(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSensitive(value: string): string {
  if (!value) return '';
  if (!value.startsWith('enc:v1:')) return value;
  const parts = value.split(':');
  if (parts.length !== 5) return value;
  try {
    const [, , ivHex, tagHex, dataHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

// ---------- TOTP TWO-FACTOR AUTHENTICATION (RFC 6238) ----------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secretBase32: string, stepOffset = 0): string {
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function verifyTotpCode(secretBase32: string, inputCode: string): boolean {
  const clean = String(inputCode || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  for (const offset of [-1, 0, 1]) {
    const expected = generateTotpCode(secretBase32, offset);
    if (crypto.timingSafeEqual(Buffer.from(clean), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'Unknown';
}

export function extractDeviceInfo(req: Request): string {
  const ua = req.headers['user-agent'];
  if (!ua || typeof ua !== 'string') return 'Unknown device';
  return ua.slice(0, 220);
}

// ---------- PHONE NORMALIZATION & VALIDATION ----------
export function normalizePhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export function isValidPhone(phone: string): boolean {
  const raw = String(phone || '').trim();
  if (!raw || /[a-zA-Z]/.test(raw)) return false;
  const digits = normalizePhone(raw);
  return digits.length >= 10 && digits.length <= 15;
}

export function phoneMatches(storedDigits: string, inputDigits: string): boolean {
  if (!storedDigits || !inputDigits) return false;
  if (storedDigits === inputDigits) return true;
  if (storedDigits.length >= 10 && inputDigits.length >= 10) {
    return storedDigits.slice(-10) === inputDigits.slice(-10);
  }
  return false;
}

// ---------- SLIDING-WINDOW RATE LIMITER ----------
interface RateLimitBucket {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  name: string;
  message?: string;
}) {
  const store = new Map<string, RateLimitBucket>();

  return (req: Request, res: any, next: any) => {
    const now = Date.now();
    const ip = extractClientIp(req);
    const key = `${options.name}:${ip}`;
    const bucket = store.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);

    if (bucket.timestamps.length >= options.max) {
      const oldest = bucket.timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((options.windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(options.max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({
        error:
          options.message ||
          `Too many requests from your connection. Please wait ${retryAfterSec} seconds and try again.`,
      });
      return;
    }

    bucket.timestamps.push(now);
    store.set(key, bucket);

    // Occasional cleanup to bound map size
    if (store.size > 5000) {
      for (const [k, b] of store.entries()) {
        if (b.timestamps.every((t) => now - t >= options.windowMs)) {
          store.delete(k);
        }
      }
    }

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - bucket.timestamps.length)));
    next();
  };
}
