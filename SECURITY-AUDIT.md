# Security & Project Audit — 2026-10-26

Full audit of site, code, and deployment. Runtime findings verified with automated attack tests (permission matrix, XSS, SQLi, session forgery, upload spoofing).

## Verified sound (with tests)

- **Auth**: scrypt password hashing (16-byte salt, 64-byte key), timingSafeEqual comparison. Signup validates email format, 8-char minimum password, duplicate accounts rejected.
- **Sessions**: HMAC-signed stateless tokens with 30-day expiry; forged/tampered cookies rejected (tested). Cookies set with `HttpOnly; SameSite=Lax; Secure`.
- **Authorization**: full route matrix tested as guest / regular user / admin — every `/admin` route returns 404 for non-staff, owner-only routes (manage, profile edit, respond, verify) bounce non-owners, admin edit attempts by regular users do not execute.
- **SQL injection**: all queries parameterized (one safe internal PRAGMA). Injection attempts on search and login rejected.
- **XSS**: all user content escaped server-side (`esc()`); `<script>`, `<img onerror>` payloads stored and rendered inert (tested).
- **Path traversal**: static file serving constrained to `public/` prefix.
- **Open redirect**: login `next` param restricted to same-site paths.
- **Rate limiting**: 60 POST/min per IP, 10 auth attempts/min, 5 reviews/min per user (tested).
- **Error handling**: 500s return plain text, no stack traces to clients.
- **Permissions & audit**: destructive admin actions require confirmation; all admin/owner actions audited.
- **Persistence & secrets**: SQLite on Coolify persistent volume (/app/data); secrets via env, none committed to the repo (history checked).
- **Automation**: "The Legit Rank Daily Builder" workflow active (daily scheduled).

## Issues found and fixed in this audit

1. **Upload content spoofing** — file uploads trusted the client-declared MIME type. Fixed: magic-byte sniffing (PNG/JPEG/WebP signatures); disguised files rejected (tested).
2. **Review update path dropped photos** — editing a review saved the receipt but silently discarded a new public photo. Fixed (tested).
3. **Missing security headers** — added CSP (`default-src 'self'`, no inline scripts, frame-ancestors none), X-Frame-Options DENY, correct Referrer-Policy (a pre-existing duplicate header had a typo'd value).
4. **No robots.txt / sitemap.xml** — added (sitemap is dynamic, lists all active businesses).
5. **No health endpoint** — added `GET /health`.

## Notes / recommendations (not blocking)

- Container runs as root (node:24-alpine). Acceptable on Coolify single-app setup; consider `USER node` with volume chown before wider exposure.
- No automated database backups yet. SQLite lives on the persistent volume; a Coolify backup policy or scheduled export is recommended before launch.
- CSRF relies on SameSite=Lax cookies (sufficient for this architecture; all mutations are POST-only).
- Admin password seeded via env — rotate after launch.
- Consider HSTS once the custom domain (legitrank.brandfletch.com) is on a real certificate.
