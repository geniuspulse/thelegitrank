// views.js — server-rendered HTML templates
const { t, tRaw, esc } = require('./i18n');

const CATEGORIES = ['Fashion','Electronics','Home & Living','Food & Restaurant','Beauty','Services','Education','Retail','Travel','Transport','Health','Other'];
const COUNTRIES = ['Malawi','Zambia','Zimbabwe','Tanzania','Kenya','Nigeria','Ghana','Rwanda','Uganda','South Africa','Mozambique','Botswana','Namibia','Cameroon','Ivory Coast','Senegal','Ethiopia','Other'];

function stars(rating) {
  const r = Math.round(Number(rating) || 0);
  return '★★★★★'.slice(0, r) + '<span class="dim">' + '★★★★★'.slice(0, 5 - r) + '</span>';
}

function bizCard(b) {
  const avg = b.avg_rating || null;
  return `
  <a class="biz-card reveal" href="/business/${esc(b.slug)}">
    <div class="biz-head">
      <div class="biz-avatar">${esc(b.name.slice(0, 2).toUpperCase())}</div>
      <div class="biz-tt">
        <b>${esc(b.name)}</b>
        ${b.verified ? '<span class="v-chip">✓ ' + t('biz.verified') + '</span>' : ''}
        <span class="biz-loc">${esc(b.category)} · ${esc(b.city)}, ${esc(b.country)}</span>
      </div>
    </div>
    <div class="biz-rating">
      ${avg
        ? `<span class="stars-a">${stars(avg)}</span> <b>${avg}</b> <span class="muted">· ${b.review_count} ${t('biz.reviews')}</span>`
        : `<span class="muted">${t('biz.noReviews')}</span>`}
    </div>
  </a>`;
}

