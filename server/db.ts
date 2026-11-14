import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword, normalizePhone } from './security.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const DB_FILE_PATH = path.join(dataDir, 'dnageneie.db');
export const db = new Database(DB_FILE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const OWNER_ADMIN_EMAIL = (process.env.OWNER_ADMIN_EMAIL || 'support@dnageneie.com').toLowerCase();

function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('member', 'advisor', 'admin')),
      full_name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      specialization TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending_approval', 'suspended', 'rejected')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verify_token_hash TEXT,
      assigned_advisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      totp_secret TEXT DEFAULT '',
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      consent_privacy INTEGER NOT NULL DEFAULT 1,
      consent_genomic INTEGER NOT NULL DEFAULT 1,
      consent_marketing INTEGER NOT NULL DEFAULT 0,
      consent_updated_at TEXT,
      deletion_requested_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS login_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      account_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      event_type TEXT NOT NULL,
      account_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      account_email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      delivery_status TEXT NOT NULL,
      provider TEXT NOT NULL,
      error_message TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      price_inr INTEGER,
      original_price_inr INTEGER,
      status TEXT NOT NULL CHECK(status IN ('available', 'coming_soon')),
      is_active INTEGER NOT NULL DEFAULT 1,
      stock_count INTEGER NOT NULL DEFAULT 100,
      offer_label TEXT DEFAULT '',
      markers_count TEXT NOT NULL,
      turnaround_days TEXT NOT NULL,
      sample_type TEXT NOT NULL,
      image_url TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      included_product_slugs_json TEXT NOT NULL,
      price_inr INTEGER NOT NULL,
      individual_total_inr INTEGER NOT NULL,
      savings_inr INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('available', 'coming_soon')),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('flat', 'percent')),
      discount_value INTEGER NOT NULL,
      min_order_inr INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      valid_until TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Home',
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_slug)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_slug TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      verified_purchase INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      invoice_number TEXT DEFAULT '',
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal_inr INTEGER NOT NULL,
      discount_inr INTEGER NOT NULL DEFAULT 0,
      promo_code TEXT DEFAULT '',
      total_inr INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'verified', 'failed', 'refunded')),
      payment_reference TEXT DEFAULT '',
      order_status TEXT NOT NULL DEFAULT 'placed' CHECK(order_status IN ('placed', 'kit_dispatched', 'sample_received', 'lab_processing', 'report_ready', 'cancelled')),
      cancellation_reason TEXT DEFAULT '',
      tracking_code TEXT DEFAULT '',
      advisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount_inr INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      gateway TEXT NOT NULL,
      transaction_ref TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('verified', 'pending', 'failed', 'refunded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refund_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount_inr INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'approved', 'processed', 'rejected')),
      admin_note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dna_kits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kit_barcode TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      product_slug TEXT NOT NULL,
      product_name TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered', 'sample_shipped', 'lab_received', 'sequencing', 'verified_complete')),
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kit_id INTEGER NOT NULL REFERENCES dna_kits(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_slug TEXT NOT NULL,
      product_name TEXT NOT NULL,
      report_title TEXT NOT NULL,
      summary TEXT NOT NULL,
      recommendations_json TEXT NOT NULL,
      markers_analyzed INTEGER NOT NULL DEFAULT 0,
      verified_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('processing', 'available')),
      published_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      interest_product TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_advisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'in_progress', 'resolved')),
      advisor_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dpdp_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_type TEXT NOT NULL CHECK(request_type IN ('export', 'deletion', 'consent_update')),
      details TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('users', 'phone_normalized', "TEXT DEFAULT ''");
  ensureColumn('users', 'totp_secret', "TEXT DEFAULT ''");
  ensureColumn('users', 'totp_enabled', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'consent_privacy', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'consent_genomic', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'consent_marketing', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'consent_updated_at', 'TEXT');
  ensureColumn('users', 'deletion_requested_at', 'TEXT');

  // Backfill phone_normalized for any existing users
  const unnormalized = db
    .prepare("SELECT id, phone FROM users WHERE phone != '' AND (phone_normalized IS NULL OR phone_normalized = '')")
    .all() as Array<{ id: number; phone: string }>;
  for (const row of unnormalized) {
    db.prepare('UPDATE users SET phone_normalized = ? WHERE id = ?').run(normalizePhone(row.phone), row.id);
  }

  ensureColumn('products', 'original_price_inr', 'INTEGER');
  ensureColumn('products', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('products', 'stock_count', 'INTEGER NOT NULL DEFAULT 100');
  ensureColumn('products', 'offer_label', "TEXT DEFAULT ''");

  ensureColumn('bundles', 'is_active', 'INTEGER NOT NULL DEFAULT 1');

  ensureColumn('orders', 'invoice_number', "TEXT DEFAULT ''");
  ensureColumn('orders', 'promo_code', "TEXT DEFAULT ''");
  ensureColumn('orders', 'cancellation_reason', "TEXT DEFAULT ''");
  ensureColumn('enquiries', 'subject', "TEXT DEFAULT ''");

  seedInitialData();
}

