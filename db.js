// db.js — SQLite database (node:sqlite, zero dependencies)
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'legitrank.db'));

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

const now = () => new Date().toISOString();

function init() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS businesses(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    description TEXT DEFAULT '',
    website TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    verified INTEGER DEFAULT 0,
    verified_at TEXT,
    owner_user_id INTEGER,
    created_by INTEGER,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reviews(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    title TEXT DEFAULT '',
    body TEXT NOT NULL,
    response_text TEXT,
    responded_at TEXT,
    hidden INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(business_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS claims(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    details TEXT NOT NULL,
    contact TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS verifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    id_type TEXT NOT NULL,
    id_number TEXT NOT NULL,
    pay_method TEXT NOT NULL,
    pay_name TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    decided_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
  CREATE INDEX IF NOT EXISTS idx_biz_name ON businesses(name);
  `);

  // bootstrap admin from env
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPass = (process.env.ADMIN_PASSWORD || '').trim();
  if (adminEmail && adminPass) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (!existing) {
      db.prepare('INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,\'admin\',?)')
        .run(adminEmail, 'Administrator', hashPassword(adminPass), now());
      console.log('[db] admin account created:', adminEmail);
    }
  }
  seed();
}

// ---- password hashing (scrypt) ----
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(pw, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    const test = crypto.scryptSync(pw, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
  } catch { return false; }
}

// ---- slugs ----
function slugify(name) {
  return String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'business';
}
function uniqueSlug(name) {
  let base = slugify(name), slug = base, i = 2;
  while (db.prepare('SELECT 1 FROM businesses WHERE slug = ?').get(slug)) slug = base + '-' + (i++);
  return slug;
}

// ---- queries ----
const BIZ_AGG = `
  b.id, b.slug, b.name, b.category, b.city, b.country, b.description, b.website, b.phone,
  b.verified, b.verified_at, b.owner_user_id, b.status, b.created_at,
  (SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.business_id = b.id AND r.hidden = 0) AS avg_rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.business_id = b.id AND r.hidden = 0) AS review_count`;

function getBusinessBySlug(slug) {
  return db.prepare(`SELECT ${BIZ_AGG} FROM businesses b WHERE b.slug = ? AND b.status = 'active'`).get(slug);
}
function getBusinessById(id) {
  return db.prepare(`SELECT ${BIZ_AGG} FROM businesses b WHERE b.id = ?`).get(id);
}
function searchBusinesses(q, category) {
  let sql = `SELECT ${BIZ_AGG} FROM businesses b WHERE b.status = 'active'`;
  const params = [];
  if (q) {
    sql += ` AND (LOWER(b.name) LIKE ? OR LOWER(b.category) LIKE ? OR LOWER(b.city) LIKE ? OR LOWER(b.country) LIKE ?)`;
    const like = '%' + String(q).toLowerCase() + '%';
    params.push(like, like, like, like);
  }
  if (category) { sql += ` AND b.category = ?`; params.push(category); }
  sql += ` ORDER BY b.verified DESC, (avg_rating IS NULL), avg_rating DESC, review_count DESC LIMIT 50`;
  return db.prepare(sql).all(...params);
}
function topBusinesses(limit = 6) {
  return db.prepare(`
    SELECT ${BIZ_AGG} FROM businesses b WHERE b.status = 'active'
    ORDER BY b.verified DESC, avg_rating DESC, review_count DESC, b.created_at ASC LIMIT ?`).all(limit);
}
function reviewsForBusiness(bid, limit = 10, offset = 0) {
  return db.prepare(`
    SELECT r.*, u.name AS author_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.business_id = ? AND r.hidden = 0
    ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).all(bid, limit, offset);
}
function ratingDistribution(bid) {
  const rows = db.prepare(`SELECT rating, COUNT(*) AS n FROM reviews WHERE business_id = ? AND hidden = 0 GROUP BY rating`).all(bid);
  const dist = {1:0,2:0,3:0,4:0,5:0};
  rows.forEach(r => dist[r.rating] = r.n);
  return dist;
}
function myReview(bid, uid) {
  return db.prepare('SELECT * FROM reviews WHERE business_id = ? AND user_id = ?').get(bid, uid);
}
function userReviews(uid) {
  return db.prepare(`
    SELECT r.*, b.name AS biz_name, b.slug AS biz_slug
    FROM reviews r JOIN businesses b ON b.id = r.business_id
    WHERE r.user_id = ? AND b.status = 'active' ORDER BY r.created_at DESC`).all(uid);
}
function ownedBusinesses(uid) {
  return db.prepare(`SELECT ${BIZ_AGG} FROM businesses b WHERE b.owner_user_id = ? AND b.status = 'active' ORDER BY b.created_at DESC`).all(uid);
}
function platformStats() {
  return {
    businesses: db.prepare(`SELECT COUNT(*) AS n FROM businesses WHERE status='active'`).get().n,
    reviews: db.prepare(`SELECT COUNT(*) AS n FROM reviews WHERE hidden=0`).get().n,
    verified: db.prepare(`SELECT COUNT(*) AS n FROM businesses WHERE verified=1 AND status='active'`).get().n,
  };
}

// ---- seed sample content (only if empty) ----
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM businesses').get().n;
  if (count > 0) return;

  const mkUser = (email, name) => Number(db.prepare(
    'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,\'user\',?)')
    .run(email, name, hashPassword(crypto.randomBytes(24).toString('hex')), now()).lastInsertRowid);

  const u1 = mkUser('tamandani@example.com', 'Tamandani C.');
  const u2 = mkUser('amara@example.com', 'Amara O.');
  const u3 = mkUser('gracious@example.com', 'Gracious N.');
  const u4 = mkUser('kwame@example.com', 'Kwame A.');

  const mkBiz = (name, category, city, country, desc, verified, owner) => Number(db.prepare(`
    INSERT INTO businesses (slug, name, category, city, country, description, verified, verified_at, owner_user_id, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uniqueSlug(name), name, category, city, country, desc, verified, verified ? now() : null, owner, now()).lastInsertRowid);

  const b1 = mkBiz('Ka-Jekete Shop', 'Fashion', 'Blantyre', 'Malawi',
    'Clothing and shoes sold online with fast nationwide delivery.', 1, null);
  const b2 = mkBiz('Chibondo Academy', 'Education', 'Blantyre', 'Malawi',
    'Tutoring and exam preparation for secondary school students.', 0, null);
  const b3 = mkBiz('Nairobi Threads Collection', 'Fashion', 'Nairobi', 'Kenya',
    'Custom-made and ready-to-wear African fashion.', 1, null);
  const b4 = mkBiz('Lagos Gadget Hub', 'Electronics', 'Lagos', 'Nigeria',
    'Phones, laptops and accessories with warranty.', 0, null);
  const b5 = mkBiz('Accra Home Deals', 'Home & Living', 'Accra', 'Ghana',
    'Furniture and household goods at fair prices.', 0, null);
  const b6 = mkBiz('Kigali Fresh Mart', 'Retail', 'Kigali', 'Rwanda',
    'Groceries and fresh produce delivered to your door.', 1, null);
  mkBiz('Lusaka Auto Parts', 'Services', 'Lusaka', 'Zambia',
    'Genuine spare parts and repairs for all major brands.', 0, null);
  mkBiz('Zanzibar Tours & Travel', 'Travel', 'Zanzibar', 'Tanzania',
    'Island tours, airport transfers and hotel bookings.', 0, null);

  const mkRev = (biz, user, rating, title, body) => db.prepare(`
    INSERT INTO reviews (business_id, user_id, rating, title, body, created_at) VALUES (?,?,?,?,?,?)`)
    .run(biz, user, rating, title, body, now());

  mkRev(b1, u1, 5, 'Fast delivery, real products', 'Ordered shoes on Monday and got them Wednesday. Exactly what was in the pictures.');
  mkRev(b1, u2, 4, 'Good quality clothes', 'Delivery took a day longer than promised, but the clothes were legit and well packed.');
  mkRev(b3, u3, 5, 'Custom dress was perfect', 'They tailored my dress in one week and it fit perfectly. Communication was excellent.');
  mkRev(b4, u2, 2, 'Be careful here', 'Paid for a phone, it arrived with a cracked screen and seller stopped replying for a week.');
  mkRev(b5, u4, 5, 'Honest seller', 'Fair prices and they delivered and installed the sofa for free. Recommended.');
  mkRev(b6, u3, 4, 'Fresh produce weekly', 'Good quality vegetables. Once an item was missing and they refunded it quickly.');

  console.log('[db] seeded sample data');
}

module.exports = {
  db, init, now, hashPassword, verifyPassword, slugify, uniqueSlug,
  getBusinessBySlug, getBusinessById, searchBusinesses, topBusinesses,
  reviewsForBusiness, ratingDistribution, myReview, userReviews,
  ownedBusinesses, platformStats,
};
