// server.js — The Legit Rank platform (pure Node, zero dependencies)
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dbm = require('./db');
const SEO = require('./seo');
const views = require('./views');

const PORT = Number(process.env.PORT) || 80;
const HOST = '0.0.0.0';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const googleOn = () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
function publicBase(req) {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = /^(localhost|127\.)/.test(host) ? 'http' : 'https';
  return `${proto}://${host}`;
}
function safeNext(n) {
  const v = String(n || '');
  return v.startsWith('/') && !v.startsWith('//') ? v : '';
}
if (!process.env.SESSION_SECRET) console.warn('[warn] SESSION_SECRET not set — sessions reset on restart');

dbm.init();

// ---------- helpers ----------
function canEditBiz(user, b) {
  if (!user || !b) return false;
  if (user.role === 'admin') return true;
  return b.owner_user_id === user.id || b.created_by === user.id;
}

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
  return dbm.db.prepare('SELECT id, email, name, role, status, created_at FROM users WHERE id = ?').get(uid) || null;
}

const ADM_ALLOWED = {
  overview: ['admin', 'moderator'], businesses: ['admin'], verifications: ['admin', 'moderator'],
  moderation: ['admin', 'moderator'], reports: ['admin', 'moderator'], users: ['admin'],
  settings: ['admin'], analytics: ['admin'], audit: ['admin'],
};
function admAllow(u, section) { return !!(u && ADM_ALLOWED[section] && ADM_ALLOWED[section].includes(u.role)); }

function parseMultipart(buf, boundary) {
  const out = {};
  const delim = Buffer.from('--' + boundary);
  let pos = buf.indexOf(delim);
  while (pos !== -1) {
    let start = pos + delim.length;
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break;
    while (buf[start] === 0x0d || buf[start] === 0x0a) start++;
    const headEnd = buf.indexOf('\r\n\r\n', start);
    if (headEnd === -1) break;
    const head = buf.slice(start, headEnd).toString('utf8');
    let next = buf.indexOf(delim, headEnd + 4);
    const bodyEnd = next === -1 ? buf.length : next - 2;
    const body = buf.slice(headEnd + 4, bodyEnd);
    const nm = head.match(/name="([^"]+)"/);
    const fn = head.match(/filename="([^"]*)"/);
    if (nm) {
      if (fn && fn[1]) {
        const cm = head.match(/content-type:\s*([^\r\n]+)/i);
        out[nm[1]] = { __file: true, filename: fn[1].replace(/.*[\/\\]/, ''), mime: cm ? cm[1].trim().toLowerCase() : 'application/octet-stream', data: body };
      } else out[nm[1]] = body.toString('utf8');
    }
    pos = next;
  }
  return out;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 3 * 1024 * 1024) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ctype = req.headers['content-type'] || '';
      if (ctype.startsWith('multipart/form-data')) {
        const bm = ctype.match(/boundary=(.+)$/);
        if (bm) { try { resolve(parseMultipart(buf, bm[1].trim().replace(/^"|"$/g, ''))); return; } catch (e) { reject(e); return; } }
      }
      const params = {};
      new URLSearchParams(buf.toString('utf8')).forEach((v, k) => { params[k] = v; });
      resolve(params);
    });
    req.on('error', reject);
  });
}