function seedInitialData(): void {
  // Seed products if missing
  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (slug, name, category, tagline, description, price_inr, original_price_inr, status, is_active, stock_count, offer_label, markers_count, turnaround_days, sample_type, image_url, highlights_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
      'nutrig',
      'NutriG',
      'Nutrition & Nutrigenomics',
      'Personalized nutritional genomics for metabolic precision',
      'NutriG analyzes key nutrigenomic markers governing macronutrient metabolism, vitamin absorption, caffeine and lactose sensitivity, antioxidant defense, and glycemic response to guide targeted dietary planning.',
      40000,
      44000,
      'available',
      150,
      'Free Pan-India Kit Delivery & Pickup',
      '140+ Nutritional Variants',
      '3–4 Weeks after Lab Receipt',
      'Non-invasive Buccal Cheek Swab',
      '/assets/images/product_nutrig_kit_1794562665944.jpg',
      JSON.stringify([
        'Macronutrient utilization & carbohydrate sensitivity',
        'Micronutrient & B-vitamin / Vitamin D absorption pathways',
        'Food intolerances (lactose, gluten predisposition, caffeine)',
        'Antioxidant & detoxification enzymatic capacity',
        'Actionable personalized nutrition consultation roadmap'
      ])
    );

    insertProduct.run(
      'dermag',
      'DermaG',
      'Skin Health & Dermagenomics',
      'Genetic insights for skin longevity, barrier health, and targeted skincare',
      'DermaG evaluates genetic predispositions related to collagen synthesis, oxidative stress defense, pigmentation response, hydration retention, and sensitivity to support personalized dermatological care.',
      null,
      null,
      'coming_soon',
      0,
      'Pre-Launch Priority Waitlist Open',
      '95+ Skin Biology Variants',
      '3–4 Weeks after Lab Receipt',
      'Non-invasive Buccal Cheek Swab',
      '/assets/images/product_dermag_kit_1794562667120.jpg',
      JSON.stringify([
        'Collagen remodeling & elasticity genetic profile',
        'Photo-aging & UV oxidative resilience markers',
        'Melanin regulation & hyperpigmentation propensity',
        'Skin barrier hydration & inflammatory sensitivity traits',
        'Launching soon — register interest for priority access'
      ])
    );

    insertProduct.run(
      'fitg',
      'FitG',
      'Fitness & Athletic Genomics',
      'Train with your physiology across power, endurance, and recovery',
      'FitG examines genetic markers associated with muscle fiber composition, VO2 max trainability, tendon and ligament resilience, post-exercise inflammation, and recovery kinetics for structured athletic programming.',
      40000,
      44000,
      'available',
      150,
      'Free Pan-India Kit Delivery & Pickup',
      '120+ Performance Variants',
      '3–4 Weeks after Lab Receipt',
      'Non-invasive Buccal Cheek Swab',
      '/assets/images/product_fitg_kit_1794562669093.jpg',
      JSON.stringify([
        'Power vs. endurance muscle fiber predisposition (ACTN3 / ACE)',
        'Aerobic capacity & cardiovascular training response',
        'Soft-tissue, tendon & joint injury risk mitigation',
        'Exercise-induced oxidative stress & recovery timing',
        'Structured training split & recovery optimization guidance'
      ])
    );
  }

  // Seed bundles if missing
  const bundleCount = (db.prepare('SELECT COUNT(*) as c FROM bundles').get() as { c: number }).c;
  if (bundleCount === 0) {
    const insertBundle = db.prepare(`
      INSERT INTO bundles (slug, name, description, included_product_slugs_json, price_inr, individual_total_inr, savings_inr, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertBundle.run(
      'bundle-2',
      'Bundle of 2 (NutriG + FitG)',
      'Comprehensive Nutrition & Athletic Performance genomic combination pairing both currently available DNA testing panels.',
      JSON.stringify(['nutrig', 'fitg']),
      75000,
      80000,
      5000,
      'available'
    );

    insertBundle.run(
      'bundle-3',
      'Bundle of 3 (NutriG + DermaG + FitG)',
      'Complete three-panel genomic suite covering Nutrition, Skin Health, and Fitness. Available once DermaG officially launches.',
      JSON.stringify(['nutrig', 'dermag', 'fitg']),
      110000,
      120000,
      10000,
      'coming_soon'
    );
  }

  // Seed promotions if missing
  const promoCount = (db.prepare('SELECT COUNT(*) as c FROM promos').get() as { c: number }).c;
  if (promoCount === 0) {
    db.prepare(`
      INSERT INTO promos (code, title, description, discount_type, discount_value, min_order_inr, is_active, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      'WELLNESS2000',
      'Launch Wellness Privilege',
      'Save ₹2,000 on orders of ₹40,000 or more across NutriG, FitG, or Bundle of 2.',
      'flat',
      2000,
      40000,
      '2027-12-31'
    );
  }

  // Seed customer reviews if missing
  const reviewCount = (db.prepare('SELECT COUNT(*) as c FROM reviews').get() as { c: number }).c;
  if (reviewCount === 0) {
    const insRev = db.prepare(`
      INSERT INTO reviews (product_slug, author_name, rating, title, comment, verified_purchase, created_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now', ?))
    `);
    insRev.run(
      'nutrig',
      'Dr. Ananya Deshmukh',
      5,
      'Actionable vitamin & metabolic insights',
      'The NutriG report pinpointed my Vitamin D receptor and folate pathway variants clearly. Swab collection was effortless and the Member Dashboard walkthrough was thorough.',
      '-18 days'
    );
    insRev.run(
      'nutrig',
      'Rohan Kulkarni',
      5,
      'Worth every rupee for structured meal planning',
      'Clear breakdown of lactose tolerance, caffeine clearance, and carbohydrate response without confusing jargon. Delivery and sample pickup in Pune were seamless.',
      '-9 days'
    );
    insRev.run(
      'fitg',
      'Vikramaditya Nair',
      5,
      'Transformed my marathon recovery schedule',
      'FitG highlighted my tendon recovery profile and endurance vs. power ratio. My coach adjusted my weekly load immediately and my recovery metrics improved.',
      '-14 days'
    );
    insRev.run(
      'fitg',
      'Meera Kapoor',
      4,
      'Detailed athletic genomics panel',
      'Great clinical presentation in the portal and helpful advisor follow-up after report verification.',
      '-5 days'
    );
  }

  // Seed site settings
  const usaSetting = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('usa_lab_section_published');
  if (!usaSetting) {
    db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)').run('usa_lab_section_published', 'false');
  }

  const defaultContactSettings: Array<[string, string]> = [
    ['contact_email', 'support@dnageneie.com'],
    ['contact_phone', '+91 90232 94189'],
    ['contact_whatsapp', '919023294189'],
    ['support_hours', 'Monday – Saturday, 9:30 AM – 6:30 PM IST'],
  ];
  for (const [k, v] of defaultContactSettings) {
    const existingSetting = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(k);
    if (!existingSetting) {
      db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)').run(k, v);
    }
  }

  // Enforce strictly ONE authorized Owner Admin account: support@dnageneie.com
  // Remove any legacy non-owner admin rows so support@dnageneie.com is the sole admin
  db.prepare("DELETE FROM users WHERE role = 'admin' AND lower(email) != ?").run(OWNER_ADMIN_EMAIL);

  const ownerAdmin = db
    .prepare("SELECT id, phone FROM users WHERE role = 'admin' AND lower(email) = ?")
    .get(OWNER_ADMIN_EMAIL) as { id: number; phone: string } | undefined;

  const officialAdminPhone = '+91 90232 94189';
  if (!ownerAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD must be set before the first database initialization.');
    }
    db.prepare(`
      INSERT INTO users (role, full_name, username, email, phone, phone_normalized, specialization, password_hash, status, email_verified, consent_privacy, consent_genomic)
      VALUES ('admin', ?, ?, ?, ?, ?, ?, ?, 'active', 1, 1, 1)
    `).run(
      'DNA GENEIE Owner & Administrator',
      'dnageneie_owner',
      OWNER_ADMIN_EMAIL,
      officialAdminPhone,
      normalizePhone(officialAdminPhone),
      'Official Website Owner & Chief Administrator',
      hashPassword(adminPassword)
    );
  } else if (ownerAdmin.phone === '+91 98200 00000' || !ownerAdmin.phone) {
    db.prepare("UPDATE users SET phone = ?, phone_normalized = ?, updated_at = datetime('now') WHERE id = ?").run(
      officialAdminPhone,
      normalizePhone(officialAdminPhone),
      ownerAdmin.id
    );
  }
}