function layout({ title, content, user, hero = false }) {
  const nav = `
  <nav aria-label="Main">
    <div class="wrap nav-inner">
      <a class="logo" href="/">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" fill="#00A86B"/><path d="M8.6 12.2l2.2 2.2 4.6-4.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>The Legit Rank</span>
      </a>
      <div class="nav-links">
        <a href="/search">${t('nav.browse')}</a>
        <a href="/businesses/new">${t('nav.add')}</a>
      </div>
      <div class="nav-cta">
        ${user ? `<a class="nav-user" href="/dashboard" title="${esc(user.name)}">${esc(user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</a>` : ''}
        <button class="burger" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
      </div>
    </div>
  </nav>
  <div class="menu" id="menu">
    <a href="/search">${t('nav.check')}</a>
    <a href="/businesses/new">${t('nav.add')}</a>
    <a href="/dashboard">${t('nav.account')}</a>
    ${user && user.role === 'admin' ? `<a href="/admin">${t('nav.admin')}</a>` : ''}
    ${user
      ? `<form method="post" action="/logout"><button type="submit">${t('nav.logout')}</button></form>`
      : `<a class="menu-hl" href="/signup">${t('nav.signup')}</a>
         <a href="/login">${t('nav.login')}</a>`}
  </div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="The independent review platform for African businesses. Check real buyer ratings, read honest reviews, and find verified sellers.">
<meta name="theme-color" content="#0B192C">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z' fill='%2300A86B'/%3E%3Cpath d='M8.6 12.2l2.2 2.2 4.6-4.6' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body class="${hero ? 'has-hero' : ''}">
${nav}
${content}
<footer>
  <div class="wrap">
    <span class="tag">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" fill="#00A86B"/><path d="M8.6 12.2l2.2 2.2 4.6-4.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      The Legit Rank
    </span><br>
    <span>${t('nav.tagline')} — ${tRaw('home.ctaSub')}</span><br>
    © ${new Date().getFullYear()} The Legit Rank
  </div>
</footer>
<script src="/app.js"></script>
</body>
</html>`;
}

function flash(msg) {
  if (!msg) return '';
  const m = { error: 'fl-err', ok: 'fl-ok' }[msg];
  if (!m) return '';
  const text = {
    reviewPosted: tRaw('rev.posted'), reviewUpdated: tRaw('rev.updated'),
    reviewDeleted: tRaw('rev.deleted'), acctCreated: tRaw('auth.acctCreated'),
    bizAdded: tRaw('add.added'), claimSent: tRaw('claim.sent'),
    verSent: tRaw('ver.sent'), respPosted: tRaw('resp.posted'),
    approved: tRaw('adm.approved'), rejected: tRaw('adm.rejected'),
  }[msg];
  if (!text) return '';
  return `<div class="wrap"><div class="flash ${m}">${esc(text)}</div></div>`;
}

// ---------- HOME ----------
function home({ user, stats, top }) {
  return layout({ title: 'The Legit Rank — The truth before you buy', user, hero: true, content: `
  <header>
    <div class="wrap hero">
      <div>
        <h1>${t('home.h1a')}<br><span class="hl">${t('home.h1b')}</span></h1>
        <p class="lead">${t('home.lead')}</p>
        <form class="search-hero" action="/search" method="get">
          <input type="search" name="q" placeholder="${esc(tRaw('home.searchLabel'))}…" aria-label="Search business">
          <button class="btn btn-green" type="submit">${t('common.search')} →</button>
        </form>
        <p class="hero-note"><span class="dot"></span>${t('home.freeNote')}</p>
      </div>
    </div>
  </header>

  <div class="stats">
    <div class="wrap stat-grid">
      <div class="stat"><b>${stats.businesses}</b><span>${t('home.statBusinesses')}</span></div>
      <div class="stat"><b>${stats.reviews}</b><span>${t('home.statReviews')}</span></div>
      <div class="stat"><b>${stats.verified}</b><span>${t('home.statVerified')}</span></div>
    </div>
  </div>

  <section class="steps">
    <div class="wrap">
      <span class="kicker">${t('home.topRated')}</span>
      <h2 class="sec">${t('home.topRated')}</h2>
      <p class="sec-sub">${t('home.topRatedSub')}</p>
      <div class="grid3">${top.map(bizCard).join('')}</div>
      <p class="center"><a class="btn btn-outline" href="/search">${t('common.search')} →</a></p>
    </div>
  </section>

  <section class="badge-strip">
    <div class="wrap">
      <span class="kicker">${t('home.howKicker')}</span>
      <h2 class="sec">${t('home.howTitle')}</h2>
      <p class="sec-sub">${t('home.howSub')}</p>
      <div class="grid3">
        <div class="b-item"><h3>1 · ${t('home.step1t')}</h3><p>${t('home.step1b')}</p></div>
        <div class="b-item"><h3>2 · ${t('home.step2t')}</h3><p>${t('home.step2b')}</p></div>
        <div class="b-item"><h3>3 · ${t('home.step3t')}</h3><p>${t('home.step3b')}</p></div>
      </div>
    </div>
  </section>

  <section class="steps">
    <div class="wrap">
      <span class="kicker">${t('home.bizKicker')}</span>
      <h2 class="sec">${t('home.bizTitle')}</h2>
      <p class="sec-sub">${t('home.bizSub')}</p>
      <div class="grid3">
        <div class="card"><h3>${t('home.biz1t')}</h3><p>${t('home.biz1b')}</p></div>
        <div class="card"><h3>${t('home.biz2t')}</h3><p>${t('home.biz2b')}</p></div>
        <div class="card"><h3>${t('home.biz3t')}</h3><p>${t('home.biz3b')}</p></div>
      </div>
    </div>
  </section>

  <div class="band">
    <div class="wrap">
      <h2>${t('home.ctaTitle')}</h2>
      <p>${t('home.ctaSub')}</p>
      <a class="btn btn-white" href="/signup">${t('nav.signup')} →</a>
    </div>
  </div>` });
}

// ---------- SEARCH ----------
function searchPage({ user, q, category, results, msg }) {
  const chips = [''].concat(CATEGORIES).map(c =>
    `<a class="chip ${c === category ? 'chip-on' : ''}" href="/search?q=${encodeURIComponent(q || '')}${c ? '&category=' + encodeURIComponent(c) : ''}">${esc(c || 'All')}</a>`).join('');
  return layout({ title: (q ? `${q} — ` : '') + 'Search — The Legit Rank', user, content: `
  <section class="page-head">
    <div class="wrap">
      <h1 class="sec">${q ? `${t('search.results')}: “${esc(q)}”` : t('nav.browse')}</h1>
      <form class="search-inline" action="/search" method="get">
        <input type="search" name="q" value="${esc(q)}" placeholder="${esc(tRaw('home.searchLabel'))}…">
        <input type="hidden" name="category" value="${esc(category || '')}">
        <button class="btn btn-green" type="submit">${t('common.search')}</button>
      </form>
      <div class="chips">${chips}</div>
    </div>
  </section>
  ${flash(msg || '')}
  <section class="pad-sm">
    <div class="wrap">
      ${results.length
        ? `<div class="biz-list">${results.map(bizCard).join('')}</div>`
        : `<div class="empty">
             <p><b>${t('search.none')}</b></p>
             <p class="muted">${t('search.noneHint')}</p>
             <p><a class="btn btn-green" href="/businesses/new?name=${encodeURIComponent(q || '')}">${t('search.addPrompt')} →</a></p>
           </div>`}
    </div>
  </section>` });
}

// ---------- BUSINESS PROFILE ----------
function reviewItem(r, isOwner) {
  return `
  <article class="review-card">
    <div class="review-head">
      <div class="avatar">${esc((r.author_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</div>
      <div class="who"><b>${esc(r.author_name)}</b><span>${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
      <span class="stars-a push">${stars(r.rating)}</span>
    </div>
    ${r.title ? `<h4>${esc(r.title)}</h4>` : ''}
    <p>${esc(r.body)}</p>
    ${r.response_text ? `
      <div class="resp-block">
        <b>↩ ${t('biz.response')}</b>
        <p>${esc(r.response_text)}</p>
      </div>` : ''}
  </article>`;
}

function businessPage({ user, b, reviews, dist, page, pages, myRev, alreadyReviewed, msg }) {
  const total = b.review_count;
  const bars = [5,4,3,2,1].map(n => `
    <div class="dist-row">
      <span class="dist-l">${n} ★</span>
      <div class="dist-bar"><span style="width:${total ? Math.round(dist[n] / total * 100) : 0}%"></span></div>
      <span class="dist-n">${dist[n]}</span>
    </div>`).join('');

  const cta = user
    ? (alreadyReviewed
        ? `<a class="btn btn-green" href="/business/${esc(b.slug)}/review">${t('biz.editReview')} →</a>`
        : `<a class="btn btn-green" href="/business/${esc(b.slug)}/review">${t('biz.writeReview')} →</a>`)
    : `<a class="btn btn-green" href="/login?next=/business/${esc(b.slug)}/review">${t('biz.loginToReview')} →</a>`;

  const ownerBar = b.owner_user_id
    ? ''
    : `<a class="claim-link" href="/claim/${esc(b.slug)}">${t('biz.claim')}</a>`;

  return layout({ title: `${b.name} — Reviews — The Legit Rank`, user, content: `
  <section class="biz-hero">
    <div class="wrap">
      <div class="biz-hero-top">
        <div class="biz-avatar big">${esc(b.name.slice(0, 2).toUpperCase())}</div>
        <div>
          <h1>${esc(b.name)}</h1>
          <p class="muted">${esc(b.category)} · ${esc(b.city)}, ${esc(b.country)}</p>
          ${b.verified
            ? `<span class="v-chip big">✓ ${t('biz.verified')}</span><p class="v-note">${t('biz.verifiedNote')}</p>`
            : `<span class="nv-chip">${t('biz.notVerified')}</span>`}
        </div>
      </div>
      <div class="biz-hero-cta">
        ${b.avg_rating
          ? `<div class="biz-score"><span class="stars-a big">${stars(b.avg_rating)}</span> <b>${b.avg_rating}</b> · ${total} ${t('biz.reviews')}</div>`
          : `<div class="biz-score muted">${t('biz.noReviews')}</div>`}
        ${cta}
        ${ownerBar}
      </div>
      ${b.description ? `<p class="biz-desc">${esc(b.description)}</p>` : ''}
      ${(b.website || b.phone) ? `
        <p class="biz-meta muted">
          ${b.website ? `<a href="${esc(b.website)}" rel="nofollow noopener" target="_blank">${esc(b.website)}</a>` : ''}
          ${b.website && b.phone ? ' · ' : ''}
          ${b.phone ? esc(b.phone) : ''}
        </p>` : ''}
    </div>
  </section>

  ${flash(msg || '')}
  <section class="pad-sm">
    <div class="wrap biz-cols">
      <aside class="biz-side">
        <h3>${t('biz.distribution')}</h3>
        ${bars}
      </aside>
      <div class="biz-main">
        <h3>${t('biz.reviews')}</h3>
        ${reviews.length ? reviews.map(reviewItem).join('')
          : `<div class="empty"><p class="muted">${t('biz.beFirst')}</p></div>`}
        ${pages > 1 ? `
          <div class="pager">
            ${page > 1 ? `<a href="/business/${esc(b.slug)}?page=${page - 1}">← ${t('common.back')}</a>` : ''}
            <span class="muted">${page} / ${pages}</span>
            ${page < pages ? `<a href="/business/${esc(b.slug)}?page=${page + 1}">${t('common.continue')} →</a>` : ''}
          </div>` : ''}
      </div>
    </div>
  </section>` });
}

// ---------- REVIEW FORM ----------
function reviewForm({ user, b, existing }) {
  const r = existing || { rating: 5, title: '', body: '' };
  const cur = ['', '', '', '', ''].map((_, i) => `<button type="button" class="star-btn ${i + 1 <= r.rating ? 'on' : ''}" data-v="${i + 1}" aria-label="${i + 1} star">★</button>`).join('');
  return layout({ title: `${existing ? 'Update' : 'Write'} review — ${b.name}`, user, content: `
  <section class="page-head">
    <div class="wrap narrow">
      <h1 class="sec">${t('rev.title')}</h1>
      <p class="sec-sub muted">${t('rev.rules')}</p>
      <form class="form" method="post" action="/business/${esc(b.slug)}/review">
        <input type="hidden" name="rating" id="ratingVal" value="${r.rating}">
        <div class="f-row"><label>${t('rev.rating')}</label><div class="stars-input">${cur}</div></div>
        <div class="f-row"><label for="rt">${t('rev.name')}</label><input id="rt" name="title" maxlength="100" value="${esc(r.title)}" placeholder="${esc(tRaw('rev.namePh'))}"></div>
        <div class="f-row"><label for="rb">${t('rev.body')}</label><textarea id="rb" name="body" rows="5" maxlength="2000" required placeholder="${esc(tRaw('rev.bodyPh'))}">${esc(r.body)}</textarea></div>
        <div class="f-actions"><button class="btn btn-green" type="submit">${t('rev.submit')} →</button>
        <a class="btn btn-ghost" href="/business/${esc(b.slug)}">${t('common.cancel')}</a></div>
      </form>
    </div>
  </section>` });
}

// ---------- AUTH ----------
function loginPage({ next, err }) {
  return layout({ title: 'Log in — The Legit Rank', user: null, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${t('auth.loginTitle')}</h1>
    <form class="form" method="post" action="/login">
      <input type="hidden" name="next" value="${esc(next || '')}">
      ${err ? `<div class="form-err">${t('auth.badlogin')}</div>` : ''}
      <div class="f-row"><label for="em">${t('auth.email')}</label><input id="em" name="email" type="email" required autocomplete="email"></div>
      <div class="f-row"><label for="pw">${t('auth.password')}</label><input id="pw" name="password" type="password" required autocomplete="current-password"></div>
      <button class="btn btn-green w100" type="submit">${t('auth.enter')} →</button>
    </form>
    <p class="center muted small"><a href="/signup">${t('auth.noAccount')}</a></p>
  </div></section>` });
}

function signupPage({ err, values }) {
  const v = values || {};
  const errBox = err === 'taken' ? `<div class="form-err">${t('auth.emailTaken')}</div>` : '';
  return layout({ title: 'Sign up — The Legit Rank', user: null, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${t('auth.signupTitle')}</h1>
    <p class="sec-sub muted">${t('auth.signupSub')}</p>
    <form class="form" method="post" action="/signup">
      ${errBox}
      <div class="f-row"><label for="nm">${t('auth.name')}</label><input id="nm" name="name" required maxlength="80" value="${esc(v.name || '')}"></div>
      <div class="f-row"><label for="em">${t('auth.email')}</label><input id="em" name="email" type="email" required maxlength="120" value="${esc(v.email || '')}"></div>
      <div class="f-row"><label for="pw">${t('auth.password')}</label><input id="pw" name="password" type="password" required minlength="8" autocomplete="new-password"></div>
      <button class="btn btn-green w100" type="submit">${t('auth.create')} →</button>
    </form>
    <p class="center muted small"><a href="/login">${t('auth.haveAccount')}</a></p>
  </div></section>` });
}

// ---------- ADD BUSINESS ----------
function addBizPage({ user, err, values, added }) {
  const v = values || {};
  const errBox = err === 'exists' ? `<div class="form-err">${t('add.exists')}</div>` :
                 err === 'invalid' ? `<div class="form-err">Please fill in all required fields.</div>` : '';
  const catOpts = CATEGORIES.map(c => `<option ${v.category === c ? 'selected' : ''}>${c}</option>`).join('');
  const ctyOpts = COUNTRIES.map(c => `<option ${v.country === c ? 'selected' : ''}>${c}</option>`).join('');
  return layout({ title: 'Add a business — The Legit Rank', user, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${t('add.title')}</h1>
    <p class="sec-sub muted">${t('add.sub')}</p>
    <form class="form" method="post" action="/businesses/new">
      ${errBox}
      <div class="f-row"><label for="bn">${t('add.name')}</label><input id="bn" name="name" required maxlength="100" value="${esc(v.name || added || '')}"></div>
      <div class="f-row"><label for="bc">${t('add.category')}</label><select id="bc" name="category">${catOpts}</select></div>
      <div class="f2">
        <div class="f-row"><label for="bci">${t('add.city')}</label><input id="bci" name="city" required maxlength="60" value="${esc(v.city || '')}"></div>
        <div class="f-row"><label for="bco">${t('add.country')}</label><select id="bco" name="country">${ctyOpts}</select></div>
      </div>
      <div class="f-row"><label for="bd">${t('add.desc')}</label><textarea id="bd" name="description" rows="3" maxlength="500" placeholder="${esc(tRaw('add.descPh'))}">${esc(v.description || '')}</textarea></div>
      <div class="f2">
        <div class="f-row"><label for="bw">${t('add.website')}</label><input id="bw" name="website" maxlength="200" value="${esc(v.website || '')}" placeholder="https://…"></div>
        <div class="f-row"><label for="bp">${t('add.phone')}</label><input id="bp" name="phone" maxlength="30" value="${esc(v.phone || '')}"></div>
      </div>
      <button class="btn btn-green w100" type="submit">${t('add.submit')} →</button>
    </form>
  </div></section>` });
}

// ---------- CLAIM ----------
function claimPage({ user, b, err }) {
  return layout({ title: `Claim ${b.name} — The Legit Rank`, user, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${t('claim.title')}</h1>
    <p class="sec-sub muted">${esc(b.name)} — ${esc(b.city)}, ${esc(b.country)}</p>
    <p class="sec-sub muted">${t('claim.sub')}</p>
    <form class="form" method="post" action="/claim/${esc(b.slug)}">
      ${err === 'invalid' ? `<div class="form-err">Please fill in all required fields.</div>` : ''}
      <div class="f-row"><label for="cd">${t('claim.details')}</label><textarea id="cd" name="details" rows="4" required maxlength="1000" placeholder="${esc(tRaw('claim.detailsPh'))}"></textarea></div>
      <div class="f-row"><label for="cc">${t('claim.contact')}</label><input id="cc" name="contact" required maxlength="120" placeholder="${esc(tRaw('claim.contactPh'))}"></div>
      <button class="btn btn-green w100" type="submit">${t('claim.submit')} →</button>
    </form>
  </div></section>` });
}

// ---------- DASHBOARD ----------
function dashboard({ user, reviews, owned, pendingV, msg }) {
  const bizRows = owned.map(b => {
    const pv = pendingV[b.id];
    return `
    <div class="card row-card">
      <div>
        <b><a href="/business/${esc(b.slug)}">${esc(b.name)}</a></b>
        <p class="muted small">${esc(b.category)} · ${esc(b.city)} ·
          ${b.verified ? `<span class="v-chip">✓ ${t('dash.verified')}</span>`
            : pv ? `<span class="p-chip">${t('dash.pendingVerify')}</span>`
            : `<span class="nv-chip">${t('biz.notVerified')}</span>`}
        </p>
      </div>
      <div class="row-actions">
        ${!b.verified && !pv ? `<a class="btn-mini btn-mini-g" href="/business/${esc(b.slug)}/verify">${t('dash.applyVerify')}</a>` : ''}
        <a class="btn-mini" href="/business/${esc(b.slug)}">${t('dash.manage')}</a>
      </div>
    </div>`;
  }).join('');

  const revRows = reviews.map(r => `
    <div class="card row-card">
      <div>
        <b><a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a></b>
        <span class="stars-a">${stars(r.rating)}</span>
        <p class="small muted">${esc((r.title || r.body).slice(0, 90))}</p>
      </div>
    </div>`).join('');

  return layout({ title: 'My account — The Legit Rank', user, content: `
  <section class="page-head"><div class="wrap">
    <h1 class="sec">${t('dash.title')}</h1>
    <p class="sec-sub muted">${esc(user.name)} · ${esc(user.email)}</p>
    ${flash(msg || '')}
    <h2 class="dash-h">${t('dash.myBusinesses')}</h2>
    ${owned.length ? bizRows : `<div class="empty"><p class="muted">${t('dash.noBusinesses')}</p></div>`}
    <h2 class="dash-h">${t('dash.myReviews')}</h2>
    ${reviews.length ? revRows : `<div class="empty"><p class="muted">${t('dash.noReviews')}</p></div>`}
  </div></section>` });
}

// owner's business management: respond to reviews
function bizManagePage({ user, b, reviews }) {
  const items = reviews.map(r => `
    <div class="card row-card col">
      <div class="review-head">
        <div class="avatar">${esc((r.author_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</div>
        <div class="who"><b>${esc(r.author_name)}</b><span>${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
        <span class="stars-a push">${stars(r.rating)}</span>
      </div>
      ${r.title ? `<h4>${esc(r.title)}</h4>` : ''}
      <p>${esc(r.body)}</p>
      ${r.response_text
        ? `<div class="resp-block"><b>↩ ${t('biz.response')}</b><p>${esc(r.response_text)}</p></div>`
        : `<form method="post" action="/business/${esc(b.slug)}/respond/${r.id}" class="form resp-form">
             <textarea name="response" rows="3" required maxlength="1000" placeholder="${esc(tRaw('resp.title'))}…"></textarea>
             <button class="btn-mini btn-mini-g" type="submit">${t('resp.submit')}</button>
           </form>`}
    </div>`).join('');

  return layout({ title: `Manage ${b.name} — The Legit Rank`, user, content: `
  <section class="page-head"><div class="wrap">
    <h1 class="sec">${esc(b.name)}</h1>
    <p class="sec-sub muted"><a href="/business/${esc(b.slug)}">${t('biz.reviews')} →</a></p>
    ${reviews.length ? items : `<div class="empty"><p class="muted">${t('biz.noReviews')}</p></div>`}
  </div></section>` });
}

// ---------- VERIFICATION APPLY ----------
function verifyPage({ user, b, err, pending }) {
  if (pending) {
    return layout({ title: 'Verification — The Legit Rank', user, content: `
    <section class="page-head"><div class="wrap narrow">
      <h1 class="sec">${t('ver.title')}</h1>
      <div class="empty"><p class="p-chip">${t('dash.pendingVerify')}</p></div>
    </div></section>` });
  }
  return layout({ title: 'Verification — The Legit Rank', user, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${t('ver.title')}</h1>
    <p class="sec-sub muted">${esc(b.name)} — ${t('ver.sub')}</p>
    <form class="form" method="post" action="/business/${esc(b.slug)}/verify">
      ${err === 'invalid' ? '<div class="form-err">Please fill in all required fields.</div>' : ''}
      <div class="f-row"><label for="it">${t('ver.idType')}</label>
        <select id="it" name="id_type"><option>National ID</option><option>Passport</option><option>Drivers Licence</option><option>Business Registration</option></select></div>
      <div class="f-row"><label for="in2">${t('ver.idNumber')}</label><input id="in2" name="id_number" required maxlength="60"></div>
      <div class="f-row"><label for="pm">${t('ver.payMethod')}</label>
        <select id="pm" name="pay_method"><option>Mobile Money</option><option>Bank Account</option><option>Other</option></select></div>
      <div class="f-row"><label for="pn">${t('ver.payName')}</label><input id="pn" name="pay_name" required maxlength="80"></div>
      <div class="f-row"><label for="nt">${t('ver.notes')}</label><textarea id="nt" name="notes" rows="3" maxlength="500"></textarea></div>
      <button class="btn btn-green w100" type="submit">${t('ver.submit')} →</button>
    </form>
  </div></section>` });
}

// ---------- ADMIN ----------
function adminPage({ user, vers, claims, bizs, revs, tab, msg }) {
  const tabs = ['verifications', 'claims', 'businesses', 'reviews'].map(t2 =>
    `<a class="chip ${t2 === tab ? 'chip-on' : ''}" href="/admin?tab=${t2}">${esc(t2)}</a>`).join('');

  let body = `<div class="empty"><p class="muted">${t('adm.none')}</p></div>`;

  if (tab === 'verifications' && vers.length) {
    body = vers.map(v => `
      <div class="card row-card col">
        <b>${esc(v.biz_name)}</b>
        <p class="small muted">${t('adm.by')}: ${esc(v.user_name)} · ${esc(v.id_type)} ${esc(v.id_number)} · ${esc(v.pay_method)} (${esc(v.pay_name)})</p>
        ${v.notes ? `<p class="small">${esc(v.notes)}</p>` : ''}
        <div class="row-actions">
          <form method="post" action="/admin/verification/${v.id}" class="inline"><input type="hidden" name="decision" value="approve"><button class="btn-mini btn-mini-g">${t('adm.approve')}</button></form>
          <form method="post" action="/admin/verification/${v.id}" class="inline"><input type="hidden" name="decision" value="reject"><button class="btn-mini">${t('adm.reject')}</button></form>
        </div>
      </div>`).join('');
  }
  if (tab === 'claims' && claims.length) {
    body = claims.map(c => `
      <div class="card row-card col">
        <b>${esc(c.biz_name)}</b>
        <p class="small muted">${t('adm.by')}: ${esc(c.user_name)} (${esc(c.contact)})</p>
        <p class="small">${esc(c.details)}</p>
        <div class="row-actions">
          <form method="post" action="/admin/claim/${c.id}" class="inline"><input type="hidden" name="decision" value="approve"><button class="btn-mini btn-mini-g">${t('adm.approve')}</button></form>
          <form method="post" action="/admin/claim/${c.id}" class="inline"><input type="hidden" name="decision" value="reject"><button class="btn-mini">${t('adm.reject')}</button></form>
        </div>
      </div>`).join('');
  }
  if (tab === 'businesses' && bizs.length) {
    body = bizs.map(b => `
      <div class="card row-card">
        <div><b><a href="/business/${esc(b.slug)}">${esc(b.name)}</a></b>
          <p class="small muted">${esc(b.city)}, ${esc(b.country)} · ${b.avg_rating || '–'} ★ · ${b.review_count} · ${b.verified ? '✓' : '×'}</p></div>
        <div class="row-actions">
          ${b.verified ? '' : `<form method="post" action="/admin/business/${b.id}/verify" class="inline"><button class="btn-mini btn-mini-g">${t('adm.approve')}</button></form>`}
          <form method="post" action="/admin/business/${b.id}/${b.status === 'active' ? 'remove' : 'restore'}" class="inline">
            <button class="btn-mini">${b.status === 'active' ? t('adm.remove') : t('adm.restore')}</button></form>
        </div>
      </div>`).join('');
  }
  if (tab === 'reviews' && revs.length) {
    body = revs.map(r => `
      <div class="card row-card">
        <div><b><a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a></b>
          <p class="small">${stars(r.rating)} ${esc((r.title || r.body).slice(0, 100))}</p>
          <p class="small muted">${t('adm.by')} ${esc(r.author_name)} ${r.hidden ? '· hidden' : ''}</p></div>
        <div class="row-actions">
          <form method="post" action="/admin/review/${r.id}/${r.hidden ? 'show' : 'hide'}" class="inline">
            <button class="btn-mini">${r.hidden ? t('adm.show') : t('adm.hide')}</button></form>
        </div>
      </div>`).join('');
  }

  return layout({ title: 'Admin — The Legit Rank', user, content: `
  <section class="page-head"><div class="wrap">
    <h1 class="sec">${t('adm.title')}</h1>
    <div class="chips">${tabs}</div>
    ${flash(msg || '')}
    ${body}
  </div></section>` });
}

// ---------- 404 ----------
function notFound({ user }) {
  return layout({ title: 'Not found — The Legit Rank', user, content: `
  <section class="page-head"><div class="wrap narrow center">
    <h1 class="sec">404</h1>
    <p class="muted">The page you're looking for doesn't exist.</p>
    <p><a class="btn btn-green" href="/">The Legit Rank →</a></p>
  </div></section>` });
}

module.exports = { layout, home, searchPage, businessPage, reviewForm, loginPage, signupPage,
  addBizPage, claimPage, dashboard, bizManagePage, verifyPage, adminPage, notFound, stars, bizCard };