function imageExt(data, mime) {
  if (!data || data.length < 12) return null;
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg';
  if (data.slice(0, 4).toString('ascii') === 'RIFF' && data.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}
const isImageFile = (f, maxBytes) => f && f.__file && f.data && f.data.length > 0 &&
  /^image\/(png|jpe?g|webp)$/.test(f.mime) && f.data.length <= maxBytes && !!imageExt(f.data, f.mime);

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
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",    'Cache-Control': 'no-cache',
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

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
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
          'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
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
    if (pathname === '/og-default.jpg') return serveStatic(req, res, 'og-default.jpg');
    if (pathname === '/robots.txt') {
      const body = ['User-agent: *', 'Allow: /',
        'Disallow: /admin', 'Disallow: /dashboard', 'Disallow: /businesses/new',
        'Disallow: /claim/', 'Disallow: /verify/', 'Disallow: /report',
        'Disallow: /review/', 'Disallow: /login', 'Disallow: /signup', 'Disallow: /auth/',
        '', 'Sitemap: ' + SEO.SITE + '/sitemap.xml', ''].join('\n');
      return send(res, 200, body, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    if (pathname === '/favicon.ico') return send(res, 204, '');
  }

  const user = currentUser(req);

  // ---------- public GET routes ----------
  if (method === 'GET') {
    if (pathname === '/') {
      return html(res, 200, views.home({ user, stats: dbm.platformStats(), top: dbm.topBusinesses(6), msg: q.get('msg') }));
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
      if (user) { const voted = new Set(dbm.db.prepare('SELECT review_id FROM review_helpful_votes WHERE user_id = ?').all(user.id).map(x => x.review_id)); reviews.forEach(r => { r.helpful_by_me = voted.has(r.id); }); }
      const pages = Math.max(1, Math.ceil(b.review_count / per));
      const myRev = user ? dbm.myReview(b.id, user.id) : null;
      return html(res, 200, views.businessPage({
        user, b, reviews, dist: dbm.ratingDistribution(b.id),
        page, pages, myRev, alreadyReviewed: !!myRev, msg: q.get('msg'),
        canEdit: canEditBiz(user, b),
      }));
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/review$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/signup?next=${encodeURIComponent('/business/' + m[1] + '/review')}`);
      if (b.owner_user_id === user.id) return redirect(res, `/business/${m[1]}?msg=ownBiz`);
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

    m = pathname.match(/^\/review\/(\d+)\/delete$/);
    if (m) {
      const r = dbm.db.prepare(`SELECT r.*, b.slug AS biz_slug, b.name AS biz_name
        FROM reviews r JOIN businesses b ON b.id = r.business_id WHERE r.id = ?`).get(Number(m[1]));
      if (!r) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/review/${r.id}/delete`);
      if (r.user_id !== user.id && user.role !== 'admin') return redirect(res, '/dashboard');
      return html(res, 200, views.deleteReviewPage({ user, r }));
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/manage$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/business/${m[1]}/manage`);
      if (!canEditBiz(user, b)) return redirect(res, `/business/${m[1]}?msg=noPerm`);
      const reviews = dbm.db.prepare(`
        SELECT r.*, u.name AS author_name FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.business_id = ? AND r.hidden = 0 ORDER BY r.created_at DESC`).all(b.id);
      const verif = dbm.db.prepare(
        `SELECT status, created_at, decided_at, admin_note, expires_at FROM verifications
         WHERE business_id = ? ORDER BY created_at DESC LIMIT 1`).get(b.id) || null;
      return html(res, 200, views.bizManagePage({ user, b, reviews, verif, msg: q.get('msg') }));
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

    if (pathname === '/auth/google') {
      if (user) return redirect(res, safeNext(q.get('next')) || '/dashboard');
      if (!googleOn()) return redirect(res, '/login?msg=googleOff');
      const state = crypto.randomBytes(18).toString('hex');
      const next = safeNext(q.get('next'));
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: publicBase(req) + '/auth/google/callback',
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
      });
      return redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(),
        `lr_oauth=${state}.${encodeURIComponent(next)}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax; Secure`);
    }

    if (pathname === '/auth/google/callback') {
      const cookieHdr = req.headers.cookie || '';
      const cm = cookieHdr.match(/(?:^|;\s*)lr_oauth=([^;]+)/);
      const store = cm ? decodeURIComponent(cm[1]) : '';
      const [savedState, savedNext] = store.split('.');
      const next = safeNext(decodeURIComponent(savedNext || ''));
      const clearCookie = 'lr_oauth=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure';
      if (q.get('error') || !q.get('code') || !savedState || q.get('state') !== savedState) {
        return redirect(res, '/login?msg=googleFail', clearCookie);
      }
      try {
        const tokRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: q.get('code'),
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: publicBase(req) + '/auth/google/callback',
            grant_type: 'authorization_code',
          }).toString(),
        });
        const tok = await tokRes.json();
        if (!tok.access_token) return redirect(res, '/login?msg=googleFail', clearCookie);
        const ui = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: 'Bearer ' + tok.access_token },
        }).then(r => r.json());
        const email = String(ui.email || '').trim().toLowerCase();
        if (!email || ui.email_verified === false) return redirect(res, '/login?msg=googleFail', clearCookie);
        let row = dbm.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        let fresh = false;
        if (row && row.status === 'suspended') return redirect(res, '/login?msg=googleSuspended', clearCookie);
        if (!row) {
          const name = String(ui.name || email.split('@')[0]).slice(0, 80);
          const r = dbm.db.prepare(
            'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,?,?)')
            .run(email, name, dbm.hashPassword(crypto.randomBytes(24).toString('hex')), 'user', nowIso());
          row = dbm.db.prepare('SELECT * FROM users WHERE id = ?').get(Number(r.lastInsertRowid));
          fresh = true;
          dbm.audit(row, 'user.googleSignup', 'user', row.id, email);
        } else {
          dbm.audit(row, 'user.googleLogin', 'user', row.id, email);
        }
        const cookie = `lr_sess=${encodeURIComponent(makeToken(row.id))}; Max-Age=${30 * 24 * 3600}; Path=/; HttpOnly; SameSite=Lax; Secure`;
        return redirect(res, next || (fresh ? '/dashboard?msg=acctCreated' : '/dashboard'), cookie);
      } catch (e) {
        console.error('[google]', e && e.message);
        return redirect(res, '/login?msg=googleFail', clearCookie);
      }
    }

    if (pathname === '/login') {
      if (user) return redirect(res, '/dashboard');
      return html(res, 200, views.loginPage({ next: q.get('next') || '', google: googleOn(), msg: q.get('msg') || '' }));
    }
    if (pathname === '/signup') {
      if (user) return redirect(res, '/dashboard');
      return html(res, 200, views.signupPage({ next: q.get('next') || '', google: googleOn() }));
    }

    if (pathname === '/dashboard') {
      if (!user) return redirect(res, '/login?next=/dashboard');
      const owned = dbm.ownedBusinesses(user.id);
      const pendingRows = dbm.db.prepare(
        `SELECT business_id FROM verifications WHERE status='pending' AND user_id = ?`).all(user.id);
      const pendingV = {};
      pendingRows.forEach(r => { pendingV[r.business_id] = 1; });
      const hidden = dbm.db.prepare(`SELECT r.*, b.name AS biz_name, b.slug AS biz_slug
        FROM reviews r JOIN businesses b ON b.id = r.business_id
        WHERE r.user_id = ? AND r.hidden = 1 ORDER BY r.hidden_at DESC`).all(user.id);
      const appeals = {};
      dbm.db.prepare('SELECT review_id, status FROM appeals WHERE user_id = ? ORDER BY created_at DESC').all(user.id)
        .forEach(a => { if (!(a.review_id in appeals)) appeals[a.review_id] = a; });
      return html(res, 200, views.dashboard({
        user, reviews: dbm.userReviews(user.id), owned, pendingV, hidden, appeals,
        responseNeeded: dbm.reviewsNeedingOwnerResponse(user.id), msg: q.get('msg'),
      }));
    }

    // ---------- ADMIN CONTROL CENTRE (GET) ----------
    if (pathname === '/admin' || pathname === '/admin/overview') {
      if (!admAllow(user, 'overview')) return html(res, 404, views.notFound({ user }));
      return html(res, 200, views.adminOverview({ user, stats: dbm.adminStats(), activity: dbm.recentActivity(12), msg: q.get('msg') }));
    }
    if (pathname === '/admin/businesses') {
      if (!admAllow(user, 'businesses')) return html(res, 404, views.notFound({ user }));
      const like = '%' + String(q.get('q') || '').toLowerCase() + '%';
      const bizs = q.get('q')
        ? dbm.db.prepare(`SELECT b.*, (SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.business_id=b.id AND r.hidden=0) AS avg_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.business_id=b.id AND r.hidden=0) AS review_count
            FROM businesses b WHERE LOWER(b.name) LIKE ? OR LOWER(b.city) LIKE ? OR LOWER(b.category) LIKE ? ORDER BY b.created_at DESC LIMIT 100`)
            .all(like, like, like)
        : dbm.db.prepare(`SELECT b.*, (SELECT ROUND(AVG(r.rating),1) FROM reviews r WHERE r.business_id=b.id AND r.hidden=0) AS avg_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.business_id=b.id AND r.hidden=0) AS review_count
            FROM businesses b ORDER BY b.created_at DESC LIMIT 100`).all();
      return html(res, 200, views.adminBusinesses({ user, businesses: bizs, qq: q.get('q'), msg: q.get('msg') }));
    }
    m = pathname.match(/^\/admin\/business\/(\d+)$/);
    if (m) {
      if (!admAllow(user, 'businesses')) return html(res, 404, views.notFound({ user }));
      const b = dbm.getBusinessById(Number(m[1]));
      if (!b) return html(res, 404, views.notFound({ user }));
      const reviews = dbm.db.prepare(`SELECT r.*, u.name AS author_name FROM reviews r
        JOIN users u ON u.id = r.user_id WHERE r.business_id = ? ORDER BY r.created_at DESC LIMIT 200`).all(b.id);
      const others = dbm.db.prepare('SELECT id, name, city FROM businesses WHERE id != ? ORDER BY name LIMIT 100').all(b.id);
      return html(res, 200, views.adminBusinessDetail({ user, b, reviews, others, msg: q.get('msg') }));
    }
    if (pathname === '/admin/verifications') {
      if (!admAllow(user, 'verifications')) return html(res, 404, views.notFound({ user }));
      const pending = dbm.db.prepare(`SELECT v.*, b.name AS biz_name, u.name AS user_name FROM verifications v
        JOIN businesses b ON b.id = v.business_id JOIN users u ON u.id = v.user_id
        WHERE v.status IN ('pending','docs_requested') ORDER BY v.created_at ASC LIMIT 100`).all();
      const decided = dbm.db.prepare(`SELECT v.*, b.name AS biz_name, u.name AS user_name FROM verifications v
        JOIN businesses b ON b.id = v.business_id JOIN users u ON u.id = v.user_id
        WHERE v.status IN ('approved','rejected') ORDER BY v.decided_at DESC LIMIT 100`).all();
      const claims = dbm.db.prepare(`SELECT c.*, b.name AS biz_name, u.name AS user_name FROM claims c
        JOIN businesses b ON b.id = c.business_id JOIN users u ON u.id = c.user_id
        WHERE c.status = 'pending' ORDER BY c.created_at ASC LIMIT 100`).all();
      return html(res, 200, views.adminVerifications({ user, pending, decided, claims, msg: q.get('msg') }));
    }
    if (pathname === '/admin/moderation') {
      if (!admAllow(user, 'moderation')) return html(res, 404, views.notFound({ user }));
      const hiddenReviews = dbm.db.prepare(`SELECT r.*, u.name AS author_name, b.name AS biz_name, b.slug AS biz_slug
        FROM reviews r JOIN users u ON u.id = r.user_id JOIN businesses b ON b.id = r.business_id
        WHERE r.hidden = 1 ORDER BY r.hidden_at DESC LIMIT 100`).all();
      return html(res, 200, views.adminModeration({ user, reports: dbm.reviewReports(), hiddenReviews,
        appeals: dbm.listAppeals('pending'), msg: q.get('msg') }));
    }
    if (pathname === '/admin/reports') {
      if (!admAllow(user, 'reports')) return html(res, 404, views.notFound({ user }));
      const status = ['open', 'investigating', 'resolved', 'dismissed', 'all'].includes(q.get('status')) ? q.get('status') : 'open';
      return html(res, 200, views.adminReports({ user, reports: dbm.listReports(status), status, msg: q.get('msg') }));
    }
    m = pathname.match(/^\/admin\/report\/(\d+)$/);
    if (m) {
      if (!admAllow(user, 'reports')) return html(res, 404, views.notFound({ user }));
      const report = dbm.getReport(Number(m[1]));
      if (!report) return html(res, 404, views.notFound({ user }));
      return html(res, 200, views.adminReportCase({ user, report, related: dbm.reportsForBusiness(report.business_id, report.id), msg: q.get('msg') }));
    }
    if (pathname === '/admin/users') {
      if (!admAllow(user, 'users')) return html(res, 404, views.notFound({ user }));
      return html(res, 200, views.adminUsers({ user, users: dbm.listUsers(q.get('q')), qq: q.get('q'), msg: q.get('msg') }));
    }
    if (pathname === '/admin/settings') {
      if (!admAllow(user, 'settings')) return html(res, 404, views.notFound({ user }));
      return html(res, 200, views.adminSettings({ user, categories: dbm.listCategories(), reviewMin: dbm.settingGet('review_min_length', 20), msg: q.get('msg') }));
    }
    if (pathname === '/admin/analytics') {
      if (!admAllow(user, 'analytics')) return html(res, 404, views.notFound({ user }));
      const verTotals = {
        total: dbm.db.prepare('SELECT COUNT(*) AS n FROM verifications').get().n,
        approved: dbm.db.prepare(`SELECT COUNT(*) AS n FROM verifications WHERE status='approved'`).get().n,
      };
      return html(res, 200, views.adminAnalytics({ user, stats: dbm.adminStats(), daily: dbm.dailyCounts(14), verTotals, msg: q.get('msg') }));
    }
    if (pathname === '/admin/audit') {
      if (!admAllow(user, 'audit')) return html(res, 404, views.notFound({ user }));
      const entries = dbm.db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all();
      return html(res, 200, views.adminAudit({ user, entries, msg: q.get('msg') }));
    }

    m = pathname.match(/^\/logo\/(\d+)$/);
    if (m) {
      const f = dbm.bizLogoFile(Number(m[1]));
      if (!f) return send(res, 404, 'Not found');
      res.writeHead(200, { 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=86400' });
      return res.end(f.data);
    }
    m = pathname.match(/^\/photo\/(\d+)$/);
    if (m) {
      const f = dbm.photoFile(Number(m[1]));
      if (!f) return send(res, 404, 'Not found');
      res.writeHead(200, { 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=86400' });
      return res.end(f.data);
    }
    m = pathname.match(/^\/admin\/review\/(\d+)\/receipt$/);
    if (m) {
      if (!admAllow(user, 'moderation')) return send(res, 404, 'Not found');
      const f = dbm.receiptFile(Number(m[1]));
      if (!f) return send(res, 404, 'Not found');
      res.writeHead(200, { 'Content-Type': f.mime, 'Cache-Control': 'no-store' });
      return res.end(f.data);
    }

    if (pathname === '/terms') return html(res, 200, views.termsPage());
    if (pathname === '/privacy') return html(res, 200, views.privacyPage());
    if (pathname === '/cookies') return html(res, 200, views.cookiesPage());
    if (pathname === '/health') return send(res, 200, 'ok');

    if (pathname === '/sitemap.xml') {
      const biz = dbm.db.prepare(`SELECT slug, created_at FROM businesses WHERE status='active' ORDER BY id DESC LIMIT 5000`).all();
      const cats = dbm.db.prepare(`SELECT category, COUNT(*) AS n FROM businesses WHERE status='active' GROUP BY category HAVING n > 0`).all();
      const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const entry = (p, lastmod, priority) => `<url><loc>${esc(SEO.SITE + p)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${priority}</priority></url>`;
      const today = new Date().toISOString().slice(0, 10);
      const urls = [entry('/', today, '1.0'), entry('/search', today, '0.8')]
        .concat(cats.map(c => entry(`/search?category=${encodeURIComponent(c.category)}`, today, '0.7')))
        .concat([entry('/terms', today, '0.3'), entry('/privacy', today, '0.3'), entry('/cookies', today, '0.3')])
        .concat(biz.map(b => entry('/business/' + b.slug, (b.created_at || '').slice(0, 10) || undefined, '0.9')))
        .join('');
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        { 'Content-Type': 'application/xml; charset=utf-8' });
    }

    // ---------- PUBLIC: report form ----------
    if (pathname === '/report') {
      const type = ['scam', 'review', 'other'].includes(q.get('type')) ? q.get('type') : 'other';
      return html(res, 200, views.reportPage({ user, type, biz: (q.get('biz') || '').slice(0, 60), reviewId: parseInt(q.get('review'), 10) || null, err: q.get('err') }));
    }

    return html(res, 404, views.notFound({ user }));
  }

  // ---------- POST routes ----------
  if (method === 'POST') {
    const helpfulMatch = pathname.match(/^\/review\/(\d+)\/helpful$/);
    if (helpfulMatch) {
      const reviewId = Number(helpfulMatch[1]);
      const review = dbm.db.prepare('SELECT id, user_id, hidden FROM reviews WHERE id = ?').get(reviewId);
      if (!review || review.hidden) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/review/${reviewId}/helpful`);
      if (user.id !== review.user_id) {
        const voted = dbm.db.prepare('SELECT 1 FROM review_helpful_votes WHERE review_id = ? AND user_id = ?').get(reviewId, user.id);
        if (voted) dbm.db.prepare('DELETE FROM review_helpful_votes WHERE review_id = ? AND user_id = ?').run(reviewId, user.id);
        else dbm.db.prepare('INSERT INTO review_helpful_votes (review_id, user_id, created_at) VALUES (?,?,?)').run(reviewId, user.id, nowIso());
      }
      const biz = dbm.db.prepare('SELECT slug FROM businesses WHERE id = (SELECT business_id FROM reviews WHERE id = ?)').get(reviewId);
      return redirect(res, biz ? `/business/${biz.slug}` : '/');
    }
    // delete own review
    const delM = pathname.match(/^\/review\/(\d+)\/delete$/);
    if (delM) {
      const r = dbm.db.prepare(`SELECT r.*, b.name AS biz_name FROM reviews r
        JOIN businesses b ON b.id = r.business_id WHERE r.id = ?`).get(Number(delM[1]));
      if (!r) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/review/${r.id}/delete`);
      if (r.user_id !== user.id && user.role !== 'admin') return redirect(res, '/dashboard');
      dbm.deleteReviewCascade(r.id);
      dbm.audit(user, 'review.deleted', 'review', r.id, r.biz_name || '');
      return redirect(res, '/dashboard?msg=reviewDeleted');
    }

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
        return html(res, 401, views.loginPage({ next: body.next || '', err: 'bad', google: googleOn() }));
      }
      if (row.status === 'suspended') {
        return html(res, 403, views.loginPage({ next: body.next || '', err: 'suspended', google: googleOn() }));
      }
      const cookie = `lr_sess=${encodeURIComponent(makeToken(row.id))}; Max-Age=${30 * 24 * 3600}; Path=/; HttpOnly; SameSite=Lax; Secure`;
      return redirect(res, (body.next && body.next.startsWith('/') && !body.next.startsWith('//')) ? body.next : '/dashboard', cookie);
    }

    if (pathname === '/signup') {
      const name = String(body.name || '').trim().slice(0, 80);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
      const password = String(body.password || '');
      const next = String(body.next || '');
      const nx = next.startsWith('/') && !next.startsWith('//') ? next : '';
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
        return html(res, 400, views.signupPage({ err: 'invalid', values: { name, email }, next, google: googleOn() }));
      }
      const exists = dbm.db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
      if (exists) return html(res, 409, views.signupPage({ err: 'taken', values: { name, email }, next, google: googleOn() }));
      const r = dbm.db.prepare(
        'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,?,?)')
        .run(email, name, dbm.hashPassword(password), 'user', nowIso());
      const cookie = `lr_sess=${encodeURIComponent(makeToken(Number(r.lastInsertRowid)))}; Max-Age=${30 * 24 * 3600}; Path=/; HttpOnly; SameSite=Lax; Secure`;
      return redirect(res, nx || '/dashboard?msg=acctCreated', cookie);
    }

    if (pathname === '/logout') {
      return redirect(res, '/', 'lr_sess=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure');
    }

    // ---- public: submit report / appeal ----
    if (pathname === '/report') {
      const type = ['scam', 'review', 'other'].includes(body.type) ? body.type : 'other';
      const details = String(body.details || '').trim().slice(0, 2000);
      if (!details || details.length < 10) return redirect(res, '/report?err=1&type=' + type);
      const slug = String(body.biz || '').slice(0, 60);
      const biz = slug ? dbm.getBusinessBySlug(slug) : null;
      const reviewId = parseInt(body.review_id, 10) || null;
      const rid = dbm.addReport({
        type, business_id: biz ? biz.id : null, review_id: type === 'review' ? reviewId : null,
        reporter_user_id: user ? user.id : null,
        reporter_contact: String(body.contact || '').slice(0, 120),
        details,
      });
      dbm.audit(user, 'report.submitted', 'report', rid, type + (biz ? ' on ' + biz.name : ''));
      return redirect(res, '/?msg=rep.done');
    }
    const apm = pathname.match(/^\/appeal\/(\d+)$/);
    if (apm) {
      const m = apm;
      const rev = dbm.db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(m[1]));
      if (!rev || !user || rev.user_id !== user.id) return redirect(res, '/dashboard');
      if (!rev.hidden) return redirect(res, '/dashboard');
      if (dbm.myAppealFor(rev.id)) return redirect(res, '/dashboard');
      const reason = String(body.reason || '').trim().slice(0, 500);
      if (reason.length < 10) return redirect(res, '/dashboard');
      dbm.db.prepare('INSERT INTO appeals (user_id, review_id, reason, status, created_at) VALUES (?,?,?,\'pending\',?)')
        .run(user.id, rev.id, reason, nowIso());
      dbm.audit(user, 'appeal.submitted', 'appeal', rev.id, 'review #' + rev.id);
      return redirect(res, '/dashboard');
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
      if (b.owner_user_id === user.id) return redirect(res, `/business/${m[1]}?msg=ownBiz`);
      if (user.status && user.status !== 'active') return redirect(res, '/dashboard?msg=restricted');
      if (rateLimited('rev:' + user.id, 5)) return redirect(res, '/dashboard?msg=revRate');
      const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 0));
      const title = String(body.title || '').trim().slice(0, 100);
      const text = String(body.body || '').trim().slice(0, 2000);
      const minLen = parseInt(dbm.settingGet('review_min_length', 20), 10) || 20;
      if (!rating || text.length < minLen) return redirect(res, `/business/${m[1]}/review`);
      const existing = dbm.myReview(b.id, user.id);
      const saveMedia = (id, field, saver) => {
        const f = body[field];
        const ext = isImageFile(f, 2.5 * 1024 * 1024) && imageExt(f.data, f.mime);
        if (ext) saver(id, f.data, ext);
      };
      const saveRcpt = (id) => saveMedia(id, 'receipt', dbm.saveReceipt);
      if (existing) {
        dbm.db.prepare('UPDATE reviews SET rating=?, title=?, body=?, updated_at=? WHERE id = ?')
          .run(rating, title, text, nowIso(), existing.id);
        saveRcpt(existing.id);
        saveMedia(existing.id, 'photo', dbm.savePhoto);
        return redirect(res, `/business/${m[1]}?msg=reviewUpdated`);
      }
      const rid = Number(dbm.db.prepare('INSERT INTO reviews (business_id, user_id, rating, title, body, created_at) VALUES (?,?,?,?,?,?)')
        .run(b.id, user.id, rating, title, text, nowIso()).lastInsertRowid);
      saveRcpt(rid);
      saveMedia(rid, 'photo', dbm.savePhoto);
      const reasons = dbm.autoFlagReasons(title, text);
      if (reasons.length) {
        dbm.addReport({ type: 'review', review_id: rid, details: 'Auto-flagged: ' + reasons.join('; ') });
        dbm.audit(user, 'review.auto_flagged', 'review', rid, reasons.join('; '));
      }
      return redirect(res, `/business/${m[1]}?msg=reviewPosted`);
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/respond\/(\d+)$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!canEditBiz(user, b)) return redirect(res, `/business/${m[1]}`);
      const text = String(body.response || '').trim().slice(0, 1000);
      if (String(body.remove || '') === '1') {
        dbm.db.prepare('UPDATE reviews SET response_text=NULL, responded_at=NULL WHERE id=? AND business_id=?')
          .run(Number(m[2]), b.id);
        dbm.audit(user, 'review.response_removed', 'review', Number(m[2]), b.name);
        return redirect(res, `/business/${m[1]}/manage?msg=respRemoved`);
      }
      if (text) {
        dbm.db.prepare('UPDATE reviews SET response_text=?, responded_at=? WHERE id=? AND business_id=?')
          .run(text, nowIso(), Number(m[2]), b.id);
        dbm.audit(user, 'review.response_saved', 'review', Number(m[2]), b.name);
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
      const dups = body.confirm_dup === 'on' ? [] : dbm.findBusinessDuplicates(name, city);
      if (dups.length) return html(res, 409, views.addBizPage({ user, err: 'dup', values: body, dups }));
      let websiteSafe = '';
      if (website && /^https?:\/\//i.test(website)) websiteSafe = website;
      const slug = dbm.uniqueSlug(name);
      const bid = Number(dbm.db.prepare(`INSERT INTO businesses (slug, name, category, city, country, description, website, phone, created_by, owner_user_id, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, name, category, city, country, description, websiteSafe, phone, user.id, user.id, nowIso()).lastInsertRowid);
      dbm.audit(user, 'business.autoclaimed', 'business', bid, name);
      const lf = body.logo;
      const lext = isImageFile(lf, 1.5 * 1024 * 1024) && imageExt(lf.data, lf.mime);
      if (lext) dbm.saveBizLogo(bid, lf.data, lext);
      return redirect(res, `/business/${slug}?msg=bizAdded`);
    }

    m = pathname.match(/^\/business\/([a-z0-9-]+)\/profile$/);
    if (m) {
      const b = dbm.getBusinessBySlug(m[1]);
      if (!b) return html(res, 404, views.notFound({ user }));
      if (!user) return redirect(res, `/login?next=/business/${m[1]}/manage`);
      if (!canEditBiz(user, b)) return redirect(res, `/business/${m[1]}?msg=noPerm`);
      const name = String(body.name || '').trim().slice(0, 120);
      const category = CATEGORIES.includes(body.category) ? body.category : b.category;
      const city = String(body.city || '').trim().slice(0, 80) || b.city;
      const country = COUNTRIES.includes(body.country) ? body.country : b.country;
      const description = String(body.description || '').trim().slice(0, 600);
      let websiteSafe = b.website || '';
      const w = String(body.website || '').trim().slice(0, 200);
      if (w) websiteSafe = /^https?:\/\//i.test(w) ? w : websiteSafe;
      const phone = String(body.phone || '').trim().slice(0, 40);
      if (!name) return redirect(res, `/business/${m[1]}/manage?msg=nameMissing`);
      dbm.db.prepare('UPDATE businesses SET name=?, category=?, city=?, country=?, description=?, website=?, phone=? WHERE id=?')
        .run(name, category, city, country, description, websiteSafe, phone, b.id);
      const lf = body.logo;
      const lext = isImageFile(lf, 1.5 * 1024 * 1024) && imageExt(lf.data, lf.mime);
      if (lext) dbm.saveBizLogo(b.id, lf.data, lext);
      dbm.audit(user, 'business.profile_updated', 'business', b.id, name);
      return redirect(res, `/business/${m[1]}/manage?msg=profileSaved`);
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
    if (user && (user.role === 'admin' || user.role === 'moderator')) {
      // verification decisions
      m = pathname.match(/^\/admin\/verification\/(\d+)\/decision$/);
      if (m) {
        if (!admAllow(user, 'verifications')) return html(res, 404, views.notFound({ user }));
        const v = dbm.db.prepare('SELECT * FROM verifications WHERE id = ?').get(Number(m[1]));
        if (v) {
          const note = String(body.admin_note || '').slice(0, 200);
          const dec = body.decision;
          if (dec === 'approve') {
            dbm.db.prepare(`UPDATE verifications SET status='approved', decided_at=?, admin_note=?, expires_at=? WHERE id=?`)
              .run(nowIso(), note, body.expires_at ? String(body.expires_at).slice(0, 10) : null, v.id);
            dbm.db.prepare('UPDATE businesses SET verified=1, verified_at=? WHERE id=?').run(nowIso(), v.business_id);
            dbm.audit(user, 'verification.approved', 'business', v.business_id, note);
          } else if (dec === 'request_docs') {
            dbm.db.prepare(`UPDATE verifications SET status='docs_requested', admin_note=? WHERE id=?`).run(note, v.id);
            dbm.audit(user, 'verification.docs_requested', 'business', v.business_id, note);
          } else {
            dbm.db.prepare(`UPDATE verifications SET status='rejected', decided_at=?, admin_note=? WHERE id=?`).run(nowIso(), note, v.id);
            dbm.audit(user, 'verification.rejected', 'business', v.business_id, note);
          }
        }
        return redirect(res, '/admin/verifications?msg=Done');
      }
      // claim decisions (audit added)
      m = pathname.match(/^\/admin\/claim\/(\d+)$/);
      if (m) {
        if (!admAllow(user, 'businesses')) return html(res, 404, views.notFound({ user }));
        const c = dbm.db.prepare('SELECT * FROM claims WHERE id = ?').get(Number(m[1]));
        if (c) {
          if (body.decision === 'approve') {
            dbm.db.prepare(`UPDATE claims SET status='approved' WHERE id=?`).run(c.id);
            dbm.db.prepare(`UPDATE businesses SET owner_user_id=? WHERE id=?`).run(c.user_id, c.business_id);
            dbm.db.prepare(`UPDATE users SET role='owner' WHERE id=? AND role='user'`).run(c.user_id);
            dbm.audit(user, 'claim.approved', 'business', c.business_id, 'to user #' + c.user_id);
          } else {
            dbm.db.prepare(`UPDATE claims SET status='rejected' WHERE id=?`).run(c.id);
            dbm.audit(user, 'claim.rejected', 'business', c.business_id, '');
          }
        }
        return redirect(res, '/admin/verifications?msg=Done');
      }
      // business edit
      m = pathname.match(/^\/admin\/business\/(\d+)\/edit$/);
      if (m) {
        if (!admAllow(user, 'businesses')) return html(res, 404, views.notFound({ user }));
        const name = String(body.name || '').trim().slice(0, 120);
        if (!name) return redirect(res, '/admin/business/' + m[1] + '?msg=Name+required');
        dbm.db.prepare('UPDATE businesses SET name=?, category=?, city=?, country=?, description=?, website=?, phone=? WHERE id=?')
          .run(name, String(body.category || '').slice(0, 60), String(body.city || '').slice(0, 80),
               String(body.country || '').slice(0, 60), String(body.description || '').slice(0, 600),
               String(body.website || '').slice(0, 200), String(body.phone || '').slice(0, 40), Number(m[1]));
        const lf = body.logo;
        const lext = isImageFile(lf, 1.5 * 1024 * 1024) && imageExt(lf.data, lf.mime);
        if (lext) dbm.saveBizLogo(Number(m[1]), lf.data, lext);
        dbm.audit(user, 'business.edited', 'business', Number(m[1]), name);
        return redirect(res, '/admin/business/' + m[1] + '?msg=Saved');
      }
      // business suspend/restore
      m = pathname.match(/^\/admin\/business\/(\d+)\/delete$/);
    if (m) {
      if (!admAllow(user, 'moderation')) return html(res, 404, views.notFound({ user }));
      if (String(body.confirm || '').trim().toUpperCase() !== 'DELETE') return redirect(res, `/admin/business/${m[1]}?msg=delNoConfirm`);
      const id = Number(m[1]);
      const b = dbm.getBusinessById(id);
      if (!b) return html(res, 404, views.notFound({ user }));
      const rids = dbm.db.prepare('SELECT id FROM reviews WHERE business_id = ?').all(id).map(r => r.id);
      if (rids.length) {
        const qm = rids.map(() => '?').join(',');
        dbm.db.prepare(`DELETE FROM appeals WHERE review_id IN (${qm})`).run(...rids);
        dbm.db.prepare(`DELETE FROM reports WHERE review_id IN (${qm})`).run(...rids);
      }
      dbm.db.prepare('DELETE FROM reports WHERE business_id = ?').run(id);
      dbm.db.prepare('DELETE FROM reviews WHERE business_id = ?').run(id);
      dbm.db.prepare('DELETE FROM claims WHERE business_id = ?').run(id);
      dbm.db.prepare('DELETE FROM verifications WHERE business_id = ?').run(id);
      try { if (b.logo_path) fs.unlinkSync(path.join(dbm.DATA_DIR, b.logo_path)); } catch {}
      dbm.db.prepare('DELETE FROM businesses WHERE id = ?').run(id);
      dbm.audit(user, 'business.deleted', 'business', id, b.name + ' (hard delete)');
      return redirect(res, '/admin/businesses?msg=deleted');
    }

    m = pathname.match(/^\/admin\/business\/(\d+)\/status$/);
      if (m) {
        if (!admAllow(user, 'businesses')) return html(res, 404, views.notFound({ user }));
        const status = ['active', 'suspended'].includes(body.status) ? body.status : 'active';
        if (status === 'suspended' && body.confirm !== 'on') return redirect(res, '/admin/business/' + m[1] + '?msg=Confirmation+required');
        dbm.db.prepare('UPDATE businesses SET status=? WHERE id=?').run(status, Number(m[1]));
        dbm.audit(user, 'business.' + status, 'business', Number(m[1]), '');
        return redirect(res, '/admin/business/' + m[1] + '?msg=Saved');
      }
      // merge duplicates
      if (pathname === '/admin/businesses/merge') {
        if (!admAllow(user, 'businesses')) return html(res, 404, views.notFound({ user }));
        if (body.confirm !== 'on') return redirect(res, '/admin/businesses?msg=Confirmation+required');
        const r = dbm.mergeBusinesses(Number(body.from), Number(body.into));
        if (r.ok) {
          dbm.audit(user, 'business.merged', 'business', Number(body.into), '"' + r.from + '" merged into "' + r.into + '"');
          return redirect(res, '/admin/business/' + body.into + '?msg=Merged');
        }
        return redirect(res, '/admin/businesses?msg=Invalid+merge');
      }
      // review hide/restore with reason
      m = pathname.match(/^\/admin\/review\/(\d+)\/(hide|restore)$/);
      if (m) {
        if (!admAllow(user, 'moderation')) return html(res, 404, views.notFound({ user }));
        const rev = dbm.db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(m[1]));
        if (rev) {
          if (m[2] === 'hide') {
            const reason = String(body.reason || '').slice(0, 200);
            if (!reason) return redirect(res, '/admin/moderation?msg=Reason+required');
            dbm.db.prepare('UPDATE reviews SET hidden=1, hidden_reason=?, hidden_by=?, hidden_at=? WHERE id=?')
              .run(reason, user.id, nowIso(), rev.id);
            dbm.db.prepare(`UPDATE reports SET status='resolved', outcome='Review hidden by moderation', updated_at=? WHERE review_id=? AND status IN ('open','investigating')`).run(nowIso(), rev.id);
            dbm.audit(user, 'review.hidden', 'review', rev.id, reason);
          } else {
            if (body.confirm !== 'on') return redirect(res, '/admin/moderation?msg=Confirmation+required');
            dbm.db.prepare('UPDATE reviews SET hidden=0, hidden_reason=NULL, hidden_by=NULL, hidden_at=NULL WHERE id=?').run(rev.id);
            dbm.audit(user, 'review.restored', 'review', rev.id, '');
          }
        }
        return redirect(res, '/admin/moderation?msg=Done');
      }
      // verified purchase toggle
      m = pathname.match(/^\/admin\/review\/(\d+)\/purchase$/);
      if (m) {
        if (!admAllow(user, 'moderation')) return html(res, 404, views.notFound({ user }));
        const rev = dbm.db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(m[1]));
        if (rev) {
          const nv = rev.verified_purchase ? 0 : 1;
          dbm.db.prepare('UPDATE reviews SET verified_purchase=? WHERE id=?').run(nv, rev.id);
          dbm.audit(user, nv ? 'review.marked_verified_purchase' : 'review.unmarked_verified_purchase', 'review', rev.id, '');
        }
        const ref = req.headers.referer || '';
        const back = ref.includes('://') ? ref.slice(ref.indexOf('://') + 3).replace(/^[^/]+/, '') : '/admin/moderation';
        return redirect(res, (back.startsWith('/admin') ? back.split('?')[0] + '?msg=Saved' : '/admin/moderation?msg=Saved'));
      }
      // dismiss a report
      m = pathname.match(/^\/admin\/report\/(\d+)\/dismiss$/);
      if (m) {
        if (!admAllow(user, 'moderation')) return html(res, 404, views.notFound({ user }));
        dbm.db.prepare(`UPDATE reports SET status='dismissed', outcome='No policy violation found', updated_at=? WHERE id=?`).run(nowIso(), Number(m[1]));
        dbm.audit(user, 'report.dismissed', 'report', Number(m[1]), '');
        return redirect(res, '/admin/moderation?msg=Done');
      }
      // update scam report case
      m = pathname.match(/^\/admin\/report\/(\d+)\/update$/);
      if (m) {
        if (!admAllow(user, 'reports')) return html(res, 404, views.notFound({ user }));
        const status = ['open', 'investigating', 'resolved', 'dismissed'].includes(body.status) ? body.status : 'open';
        const priority = body.priority === 'urgent' ? 'urgent' : 'normal';
        dbm.db.prepare('UPDATE reports SET status=?, priority=?, outcome=?, updated_at=? WHERE id=?')
          .run(status, priority, String(body.outcome || '').slice(0, 600), nowIso(), Number(m[1]));
        dbm.audit(user, 'report.' + status, 'report', Number(m[1]), 'priority ' + priority);
        return redirect(res, '/admin/report/' + m[1] + '?msg=Saved');
      }
      // user status/role
      m = pathname.match(/^\/admin\/user\/(\d+)\/delete$/);
    if (m) {
      if (user.role !== 'admin') return html(res, 404, views.notFound({ user }));
      if (String(body.confirm || '').trim().toUpperCase() !== 'DELETE') return redirect(res, `/admin/user/${m[1]}?msg=delNoConfirm`);
      const uid = Number(m[1]);
      const target = dbm.db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
      if (!target || target.role === 'admin') return html(res, 404, views.notFound({ user }));
      dbm.db.prepare(`DELETE FROM appeals WHERE user_id = ?`).run(uid);
      dbm.db.prepare('DELETE FROM reports WHERE reporter_user_id = ? OR target_user_id = ?').run(uid, uid);
      const rbids = dbm.db.prepare('SELECT business_id FROM reviews WHERE user_id = ?').all(uid).map(r => r.business_id);
      dbm.db.prepare('DELETE FROM reviews WHERE user_id = ?').run(uid);
      dbm.db.prepare('DELETE FROM verifications WHERE user_id = ?').run(uid);
      dbm.db.prepare('DELETE FROM claims WHERE user_id = ?').run(uid);
      dbm.db.prepare('UPDATE businesses SET owner_user_id = NULL WHERE owner_user_id = ?').run(uid);
      dbm.db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      dbm.audit(user, 'user.deleted', 'user', uid, target.email + ' (hard delete)');
      return redirect(res, '/admin/users?msg=deleted');
    }

    m = pathname.match(/^\/admin\/user\/(\d+)\/update$/);
      if (m) {
        if (!admAllow(user, 'users')) return html(res, 404, views.notFound({ user }));
        const uid = Number(m[1]);
        if (uid === user.id) return redirect(res, '/admin/users?msg=Cannot+change+yourself');
        const status = ['active', 'restricted', 'suspended'].includes(body.status) ? body.status : 'active';
        const role = ['user', 'moderator', 'admin'].includes(body.role) ? body.role : 'user';
        const target = dbm.db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
        if (!target) return redirect(res, '/admin/users?msg=Not+found');
        if (target.role === 'admin' && role !== 'admin' && dbm.db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role='admin'`).get().n <= 1)
          return redirect(res, '/admin/users?msg=Last+admin+cannot+be+demoted');
        dbm.db.prepare('UPDATE users SET status=?, role=? WHERE id=?').run(status, role, uid);
        dbm.audit(user, 'user.updated', 'user', uid, 'status ' + status + ', role ' + role);
        return redirect(res, '/admin/users?msg=Saved');
      }
      // categories
      if (pathname === '/admin/category') {
        if (!admAllow(user, 'settings')) return html(res, 404, views.notFound({ user }));
        const name = String(body.name || '').trim().slice(0, 60);
        if (name) {
          dbm.db.prepare(`INSERT OR IGNORE INTO categories (name, created_at) VALUES (?,?)`).run(name, nowIso());
          dbm.audit(user, 'category.added', 'category', 0, name);
        }
        return redirect(res, '/admin/settings?msg=Saved');
      }
      m = pathname.match(/^\/admin\/category\/(\d+)\/delete$/);
      if (m) {
        if (!admAllow(user, 'settings')) return html(res, 404, views.notFound({ user }));
        if (body.confirm !== 'on') return redirect(res, '/admin/settings?msg=Confirmation+required');
        const cat = dbm.db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(m[1]));
        if (cat) {
          dbm.db.prepare('DELETE FROM categories WHERE id=?').run(cat.id);
          dbm.audit(user, 'category.deleted', 'category', cat.id, cat.name);
        }
        return redirect(res, '/admin/settings?msg=Saved');
      }
      if (pathname === '/admin/setting/review_min') {
        if (!admAllow(user, 'settings')) return html(res, 404, views.notFound({ user }));
        const v = Math.min(1000, Math.max(0, parseInt(body.value, 10) || 0));
        dbm.settingSet('review_min_length', String(v));
        dbm.audit(user, 'setting.review_min', 'setting', 0, String(v));
        return redirect(res, '/admin/settings?msg=Saved');
      }
      // appeals
      m = pathname.match(/^\/admin\/appeal\/(\d+)\/(accept|reject)$/);
      if (m) {
        if (!admAllow(user, 'moderation')) return html(res, 404, views.notFound({ user }));
        const ap = dbm.db.prepare('SELECT * FROM appeals WHERE id = ?').get(Number(m[1]));
        if (ap) {
          if (m[2] === 'accept') {
            if (body.confirm !== 'on') return redirect(res, '/admin/moderation?msg=Confirmation+required');
            dbm.db.prepare('UPDATE reviews SET hidden=0, hidden_reason=NULL, hidden_at=NULL WHERE id=?').run(ap.review_id);
            dbm.db.prepare(`UPDATE appeals SET status='accepted', decided_by=?, decided_at=? WHERE id=?`).run(user.id, nowIso(), ap.id);
            dbm.audit(user, 'appeal.accepted', 'review', ap.review_id, 'review restored');
          } else {
            const note = String(body.note || '').slice(0, 200);
            if (!note) return redirect(res, '/admin/moderation?msg=Reason+required');
            dbm.db.prepare(`UPDATE appeals SET status='rejected', decided_by=?, decided_at=? WHERE id=?`).run(user.id, nowIso(), ap.id);
            dbm.audit(user, 'appeal.rejected', 'review', ap.review_id, note);
          }
        }
        return redirect(res, '/admin/moderation?msg=Done');
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
