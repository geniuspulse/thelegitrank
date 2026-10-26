// server.js — The Legit Rank platform (pure Node, zero dependencies)
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dbm = require('./db');
const views = require('./views');

const PORT = Number(process.env.PORT) || 80;
const HOST = '0.0.0.0';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('[warn] SESSION_SECRET not set — sessions reset on restart');

dbm.init();

// ---------- helpers ----------
function nowIso() { return new Date().toISOString(); }
function esc(s) { return require('./i18n').esc(s); }

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (!h) return out;
  h.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// signed session token: uid.exp.hmac
function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
function makeToken(uid) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const payload = `${uid}.${exp}`;
  return `${payload}.${sign(payload)}`;
}
function tokenUid(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  if (sign(`${uid}.${exp}`) !== sig) return null;
  if (Number(exp) < Date.now()) return null;
  const n = Number(uid);
  if (!Number.isInteger(n)) return null;
  return n;
}

function currentUser(req) {
  const uid = tokenUid(parseCookies(req).lr_sess);
  if (!uid) return null;
  return dbm.db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(uid) || null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 100 * 1024) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const params = {};
      new URLSearchParams(chunks.join('')).forEach((v, k) => { params[k] = v; });
      resolve(params);
    });
    req.on('error', reject);
  });
}

// tiny rate limiter (per IP, per minute)
const hits = new Map();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, v] of hits) if (v.reset < cutoff) hits.delete(k);
}, 30_000).unref();
function rateLimited(key, max) {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now - 60_000) h = { n: 0, reset: now };
  h.n++;
  hits.set(key, h);
  return h.n > max;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-origin-when-cross-origin',
    'Cache-Control': 'no-cache',
    ...headers,
  });
  res.end(body);
}
function html(res, code, body, extraCookies) {
  const cookies = extraCookies ? { 'Set-Cookie': extraCookies } : {};
  send(res, code, body, cookies);
}
function redirect(res, loc, extraCookies) {
  const headers = { Location: loc };
  if (extraCookies) headers['Set-Cookie'] = extraCookies;
  res.writeHead(302, headers);
  res.end();
}

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serveStatic(req, res, file) {
  const p = path.join(__dirname, 'public', file);
  if (!p.startsWith(path.join(__dirname, 'public'))) return send(res, 404, 'Not found');
  fs.readFile(p, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const etag = '"' + crypto.createHash('sha1').update(data).digest('hex') + '"';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304); return res.end(); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(p)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'ETag': etag,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  });
}

