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
  migrate();
  seed();
}

function migrate() {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  if (!cols('users').includes('status')) db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  const rc = cols('reviews');
  if (!rc.includes('hidden_reason')) db.exec(`ALTER TABLE reviews ADD COLUMN hidden_reason TEXT DEFAULT ''`);
  if (!rc.includes('hidden_by')) db.exec(`ALTER TABLE reviews ADD COLUMN hidden_by INTEGER`);
  if (!rc.includes('hidden_at')) db.exec(`ALTER TABLE reviews ADD COLUMN hidden_at TEXT`);
  if (!rc.includes('photo_path')) db.exec(`ALTER TABLE reviews ADD COLUMN photo_path TEXT`);
  if (!rc.includes('receipt_path')) db.exec(`ALTER TABLE reviews ADD COLUMN receipt_path TEXT`);
  if (!rc.includes('verified_purchase')) db.exec(`ALTER TABLE reviews ADD COLUMN verified_purchase INTEGER DEFAULT 0`);
  const vc = cols('verifications');
  if (!vc.includes('admin_note')) db.exec(`ALTER TABLE verifications ADD COLUMN admin_note TEXT DEFAULT ''`);
  if (!vc.includes('expires_at')) db.exec(`ALTER TABLE verifications ADD COLUMN expires_at TEXT`);
  db.exec(`
  CREATE TABLE IF NOT EXISTS reports(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    business_id INTEGER, review_id INTEGER, target_user_id INTEGER,
    reporter_user_id INTEGER, reporter_contact TEXT DEFAULT '',
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    outcome TEXT DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS audit_log(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER, actor_email TEXT, actor_role TEXT,
    action TEXT NOT NULL, entity_type TEXT DEFAULT '', entity_id INTEGER,
    details TEXT DEFAULT '', created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appeals(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, review_id INTEGER NOT NULL,
    reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    decided_by INTEGER, decided_at TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories(
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
  CREATE INDEX IF NOT EXISTS idx_reports_biz ON reports(business_id);
  CREATE INDEX IF NOT EXISTS idx_audit ON audit_log(created_at);
  `);
  if (db.prepare('SELECT COUNT(*) AS n FROM categories').get().n === 0) {
    ['Fashion','Electronics','Home & Living','Food & Restaurant','Beauty','Services','Education','Retail','Travel','Transport','Health','Other']
      .forEach(c => db.prepare('INSERT OR IGNORE INTO categories (name, created_at) VALUES (?,?)').run(c, now()));
  }
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

// ---- admin control centre helpers ----
function audit(actor, action, entityType, entityId, details) {
  db.prepare(`INSERT INTO audit_log (actor_id, actor_email, actor_role, action, entity_type, entity_id, details, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(actor ? actor.id : null, actor ? actor.email : 'system', actor ? actor.role : '-', action, entityType || '', entityId || null, details || '', now());
}
function adminStats() {
  const one = (sql) => db.prepare(sql).get().n;
  return {
    users: one(`SELECT COUNT(*) AS n FROM users`),
    businesses: one(`SELECT COUNT(*) AS n FROM businesses WHERE status='active'`),
    reviews: one(`SELECT COUNT(*) AS n FROM reviews WHERE hidden=0`),
    hiddenReviews: one(`SELECT COUNT(*) AS n FROM reviews WHERE hidden=1`),
    pendingVerifications: one(`SELECT COUNT(*) AS n FROM verifications WHERE status='pending'`),
    docsRequested: one(`SELECT COUNT(*) AS n FROM verifications WHERE status='docs_requested'`),
    openReports: one(`SELECT COUNT(*) AS n FROM reports WHERE status IN ('open','investigating')`),
    urgentReports: one(`SELECT COUNT(*) AS n FROM reports WHERE priority='urgent' AND status IN ('open','investigating')`),
    pendingClaims: one(`SELECT COUNT(*) AS n FROM claims WHERE status='pending'`),
    suspendedUsers: one(`SELECT COUNT(*) AS n FROM users WHERE status != 'active'`),
    pendingAppeals: one(`SELECT COUNT(*) AS n FROM appeals WHERE status='pending'`),
  };
}
function recentActivity(limit) {
  limit = limit || 15;
  const rows = [];
  db.prepare(`SELECT 'signup' AS kind, created_at, name AS label FROM users ORDER BY created_at DESC LIMIT ?`).all(limit).forEach(r => rows.push(r));
  db.prepare(`SELECT 'review' AS kind, r.created_at, u.name AS label FROM reviews r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT ?`).all(limit).forEach(r => rows.push(r));
  db.prepare(`SELECT 'business' AS kind, created_at, name AS label FROM businesses ORDER BY created_at DESC LIMIT ?`).all(limit).forEach(r => rows.push(r));
  db.prepare(`SELECT 'report' AS kind, created_at, type AS label FROM reports ORDER BY created_at DESC LIMIT ?`).all(limit).forEach(r => rows.push(r));
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit);
}
function listUsers(search) {
  let sql = `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.id) AS review_count
    FROM users u`;
  const p = [];
  if (search) { sql += ` WHERE LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?`; p.push('%' + search.toLowerCase() + '%', '%' + search.toLowerCase() + '%'); }
  sql += ` ORDER BY u.created_at DESC LIMIT 100`;
  return db.prepare(sql).all(...p);
}
function listReports(status) {
  let sql = `SELECT rp.*, b.name AS biz_name, b.slug AS biz_slug, u.name AS reporter_name
    FROM reports rp
    LEFT JOIN businesses b ON b.id = rp.business_id
    LEFT JOIN users u ON u.id = rp.reporter_user_id`;
  const p = [];
  if (status && status !== 'all') { sql += ` WHERE rp.status = ?`; p.push(status); }
  sql += ` ORDER BY CASE rp.priority WHEN 'urgent' THEN 0 ELSE 1 END, rp.created_at DESC LIMIT 200`;
  return db.prepare(sql).all(...p);
}
function getReport(id) {
  return db.prepare(`SELECT rp.*, b.name AS biz_name, b.slug AS biz_slug, u.name AS reporter_name
    FROM reports rp
    LEFT JOIN businesses b ON b.id = rp.business_id
    LEFT JOIN users u ON u.id = rp.reporter_user_id WHERE rp.id = ?`).get(id);
}
function reportsForBusiness(bid, exceptId) {
  return db.prepare(`SELECT * FROM reports WHERE business_id = ? AND id != ? ORDER BY created_at DESC LIMIT 20`).all(bid, exceptId || 0);
}
function addReport(r) {
  return Number(db.prepare(`INSERT INTO reports (type, business_id, review_id, target_user_id, reporter_user_id, reporter_contact, details, status, priority, created_at)
    VALUES (?,?,?,?,?,?,?,'open',?,?)`)
    .run(r.type, r.business_id || null, r.review_id || null, r.target_user_id || null, r.reporter_user_id || null,
         r.reporter_contact || '', r.details, r.priority || 'normal', now()).lastInsertRowid);
}
function allAdminReviews() {
  return db.prepare(`SELECT r.*, b.name AS biz_name, b.slug AS biz_slug, u.name AS author_name
    FROM reviews r JOIN businesses b ON b.id = r.business_id JOIN users u ON u.id = r.user_id
    ORDER BY r.hidden DESC, r.created_at DESC LIMIT 200`).all();
}
function reviewReports() {
  return db.prepare(`SELECT rp.*, u.name AS reporter_name, b.name AS biz_name, b.slug AS biz_slug
    FROM reports rp LEFT JOIN users u ON u.id = rp.reporter_user_id
    LEFT JOIN businesses b ON b.id = rp.business_id
    WHERE rp.type = 'review' ORDER BY rp.created_at DESC LIMIT 100`).all();
}
function listAppeals(status) {
  return db.prepare(`SELECT a.*, u.name AS user_name, r.title AS review_title, r.body AS review_body, b.name AS biz_name, b.slug AS biz_slug
    FROM appeals a JOIN users u ON u.id = a.user_id JOIN reviews r ON r.id = a.review_id
    JOIN businesses b ON b.id = r.business_id
    ${status ? 'WHERE a.status = ?' : ''} ORDER BY a.created_at DESC LIMIT 100`).all(...(status ? [status] : []));
}
function mergeBusinesses(fromId, intoId) {
  const from = db.prepare('SELECT * FROM businesses WHERE id = ?').get(fromId);
  const into = db.prepare('SELECT * FROM businesses WHERE id = ?').get(intoId);
  if (!from || !into || fromId === intoId) return { ok: false, error: 'invalid' };
  db.prepare(`DELETE FROM reviews WHERE business_id = ? AND user_id IN (SELECT user_id FROM reviews WHERE business_id = ?)`).run(fromId, intoId);
  db.prepare('UPDATE reviews SET business_id = ? WHERE business_id = ?').run(intoId, fromId);
  db.prepare('UPDATE claims SET business_id = ? WHERE business_id = ?').run(intoId, fromId);
  db.prepare('UPDATE verifications SET business_id = ? WHERE business_id = ?').run(intoId, fromId);
  db.prepare('UPDATE reports SET business_id = ? WHERE business_id = ?').run(intoId, fromId);
  if (from.owner_user_id && !into.owner_user_id) db.prepare('UPDATE businesses SET owner_user_id = ? WHERE id = ?').run(from.owner_user_id, intoId);
  db.prepare('DELETE FROM businesses WHERE id = ?').run(fromId);
  return { ok: true, from: from.name, into: into.name };
}
function dailyCounts(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({
      day,
      signups: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE substr(created_at,1,10) = ?`).get(day).n,
      reviews: db.prepare(`SELECT COUNT(*) AS n FROM reviews WHERE substr(created_at,1,10) = ?`).get(day).n,
      businesses: db.prepare(`SELECT COUNT(*) AS n FROM businesses WHERE substr(created_at,1,10) = ?`).get(day).n,
    });
  }
  return out;
}
function settingGet(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
function settingSet(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
function listCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY name').all();
}
function saveReceipt(reviewId, data, ext) {
  const dir = path.join(DATA_DIR, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const rel = 'receipt-' + reviewId + '.' + ext;
  fs.writeFileSync(path.join(dir, rel), data);
  db.prepare('UPDATE reviews SET receipt_path = ? WHERE id = ?').run('uploads/' + rel, reviewId);
}
function receiptFile(reviewId) {
  const r = db.prepare('SELECT receipt_path FROM reviews WHERE id = ?').get(reviewId);
  if (!r || !r.receipt_path) return null;
  const p = path.join(DATA_DIR, r.receipt_path);
  try { return { data: fs.readFileSync(p), mime: r.receipt_path.endsWith('.png') ? 'image/png' : r.receipt_path.endsWith('.webp') ? 'image/webp' : 'image/jpeg' }; }
  catch { return null; }
}
function savePhoto(reviewId, data, ext) {
  const dir = path.join(DATA_DIR, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const rel = 'photo-' + reviewId + '.' + ext;
  fs.writeFileSync(path.join(dir, rel), data);
  db.prepare('UPDATE reviews SET photo_path = ? WHERE id = ?').run('uploads/' + rel, reviewId);
}
function photoFile(reviewId) {
  const r = db.prepare('SELECT photo_path, hidden FROM reviews WHERE id = ?').get(reviewId);
  if (!r || !r.photo_path || r.hidden) return null;
  try { return { data: fs.readFileSync(path.join(DATA_DIR, r.photo_path)), mime: r.photo_path.endsWith('.png') ? 'image/png' : r.photo_path.endsWith('.webp') ? 'image/webp' : 'image/jpeg' }; }
  catch { return null; }
}
// auto-flagging: returns list of reasons a review text is suspicious
const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'idiot', 'stupid fool'];
const SPAM_PATTERNS = [
  [/\b\+?2[5-7]\d{8,12}\b/, 'contains a phone number'],
  [/\b(whatsapp|whats\s?app)\b[\s\S]{0,40}\b(me|us|now|today)\b/i, 'asks readers to move off-platform'],
  [/\b(dm|inbox|call)\s+(me|us|now)\b/i, 'off-platform solicitation'],
  [/\bfollow\b[\s\S]{0,30}\b(instagram|facebook|tiktok|snapchat)\b/i, 'social media promotion'],
  [/\b(buy|order|shop)\s+(from|at)\s+\w+\s+(now|today)\b/i, 'promotional language'],
];
function autoFlagReasons(title, text) {
  const raw = (title + ' ' + text).trim();
  const lower = raw.toLowerCase();
  const reasons = [];
  PROFANITY.forEach(w => { if (lower.includes(w)) { reasons.push('profanity'); return false; } });
  SPAM_PATTERNS.forEach(([re, why]) => { if (re.test(raw)) reasons.push(why); });
  const letters = raw.replace(/[^a-z]/gi, '');
  if (raw.length > 40 && letters.length > 30) {
    const caps = raw.replace(/[^A-Z]/g, '').length;
    if (caps / letters.length > 0.75) reasons.push('excessive capitals');
  }
  if (/(.)\1{6,}/.test(raw)) reasons.push('repeated characters');
  return [...new Set(reasons)];
}
function findBusinessDuplicates(name, city) {
  const norm = x => String(x).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = norm(name).split(' ').filter(w => w.length > 2);
  const rows = db.prepare(`SELECT id, name, slug, city FROM businesses WHERE status='active' LIMIT 500`).all();
  return rows.map(b => {
    const bt = norm(b.name).split(' ').filter(w => w.length > 2);
    const shared = tokens.filter(w => bt.includes(w)).length;
    const score = (tokens.length && bt.length) ? shared / Math.min(tokens.length, bt.length) : 0;
    const bonus = (norm(city) && norm(city) === norm(b.city)) ? 0.2 : 0;
    return { b, score: score + bonus };
  }).filter(x => x.score >= 0.6).sort((a, b2) => b2.score - a.score).slice(0, 3).map(x => x.b);
}
function myAppealFor(reviewId) {
  return db.prepare(`SELECT * FROM appeals WHERE review_id = ? ORDER BY created_at DESC LIMIT 1`).get(reviewId);
}

module.exports = {
  db, init, now, hashPassword, verifyPassword, slugify, uniqueSlug,
  getBusinessBySlug, getBusinessById, searchBusinesses, topBusinesses,
  reviewsForBusiness, ratingDistribution, myReview, userReviews,
  ownedBusinesses, platformStats,
  audit, adminStats, recentActivity, listUsers, listReports, getReport, reportsForBusiness,
  addReport, allAdminReviews, reviewReports, listAppeals, mergeBusinesses, dailyCounts,
  settingGet, settingSet, listCategories, myAppealFor, saveReceipt, receiptFile, findBusinessDuplicates,
  savePhoto, photoFile, autoFlagReasons,
};