// ---------- middleware-ish ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const pathname = decodeURIComponent(url.pathname);
  const q = url.searchParams;
  const method = req.method;

  // security: same-origin for POSTs
  if (method === 'POST' && req.headers.origin) {
    try {
      const o = new URL(req.headers.origin);
      if (o.host !== req.headers.host) return send(res, 403, 'Forbidden');
    } catch { return send(res, 403, 'Forbidden'); }
  }
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
  if (method === 'POST' && rateLimited(ip, 60)) return send(res, 429, 'Too many requests');

  if (method === 'GET' || method === 'HEAD') {
    if (pathname === '/style.css') return serveStatic(req, res, 'style.css');
    if (pathname === '/app.js') return serveStatic(req, res, 'app.js');
    if (pathname === '/favicon.ico') return send(res, 204, '');
  }

  const user = currentUser(req);

  // ---------- public GET routes ----------
  if (method === 'GET') {
    if (pathname === '/') {
      return html(res, 200, views.home({ user, stats: dbm.platformStats(), top: dbm.topBusinesses(6) }));
    }

    if (pathname === '/search') {
      const q_ = (q.get('q') || '').slice(0, 80);
      const cat = (q.get('category') || '').slice(0, 40);
      const results = dbm.searchBusinesses(q_, cat || null);
      return html(res, 200, views.searchPage({ user, q: q_, category: cat, results, msg: q.get('msg') }));
    }

    let m = pathname.match(/^\/business\/([a-z0-9-]+)$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      const page = Math.max(1, parseInt(q.get('page'), 10) || 1);
      const per = 10;
      const reviews = dbm.reviewsForBusiness(b.id, per, (page - 1) * per);
      const pages = Math.max(1, Math.ceil(b.review_count / per));
      const myRev = user ? dbm.myReview(b.id, user.id) : null;
      return html(res, 200, views.businessPage({
        user, b, reviews, dist: dbm.ratingDistribution(b.id),
        page, pages, myRev, alreadyReviewed: !!myRev, msg: q.get('msg'),
      }));
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/review$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/business/${m[1]}/review`);
      const existing = dbm.myReview(b.id, user.id);
      const qRating = Math.min(5, Math.max(1, parseInt(q.get('rating'), 10) || 0));
      return html(res, 200, views.reviewForm({
        user, b,
        existing: existing || (qRating ? { rating: qRating, title: '', body: '' } : null),
      }));
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/verify$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/business/${m[1]}/verify`);
      if (b.owner_user_id !== user.id && user.role !== 'admin')
        return redirect(res, `/business/${m[1]}`);
      const pending = dbm.db.prepare(
        `SELECT 1 AS x FROM verifications WHERE business_id = ? AND status = 'pending'`).get(b.id);
      return html(res, 200, views.verifyPage({ user, b, pending: !!pending }));
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/manage$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/business/${m[1]}/manage`);
      if (b.owner_user_id !== user.id && user.role !== 'admin')
        return redirect(res, `/business/${m[1]}`);
      const reviews = dbm.db.prepare(`
        SELECT r.*, u.name AS author_name FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.business_id = ? AND r.hidden = 0 ORDER BY r.created_at DESC`).all(b.id);
      return html(res, 200, views.bizManagePage({ user, b, reviews }));
    }

    if (pathname === '/businesses/new') {
      if (!user) return redirect(res, '/login?next=/businesses/new');
      return html(res, 200, views.addBizPage({ user, values: { name: q.get('name') || '' } }));
    }

    m = pathname.match(/^\/claim\/([a-z0-9-]+)$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/claim/${m[1]}`);
      return html(res, 200, views.claimPage({ user, b }));
    }

    if (pathname === '/login') {
      if (user) return redirect(res, '/dashboard');
      return html(res, 200, views.loginPage({ next: q.get('next') || '' }));
    }
    if (pathname === '/signup') {
      if (user) return redirect(res, '/dashboard');
      return html(res, 200, views.signupPage({}));
    }

    if (pathname === '/dashboard') {
      if (!user) return redirect(res, '/login?next=/dashboard');
      const owned = dbm.ownedBusinesses(user.id);
      const pendingRows = dbm.db.prepare(
        `SELECT business_id FROM verifications WHERE status='pending' AND user_id = ?`).all(user.id);
      const pendingV = {};
      pendingRows.forEach(r => { pendingV[r.business_id] = 1; });
      return html(res, 200, views.dashboard({
        user, reviews: dbm.userReviews(user.id), owned, pendingV, msg: q.get('msg'),
      }));
    }

    if (pathname === '/admin') {
      if (!user || user.role !== 'admin') return html(res, 404, views.notFound({ user }));
      const tab = ['verifications', 'claims', 'businesses', 'reviews'].includes(q.get('tab')) ? q.get('tab') : 'verifications';
      const vers = dbm.db.prepare(`
        SELECT v.*, b.name AS biz_name, u.name AS user_name FROM verifications v
        JOIN businesses b ON b.id = v.business_id JOIN users u ON u.id = v.user_id
        WHERE v.status = 'pending' ORDER BY v.created_at ASC LIMIT 100`).all();
      const claims = dbm.db.prepare(`
        SELECT c.*, b.name AS biz_name, u.name AS user_name FROM claims c
        JOIN businesses b ON b.id = c.business_id JOIN users u ON u.id = c.user_id
        WHERE c.status = 'pending' ORDER BY c.created_at ASC LIMIT 100`).all();
      const bizs = dbm.db.prepare(`
        SELECT b.*, (SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.business_id=b.id AND r.hidden=0) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.business_id=b.id AND r.hidden=0) AS review_count
        FROM businesses b ORDER BY b.created_at DESC LIMIT 100`).all();
      const revs = dbm.db.prepare(`
        SELECT r.*, b.name AS biz_name, b.slug AS biz_slug, u.name AS author_name
        FROM reviews r JOIN businesses b ON b.id = r.business_id JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC LIMIT 100`).all();
      return html(res, 200, views.adminPage({ user, vers, claims, bizs, revs, tab, msg: q.get('msg') }));
    }

    return html(res, 404, views.notFound({ user }));
  }

  // ---------- POST routes ----------
  if (method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { return send(res, 413, 'Payload too large'); }

    if (pathname === '/login' || pathname === '/signup') {
      if (rateLimited('auth:' + ip, 10)) return send(res, 429, 'Too many attempts. Try again in a minute.');
    }

    if (pathname === '/login') {
      const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
      const password = String(body.password || '');
      const row = dbm.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!row || !dbm.verifyPassword(password, row.password_hash)) {
        return html(res, 401, views.loginPage({ next: body.next || '', err: 'bad' }));
      }
      const cookie = `lr_sess=${encodeURIComponent(makeToken(row.id))}; Max-Age=${30 * 24 * 3600}; Path=/; HttpOnly; SameSite=Lax; Secure`;
      return redirect(res, (body.next && body.next.startsWith('/') && !body.next.startsWith('//')) ? body.next : '/dashboard', cookie);
    }

    if (pathname === '/signup') {
      const name = String(body.name || '').trim().slice(0, 80);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
      const password = String(body.password || '');
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
        return html(res, 400, views.signupPage({ err: 'invalid', values: { name, email } }));
      }
      const exists = dbm.db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
      if (exists) return html(res, 409, views.signupPage({ err: 'taken', values: { name, email } }));
      const r = dbm.db.prepare(
        'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,?,?)')
        .run(email, name, dbm.hashPassword(password), 'user', nowIso());
      const cookie = `lr_sess=${encodeURIComponent(makeToken(Number(r.lastInsertRowid)))}; Max-Age=${30 * 24 * 3600}; Path=/; HttpOnly; SameSite=Lax; Secure`;
      return redirect(res, '/dashboard?msg=acctCreated', cookie);
    }

    if (pathname === '/logout') {
      return redirect(res, '/', 'lr_sess=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure');
    }

    if (!user) return redirect(res, '/login');

    if (pathname === '/settings/profile') {
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) return redirect(res, '/dashboard?msg=nameMissing');
      dbm.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
      return redirect(res, '/dashboard?msg=nameUpdated');
    }
    if (pathname === '/settings/password') {
      const row = dbm.db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      const current = String(body.current || '');
      const nextPw = String(body.next || '');
      if (!dbm.verifyPassword(current, row.password_hash) || nextPw.length < 8) return redirect(res, '/dashboard?msg=passWrong');
      dbm.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(dbm.hashPassword(nextPw), user.id);
      return redirect(res, '/dashboard?msg=passUpdated');
    }

    let m = pathname.match(/^\/business\/([a-z0-9-]+)\/review$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 0));
      const title = String(body.title || '').trim().slice(0, 100);
      const text = String(body.body || '').trim().slice(0, 2000);
      if (!rating || !text) return redirect(res, `/business/${m[1]}/review`);
      const existing = dbm.myReview(b.id, user.id);
      if (existing) {
        dbm.db.prepare('UPDATE reviews SET rating=?, title=?, body=? WHERE id = ?')
          .run(rating, title, text, existing.id);
        return redirect(res, `/business/${m[1]}?msg=reviewUpdated`);
      }
      dbm.db.prepare('INSERT INTO reviews (business_id, user_id, rating, title, body, created_at) VALUES (?,?,?,?,?,?)')
        .run(b.id, user.id, rating, title, text, nowIso());
      return redirect(res, `/business/${m[1]}?msg=reviewPosted`);
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/respond\/(\d+)$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (b.owner_user_id !== user.id && user.role !== 'admin') return redirect(res, `/business/${m[1]}`);
      const text = String(body.response || '').trim().slice(0, 1000);
      if (text) {
        dbm.db.prepare('UPDATE reviews SET response_text=?, responded_at=? WHERE id=? AND business_id=?')
          .run(text, nowIso(), Number(m[2]), b.id);
      }
      return redirect(res, `/business/${m[1]}/manage?msg=respPosted`);
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/verify$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (b.owner_user_id !== user.id && user.role !== 'admin') return redirect(res, `/business/${m[1]}`);
      const idType = String(body.id_type || 'National ID').slice(0, 40);
      const idNumber = String(body.id_number || '').trim().slice(0, 60);
      const payMethod = String(body.pay_method || 'Mobile Money').slice(0, 40);
      const payName = String(body.pay_name || '').trim().slice(0, 80);
      const notes = String(body.notes || '').trim().slice(0, 500);
      if (!idNumber || !payName) return redirect(res, `/business/${m[1]}/verify`);
      dbm.db.prepare(`INSERT INTO verifications (business_id, user_id, id_type, id_number, pay_method, pay_name, notes, status, created_at)
        VALUES (?,?,?,?,?,?,?,'pending',?)`)
        .run(b.id, user.id, idType, idNumber, payMethod, payName, notes, nowIso());
      return redirect(res, `/dashboard?msg=verSent`);
    }

    if (pathname === '/businesses/new') {
      const name = String(body.name || '').trim().slice(0, 100);
      const category = CATEGORIES.includes(body.category) ? body.category : 'Other';
      const city = String(body.city || '').trim().slice(0, 60);
      const country = COUNTRIES.includes(body.country) ? body.country : 'Malawi';
      const description = String(body.description || '').trim().slice(0, 500);
      const website = String(body.website || '').trim().slice(0, 200);
      const phone = String(body.phone || '').trim().slice(0, 30);
      if (!name || !city) return html(res, 400, views.addBizPage({ user, err: 'invalid', values: body }));
      const similar = dbm.db.prepare(
        `SELECT 1 FROM businesses WHERE LOWER(name) = ? AND status='active'`).get(name.toLowerCase());
      if (similar) return html(res, 409, views.addBizPage({ user, err: 'exists', values: body }));
      let websiteSafe = '';
      if (website && /^https?:\/\//i.test(website)) websiteSafe = website;
      const slug = dbm.uniqueSlug(name);
      dbm.db.prepare(`INSERT INTO businesses (slug, name, category, city, country, description, website, phone, created_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, name, category, city, country, description, websiteSafe, phone, user.id, nowIso());
      return redirect(res, `/business/${slug}?msg=bizAdded`);
    }

    m = pathname.match(/^\/claim\/([a-z0-9-]+)$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      const details = String(body.details || '').trim().slice(0, 1000);
      const contact = String(body.contact || '').trim().slice(0, 120);
      if (!details || !contact) return html(res, 400, views.claimPage({ user, b, err: 'invalid' }));
      if (!b.owner_user_id) {
        const dup = dbm.db.prepare(
          `SELECT 1 FROM claims WHERE business_id = ? AND status='pending'`).get(b.id);
        if (!dup) {
          dbm.db.prepare(`INSERT INTO claims (business_id, user_id, details, contact, status, created_at)
            VALUES (?,?,?,?,'pending',?)`).run(b.id, user.id, details, contact, nowIso());
        }
      }
      return redirect(res, `/business/${m[1]}?msg=claimSent`);
    }

    // ---- admin actions ----
    if (user.role === 'admin') {
      m = pathname.match(/^\/admin\/verification\/(\d+)$/);
      if (m) {
        const v = dbm.db.prepare('SELECT * FROM verifications WHERE id = ?').get(Number(m[1]));
        if (v) {
          if (body.decision === 'approve') {
            dbm.db.prepare(`UPDATE verifications SET status='approved', decided_at=? WHERE id=?`).run(nowIso(), v.id);
            dbm.db.prepare(`UPDATE businesses SET verified=1, verified_at=? WHERE id=?`).run(nowIso(), v.business_id);
          } else {
            dbm.db.prepare(`UPDATE verifications SET status='rejected', decided_at=? WHERE id=?`).run(nowIso(), v.id);
          }
        }
        return redirect(res, '/admin?tab=verifications&msg=' + (body.decision === 'approve' ? 'approved' : 'rejected'));
      }
      m = pathname.match(/^\/admin\/claim\/(\d+)$/);
      if (m) {
        const c = dbm.db.prepare('SELECT * FROM claims WHERE id = ?').get(Number(m[1]));
        if (c) {
          if (body.decision === 'approve') {
            dbm.db.prepare(`UPDATE claims SET status='approved' WHERE id=?`).run(c.id);
            dbm.db.prepare(`UPDATE businesses SET owner_user_id=? WHERE id=?`).run(c.user_id, c.business_id);
            dbm.db.prepare(`UPDATE users SET role='owner' WHERE id=? AND role='user'`).run(c.user_id);
          } else {
            dbm.db.prepare(`UPDATE claims SET status='rejected' WHERE id=?`).run(c.id);
          }
        }
        return redirect(res, '/admin?tab=claims&msg=' + (body.decision === 'approve' ? 'approved' : 'rejected'));
      }
      m = pathname.match(/^\/admin\/business\/(\d+)\/verify$/);
      if (m) {
        dbm.db.prepare(`UPDATE businesses SET verified=1, verified_at=? WHERE id=?`).run(nowIso(), Number(m[1]));
        return redirect(res, '/admin?tab=businesses&msg=approved');
      }
      m = pathname.match(/^\/admin\/business\/(\d+)\/(remove|restore)$/);
      if (m) {
        const status = m[2] === 'remove' ? 'removed' : 'active';
        dbm.db.prepare('UPDATE businesses SET status=? WHERE id=?').run(status, Number(m[1]));
        return redirect(res, '/admin?tab=businesses');
      }
      m = pathname.match(/^\/admin\/review\/(\d+)\/(hide|show)$/);
      if (m) {
        dbm.db.prepare('UPDATE reviews SET hidden=? WHERE id=?').run(m[2] === 'hide' ? 1 : 0, Number(m[1]));
        return redirect(res, '/admin?tab=reviews');
      }
    }
  }

  return html(res, 404, views.notFound({ user }));
}

const CATEGORIES = ['Fashion','Electronics','Home & Living','Food & Restaurant','Beauty','Services','Education','Retail','Travel','Transport','Health','Other'];
const COUNTRIES = ['Malawi','Zambia','Zimbabwe','Tanzania','Kenya','Nigeria','Ghana','Rwanda','Uganda','South Africa','Mozambique','Botswana','Namibia','Cameroon','Ivory Coast','Senegal','Ethiopia','Other'];

http.createServer((req, res) => {
  handle(req, res).catch(err => {
    console.error('[error]', err);
    try { send(res, 500, 'Internal server error'); } catch {}
  });
}).listen(PORT, HOST, () => console.log(`[legitrank] listening on ${HOST}:${PORT}`));
