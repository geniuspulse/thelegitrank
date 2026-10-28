// views.js — server-rendered HTML templates
const { t, tRaw, esc } = require('./i18n');
const SEO = require('./seo');

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
      <div class="biz-avatar">${b.logo_path ? `<img src="/logo/${b.id}" alt="${esc(b.name)}">` : esc(b.name.slice(0, 2).toUpperCase())}</div>
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

function layout({ title, content, user, hero = false, seo }) {
  const nav = `
  <nav aria-label="Main">
    <div class="wrap nav-inner">
      <a class="logo" href="/">
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
${SEO.head(Object.assign({ title }, seo || {}))}
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
    <span>${t('nav.tagline')} — ${tRaw('home.ctaSub')}</span>
    <div class="foot-cats">
      <span class="foot-cats-l">${t('nav.byCategory')}</span>
      ${CATEGORIES.map(c => `<a href="/search?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}
    </div>
    © ${new Date().getFullYear()} The Legit Rank ·
    <a class="foot-link" href="/terms">Terms</a> ·
    <a class="foot-link" href="/privacy">Privacy</a> ·
    <a class="foot-link" href="/cookies">Cookies</a>
  </div>
</footer>
<script src="/app.js"></script>
</body>
</html>`;
}

const FLASH_ERR = ['error', 'passWrong', 'nameMissing', 'revRate', 'restricted', 'ownBiz', 'noPerm'];
function flash(msg) {
  if (!msg) return '';
  const m = FLASH_ERR.includes(msg) ? 'fl-err' : 'fl-ok';
  const text = {
    reviewPosted: tRaw('rev.posted'), reviewUpdated: tRaw('rev.updated'),
    reviewDeleted: tRaw('rev.deleted'), acctCreated: tRaw('auth.acctCreated'),
    bizAdded: tRaw('add.added'), claimSent: tRaw('claim.sent'),
    verSent: tRaw('ver.sent'), respPosted: tRaw('resp.posted'),
    approved: tRaw('adm.approved'), rejected: tRaw('adm.rejected'),
    'rep.done': tRaw('rep.done'), restricted: tRaw('rev.restricted'), revRate: tRaw('rev.rate'), ownBiz: tRaw('msg.ownBiz'), deleted: 'Listing permanently deleted.',
    nameUpdated: tRaw('dash.nameUpdated'), nameMissing: tRaw('dash.nameMissing'),
    passUpdated: tRaw('dash.passUpdated'), passWrong: tRaw('dash.passWrong'),
    noPerm: tRaw('msg.noPerm'), respRemoved: tRaw('mg.respRemoved'),
    profileSaved: tRaw('msg.profileSaved'),
  }[msg];
  if (!text) return '';
  return `<div class="wrap"><div class="flash ${m}">${esc(text)}</div></div>`;
}

// ---------- HOME ----------
function home({ user, stats, top, msg }) {
  const seo = {
    title: 'The Legit Rank — Real reviews of African businesses',
    desc: `Check a business before you pay. ${stats.businesses} African business${stats.businesses === 1 ? '' : 'es'}, ${stats.reviews} buyer review${stats.reviews === 1 ? '' : 's'} and ${stats.verified} verified seller${stats.verified === 1 ? '' : 's'}, with honest ratings you can trust.`,
    path: '/',
    jsonLd: [SEO.websiteLd(), SEO.orgLd()],
  };
  return layout({ title: 'The Legit Rank — The truth before you buy', user, hero: true, seo, content: `
  ${flash(msg || '')}
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
  const catPart = category ? `${category} businesses` : 'African businesses';
  const seo = q ? {
    title: `Search results for “${q}” — The Legit Rank`,
    desc: `Businesses matching “${q}” on The Legit Rank. Read buyer reviews and ratings before you pay.`,
    path: `/search?q=${encodeURIComponent(q)}${category ? '&category=' + encodeURIComponent(category) : ''}`,
    noindex: true,
  } : {
    title: `${catPart[0].toUpperCase() + catPart.slice(1)} — reviews and ratings — The Legit Rank`,
    desc: `Browse ${category ? category.toLowerCase() + ' businesses' : 'businesses'} reviewed by real buyers across Africa. ${results.length} listings with ratings, reviews and verified seller badges.`,
    path: category ? `/search?category=${encodeURIComponent(category)}` : '/search',
    jsonLd: [SEO.breadcrumbLd(category
      ? [{ name: 'Home', path: '/' }, { name: 'Browse', path: '/search' }, { name: category, path: `/search?category=${encodeURIComponent(category)}` }]
      : [{ name: 'Home', path: '/' }, { name: 'Browse', path: '/search' }])],
  };
  return layout({ title: (q ? `${q} — ` : '') + 'Search — The Legit Rank', user, seo, content: `
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
      <div class="who"><b>${esc(r.author_name)}</b><span>${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${r.updated_at ? ' · ' + t('biz.updated') : ''}</span></div>
      ${r.verified_purchase ? `<span class="vp-chip">✓ ${t('biz.vp')}</span>` : ''}
      <span class="stars-a push">${stars(r.rating)}</span>
    </div>
    ${r.title ? `<h4>${esc(r.title)}</h4>` : ''}
    ${r.photo_path ? `<a href="/photo/${r.id}" target="_blank"><img class="rev-photo" src="/photo/${r.id}" alt="review photo" loading="lazy"></a>` : ''}
    <p>${esc(r.body)}</p>
    ${r.response_text ? `
      <div class="resp-block">
        <b>↩ ${t('biz.response')}</b>
        <p>${esc(r.response_text)}</p>
      </div>` : ''}
  </article>`;
}

function businessPage({ user, b, reviews, dist, page, pages, myRev, alreadyReviewed, msg, canEdit }) {
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
    : `<a class="btn btn-green" href="/signup?next=${encodeURIComponent('/business/' + b.slug + '/review')}">${t('biz.writeReview')} →</a>`;

  const ownerBar = b.owner_user_id
    ? ''
    : `<a class="claim-link" href="/claim/${esc(b.slug)}">${t('biz.claim')}</a> <a class="claim-link" href="/report?type=scam&biz=${esc(b.slug)}">${t('biz.report')}</a>`;

  const seo = {
    title: `${b.name} reviews — ${b.city}, ${b.country}`,
    desc: b.review_count
      ? `${b.name} in ${b.city}, ${b.country} is rated ${b.avg_rating} out of 5 from ${b.review_count} buyer review${b.review_count === 1 ? '' : 's'}. Read real experiences before you pay.`
      : (b.description || `${b.name} — ${b.category} in ${b.city}, ${b.country}. Be the first to review them on The Legit Rank.`),
    path: `/business/${b.slug}`,
    image: b.logo_path ? `/logo/${b.id}` : null,
    type: 'business.business',
    modified: (b.updated_at || b.created_at || '').slice(0, 10) || undefined,
    jsonLd: [
      SEO.businessLd(b, reviews),
      SEO.breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Browse', path: '/search' },
        { name: b.category || 'Business', path: `/search?category=${encodeURIComponent(b.category || '')}` },
        { name: b.name, path: `/business/${b.slug}` },
      ]),
    ],
  };
  return layout({ title: `${b.name} — Reviews — The Legit Rank`, user, seo, content: `
  ${flash(msg || '')}
  <section class="biz-hero">
    <div class="wrap">
      <div class="biz-hero-top">
        <div class="biz-avatar big">${b.logo_path ? `<img src="/logo/${b.id}" alt="${esc(b.name)}">` : esc(b.name.slice(0, 2).toUpperCase())}</div>
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
        ${canEdit ? `<a class="btn-mini" href="/business/${esc(b.slug)}/manage">${t('mg.manage')}</a>` : ''}
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

  <section class="feedback-band">
    <div class="wrap fb-grid">
      <div class="fb-prompt">
        <h3>${t('fb.title')}</h3>
        <p>${t('fb.sub')}</p>
        <div class="fb-stars" data-url="/business/${esc(b.slug)}/review" role="group" aria-label="${esc(tRaw('fb.tap'))}">
          <button class="fstar" type="button" aria-label="1 star">★</button>
          <button class="fstar" type="button" aria-label="2 stars">★</button>
          <button class="fstar" type="button" aria-label="3 stars">★</button>
          <button class="fstar" type="button" aria-label="4 stars">★</button>
          <button class="fstar" type="button" aria-label="5 stars">★</button>
        </div>
        <a class="btn btn-green" href="${user ? `/business/${esc(b.slug)}/review` : `/signup?next=${encodeURIComponent('/business/' + b.slug + '/review')}`}">${t('biz.writeReview')} →</a>
      </div>
      <div class="fb-stat">
        ${total
          ? `<b>${Math.round((dist[4] + dist[5]) / total * 100)}%</b><span>${t('fb.recommend')}</span>`
          : `<b>–</b><span>${t('fb.noFeedback')}</span>`}
      </div>
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
  const seo = {
    title: `${existing ? 'Update your review of' : 'Write a review for'} ${b.name} — ${b.city}`,
    desc: `Share your experience with ${b.name} in ${b.city}, ${b.country}. Real buyer reviews help people across Africa buy with confidence.`,
    path: `/business/${b.slug}/review`,
    noindex: true,
    jsonLd: [SEO.breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: b.name, path: `/business/${b.slug}` },
      { name: existing ? 'Update review' : 'Write review', path: `/business/${b.slug}/review` },
    ])],
  };
  return layout({ title: `${existing ? 'Update' : 'Write'} review — ${b.name}`, user, seo, content: `
  <section class="rv-hero">
    <div class="wrap narrow">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span>
        <a href="/search?category=${encodeURIComponent(b.category || '')}">${esc(b.category || 'Browse')}</a><span>/</span>
        <a href="/business/${esc(b.slug)}">${esc(b.name)}</a><span>/</span>
        <b>${existing ? 'Update review' : 'Write review'}</b>
      </nav>
      <div class="rv-hero-top">
        <div class="biz-avatar big">${b.logo_path ? `<img src="/logo/${b.id}" alt="${esc(b.name)} logo">` : esc(b.name.slice(0, 2).toUpperCase())}</div>
        <div class="rv-hero-copy">
          <h1>${t(existing ? 'rev.heroEdit' : 'rev.hero')} <span class="rv-hero-name">${esc(b.name)}</span></h1>
          <p class="rv-hero-meta">${esc(b.category)} · ${esc(b.city)}, ${esc(b.country)}</p>
          ${b.review_count
            ? `<p class="rv-hero-score"><span class="stars-a">${stars(b.avg_rating)}</span> <b>${b.avg_rating}</b><span class="rv-of">/5</span> · ${b.review_count} ${t(b.review_count === 1 ? 'rev.reviewOne' : 'rev.reviewsWord')}</p>`
            : `<p class="rv-hero-score muted">${t('rev.firstReview')}</p>`}
        </div>
      </div>
    </div>
  </section>
  <section class="page-head rv-head">
    <div class="wrap narrow">
      <p class="sec-sub muted">${t('rev.rules')}</p>
      <form class="form" method="post" action="/business/${esc(b.slug)}/review" enctype="multipart/form-data">
        <input type="hidden" name="rating" id="ratingVal" value="${r.rating}">
        <div class="f-row"><label>${t('rev.rating')}</label><div class="stars-input">${cur}</div></div>
        <div class="f-row"><label for="rt">${t('rev.name')}</label><input id="rt" name="title" maxlength="100" value="${esc(r.title)}" placeholder="${esc(tRaw('rev.namePh'))}"></div>
        <div class="f-row"><label for="rb">${t('rev.body')}</label><textarea id="rb" name="body" rows="5" maxlength="2000" required placeholder="${esc(tRaw('rev.bodyPh'))}">${esc(r.body)}</textarea></div>
        <div class="f-row"><label for="ph">${t('rev.photo')}</label><input id="ph" name="photo" type="file" accept="image/png,image/jpeg,image/webp">
        <p class="tiny muted">${t('rev.photoHelp')}</p></div>
        <div class="f-row"><label for="rc">${t('rev.receipt')}</label><input id="rc" name="receipt" type="file" accept="image/png,image/jpeg,image/webp">
        <p class="tiny muted">${t('rev.receiptHelp')}</p></div>
        <div class="f-actions"><button class="btn btn-green" type="submit">${t('rev.submit')} →</button>
        <a class="btn btn-ghost" href="/business/${esc(b.slug)}">${t('common.cancel')}</a></div>
      </form>
    </div>
  </section>` });
}

// ---------- AUTH ----------
function loginPage({ next, err, google, msg }) {
  const googleMsg = msg === 'googleFail' ? '<div class="form-err">Google sign-in could not be completed. Please try again.</div>'
    : msg === 'googleOff' ? '<div class="form-err">Google sign-in is not configured yet.</div>'
    : msg === 'googleSuspended' ? '<div class="form-err">This account is suspended.</div>' : '';
  return layout({ title: 'Log in — The Legit Rank', user: null, seo: { desc: 'Log in to The Legit Rank to write reviews, manage your business and track replies.', path: '/login', noindex: true }, content: `
  <section class="auth-hero">
    <div class="wrap narrow">
      <span class="badge-lg"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" fill="#00c07a"/><path d="M8.6 12.2l2.2 2.2 4.6-4.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <h1>${t('auth.loginTitle')}</h1>
      <p class="sub">${t('auth.loginSub')}</p>
      <ul class="trust"><li>✓ ${t('auth.trust1')}</li><li>✓ ${t('auth.trust2')}</li><li>✓ ${t('auth.trust3')}</li></ul>
    </div>
  </section>
  <section class="auth-body">
    <div class="wrap narrow">
      <form class="form auth-card" method="post" action="/login">
        <input type="hidden" name="next" value="${esc(next || '')}">
        ${googleMsg}
        ${err === 'suspended' ? `<div class="form-err">${t('auth.suspended')}</div>` : err ? `<div class="form-err">${t('auth.badlogin')}</div>` : ''}
        ${google ? `<a class="btn-google" href="/auth/google${next ? `?next=${encodeURIComponent(next)}` : ''}">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.3-4.5 2.1-8.1 2.1-6.3 0-11.7-3.7-13.6-8.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Continue with Google
        </a>
        <div class="auth-or"><span>${t('auth.or')}</span></div>` : ''}
        <div class="f-row"><label for="em">${t('auth.email')}</label><div class="f-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg><input id="em" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div></div>
        <div class="f-row"><label for="pw">${t('auth.password')}</label><div class="f-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="pw" name="password" type="password" required autocomplete="current-password" placeholder="••••••••"></div></div>
        <button class="btn btn-green w100" type="submit">${t('auth.enter')} →</button>
      </form>
      <p class="center muted small auth-alt"><a href="/signup${next ? `?next=${encodeURIComponent(next)}` : ''}">${t('auth.noAccount')}</a></p>
    </div>
  </section>` });
}

function signupPage({ err, values, next, google }) {
  const v = values || {};
  const nx = next && next.startsWith('/') && !next.startsWith('//') ? next : '';
  const errBox = err === 'taken' ? `<div class="form-err">${t('auth.emailTaken')}</div>` :
                 err ? '<div class="form-err">Please fill in all fields. Password must be at least 8 characters.</div>' : '';
  return layout({ title: 'Sign up — The Legit Rank', user: null, seo: { desc: 'Create a free account on The Legit Rank to review businesses and build trust across Africa.', path: '/signup', noindex: true }, content: `
  <section class="auth-hero">
    <div class="wrap narrow">
      <span class="badge-lg"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" fill="#00c07a"/><path d="M8.6 12.2l2.2 2.2 4.6-4.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <h1>${t('auth.signupTitle')}</h1>
      <p class="sub">${t('auth.signupSub')}</p>
      <ul class="trust"><li>✓ ${t('auth.trust1')}</li><li>✓ ${t('auth.trust2')}</li><li>✓ ${t('auth.trust3')}</li></ul>
    </div>
  </section>
  <section class="auth-body">
    <div class="wrap narrow">
      <form class="form auth-card" method="post" action="/signup">
        <input type="hidden" name="next" value="${esc(nx)}">
        ${errBox}
        ${google ? `<a class="btn-google" href="/auth/google${nx ? `?next=${encodeURIComponent(next)}` : ''}">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.3-4.5 2.1-8.1 2.1-6.3 0-11.7-3.7-13.6-8.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Continue with Google
        </a>
        <div class="auth-or"><span>${t('auth.or')}</span></div>` : ''}
        <div class="f-row"><label for="nm">${t('auth.name')}</label><div class="f-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg><input id="nm" name="name" required maxlength="80" value="${esc(v.name || '')}" placeholder="Your full name"></div></div>
        <div class="f-row"><label for="em">${t('auth.email')}</label><div class="f-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg><input id="em" name="email" type="email" required maxlength="120" value="${esc(v.email || '')}" placeholder="you@example.com"></div></div>
        <div class="f-row"><label for="pw">${t('auth.password')}</label><div class="f-ico"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="pw" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div></div>
        <button class="btn btn-green w100 auth-submit" type="submit">${t('auth.create')} →</button>
      </form>
      <p class="center muted small auth-alt"><a href="/login${nx ? `?next=${encodeURIComponent(nx)}` : ''}">${t('auth.haveAccount')}</a></p>
    </div>
  </section>` });
}

// ---------- ADD BUSINESS ----------
function addBizPage({ user, err, values, added, dups }) {
  const v = values || {};
  const dupBox = (err === 'dup' && (dups || []).length) ? `
    <div class="dup-box">
      <b>${t('add.dupTitle')}</b>
      <ul>${dups.map(d => `<li><a href="/business/${esc(d.slug)}">${esc(d.name)}</a> — ${esc(d.city)}</li>`).join('')}</ul>
      <label class="confirm-row"><input type="checkbox" name="confirm_dup"> ${t('add.dupConfirm')}</label>
    </div>` : '';
  const errBox = err === 'exists' ? `<div class="form-err">${t('add.exists')}</div>` :
                 err === 'invalid' ? `<div class="form-err">Please fill in all required fields.</div>` :
                 err === 'dup' ? `<div class="form-err">${t('add.dupWarn')}</div>` : '';
  const catOpts = CATEGORIES.map(c => `<option ${v.category === c ? 'selected' : ''}>${c}</option>`).join('');
  const ctyOpts = COUNTRIES.map(c => `<option ${v.country === c ? 'selected' : ''}>${c}</option>`).join('');
  return layout({ title: 'Add a business — The Legit Rank', user, seo: { desc: 'Add an African business to The Legit Rank so buyers can review and rate it.', path: '/businesses/new', noindex: true }, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${t('add.title')}</h1>
    <p class="sec-sub muted">${t('add.sub')}</p>
    <form class="form" method="post" action="/businesses/new" enctype="multipart/form-data">
      ${errBox}
      ${dupBox}
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
      <div class="f-row"><label for="bl">${t('add.logo')}</label><input id="bl" name="logo" type="file" accept="image/png,image/jpeg,image/webp">
      <p class="tiny muted">${t('add.logoHelp')}</p></div>
      <button class="btn btn-green w100" type="submit">${t('add.submit')} →</button>
    </form>
  </div></section>` });
}

// ---------- CLAIM ----------
function claimPage({ user, b, err }) {
  return layout({ title: `Claim ${b.name} — The Legit Rank`, user, seo: { desc: `Claim ${b.name} on The Legit Rank to reply to reviews and manage your listing.`, path: `/claim/${b.slug}`, noindex: true }, content: `
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
function dashboard({ user, reviews, owned, pendingV, hidden, appeals, msg }) {
  const initials = esc((user.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase());
  const since = new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const verifiedCount = owned.filter(b => b.verified).length;

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
          ${!b.owner_user_id ? `<span class="p-chip">${t('dash.unclaimed')}</span>` : ''}
        </p>
      </div>
      <div class="row-actions">
        ${!b.verified && !pv ? `<a class="btn-mini btn-mini-g" href="/business/${esc(b.slug)}/verify">${t('dash.applyVerify')}</a>` : ''}
        ${(b.owner_user_id === user.id || b.created_by === user.id || user.role === 'admin')
          ? `<a class="btn-mini" href="/business/${esc(b.slug)}/manage">${t('dash.manage')}</a>`
          : ''}
        ${!b.owner_user_id
          ? `<a class="btn-mini btn-mini-g" href="/claim/${esc(b.slug)}">${t('dash.claim')}</a>`
          : ''}
      </div>
    </div>`;
  }).join('');

  const revRows = reviews.map(r => `
    <div class="card row-card col">
      <div class="rev-me-top">
        <b><a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a></b>
        <span class="stars-a">${stars(r.rating)}</span>
        <span class="muted small">${new Date(r.created_at).toLocaleDateString('en-GB')}</span>
      </div>
      ${r.title ? `<h4 class="rev-me-title">${esc(r.title)}</h4>` : ''}
      <p class="small muted">${esc((r.body || '').slice(0, 140))}</p>
      <div class="row-actions self-start">
        <a class="btn-mini" href="/business/${esc(r.biz_slug)}/review">${t('dash.edit')} →</a>
        <a class="btn-mini" href="/review/${r.id}/delete">${t('dash.delete')}</a>
      </div>
    </div>`).join('');

  return layout({ title: 'My account — The Legit Rank', user, seo: { desc: 'Your The Legit Rank account: reviews, businesses and settings.', path: '/dashboard', noindex: true }, content: `
  <section class="dash-hero">
    <div class="wrap dash-top">
      <div class="dash-av">${initials}</div>
      <div>
        <h1>${esc(user.name)}</h1>
        <p class="sub">${esc(user.email)} · ${t('dash.memberSince')} ${since}</p>
      </div>
    </div>
    <div class="wrap dash-stats">
      <div class="chip-stat"><b>${reviews.length}</b><span>${t('dash.statReviews')}</span></div>
      <div class="chip-stat"><b>${owned.length}</b><span>${t('dash.statBiz')}</span></div>
      <div class="chip-stat"><b>${verifiedCount}</b><span>${t('dash.statVerified')}</span></div>
    </div>
  </section>
  <section class="pad"><div class="wrap">
    ${flash(msg || '')}
    <h2 class="dash-h">${t('dash.myReviews')}</h2>
    ${reviews.length ? revRows : `<div class="empty"><p class="muted">${t('dash.noReviews')}</p><a class="btn-mini btn-mini-g" href="/search">${t('nav.browse')} →</a></div>`}
    ${hidden.length ? `
    <h2 class="dash-h">${t('dash.hiddenTitle')}</h2>
    ${hidden.map(r => {
      const ap = appeals[r.id];
      return `
      <div class="card row-card col">
        <div class="rev-me-top">
          <b><a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a></b>
          <span class="stars-a">${stars(r.rating)}</span>
          <span class="p-chip">${t('dash.hiddenChip')}</span>
        </div>
        <p class="small muted">${esc((r.body || '').slice(0, 140))}</p>
        ${r.hidden_reason ? `<p class="small muted">${t('dash.hiddenReason')}: ${esc(r.hidden_reason)}</p>` : ''}
        ${ap ? `<span class="nv-chip">${t('dash.appealState')}: ${esc(ap.status)}</span>`
             : `<form method="post" action="/appeal/${r.id}" class="form resp-form">
                  <textarea name="reason" rows="2" required maxlength="500" placeholder="${esc(tRaw('dash.appealPh'))}"></textarea>
                  <button class="btn-mini btn-mini-g" type="submit">${t('dash.appeal')} →</button>
                </form>`}
      </div>`;
    }).join('')}
    ` : ''}
    <h2 class="dash-h">${t('dash.myBusinesses')}</h2>
    ${owned.length ? bizRows : `<div class="empty"><p class="muted">${t('dash.noBusinesses')}</p><a class="btn-mini btn-mini-g" href="/businesses/new">${t('dash.addBiz')} →</a></div>`}
    <h2 class="dash-h">${t('dash.settings')}</h2>
    <div class="settings-grid">
      <form method="post" action="/settings/profile" class="card form form-compact">
        <div class="f-row"><label for="dn">${t('dash.displayName')}</label><input id="dn" name="name" required maxlength="80" value="${esc(user.name)}"></div>
        <button class="btn btn-green" type="submit">${t('dash.save')}</button>
      </form>
      <form method="post" action="/settings/password" class="card form form-compact">
        <div class="f-row"><label for="cp">${t('dash.currentPass')}</label><input id="cp" name="current" type="password" required autocomplete="current-password"></div>
        <div class="f-row"><label for="np">${t('dash.newPass')}</label><input id="np" name="next" type="password" required minlength="8" autocomplete="new-password"></div>
        <button class="btn btn-green" type="submit">${t('dash.updatePass')}</button>
      </form>
    </div>
  </div></section>` });
}

// owner's business management: respond to reviews
function bizManagePage({ user, b, reviews, verif, msg }) {
  const responded = reviews.filter(r => r.response_text).length;
  const rate = reviews.length ? Math.round(responded / reviews.length * 100) : 0;
  const statusChip = b.verified
    ? `<span class="v-chip">✓ ${t('dash.verified')}</span>`
    : verif && verif.status === 'pending'
      ? `<span class="p-chip">${t('dash.pendingVerify')}</span>`
      : verif && verif.status === 'docs_requested'
        ? `<span class="p-chip">${t('mg.moreInfo')}</span>`
        : `<span class="nv-chip">${t('biz.notVerified')}</span>`;
  const ownerChip = b.owner_user_id ? '' : `<span class="p-chip">${t('dash.unclaimed')}</span>`;

  const items = reviews.map(r => `
    <div class="card row-card col">
      <div class="review-head">
        <div class="avatar">${esc((r.author_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</div>
        <div class="who"><b>${esc(r.author_name)}</b><span>${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
        <a class="muted small" href="/report?type=review&review=${r.id}">${t('biz.report')}</a>
        <span class="stars-a push">${stars(r.rating)}</span>
      </div>
      ${r.title ? `<h4>${esc(r.title)}</h4>` : ''}
      <p>${esc(r.body)}</p>
      ${r.hidden ? `<span class="p-chip">${t('dash.hiddenChip')}</span>` : ''}
      ${r.response_text
        ? `<div class="resp-block"><b>↩ ${t('biz.response')}</b><p>${esc(r.response_text)}</p></div>
           <form method="post" action="/business/${esc(b.slug)}/respond/${r.id}" class="form resp-form">
             <textarea name="response" rows="3" maxlength="1000" placeholder="${esc(tRaw('resp.title'))}…">${esc(r.response_text)}</textarea>
             <div class="row-actions">
               <button class="btn-mini btn-mini-g" type="submit">${t('mg.updateResponse')}</button>
               <button class="btn-mini" type="submit" name="remove" value="1">${t('mg.removeResponse')}</button>
             </div>
           </form>`
        : `<form method="post" action="/business/${esc(b.slug)}/respond/${r.id}" class="form resp-form">
             <textarea name="response" rows="3" required maxlength="1000" placeholder="${esc(tRaw('resp.title'))}…"></textarea>
             <button class="btn-mini btn-mini-g" type="submit">${t('resp.submit')}</button>
           </form>`}
    </div>`).join('');

  const catOpts = CATEGORIES.map(c => `<option ${b.category === c ? 'selected' : ''}>${c}</option>`).join('');
  const ctyOpts = COUNTRIES.map(c => `<option ${b.country === c ? 'selected' : ''}>${c}</option>`).join('');
  return layout({ title: `Manage ${b.name} — The Legit Rank`, user, seo: { desc: `Manage the ${b.name} listing on The Legit Rank.`, path: `/business/${b.slug}/manage`, noindex: true }, content: `
  <section class="page-head"><div class="wrap">
    <h1 class="sec">${esc(b.name)}</h1>
    <p class="sec-sub muted">${statusChip} ${ownerChip}</p>
    <div class="mg-stats">
      <div class="mg-stat"><b>${b.avg_rating || '—'}</b><span>${t('mg.avgRating')}</span></div>
      <div class="mg-stat"><b>${reviews.length}</b><span>${t('mg.totalReviews')}</span></div>
      <div class="mg-stat"><b>${rate}%</b><span>${t('mg.responseRate')}</span></div>
      <div class="mg-stat"><b>${responded}</b><span>${t('mg.responded')}</span></div>
    </div>
    <div class="row-actions mg-actions">
      <a class="btn-mini" href="/business/${esc(b.slug)}">${t('mg.viewPublic')} →</a>
      ${!b.verified && !(verif && verif.status === 'pending')
        ? `<a class="btn-mini btn-mini-g" href="/business/${esc(b.slug)}/verify">${t('dash.applyVerify')}</a>` : ''}
      ${!b.owner_user_id ? `<a class="btn-mini btn-mini-g" href="/claim/${esc(b.slug)}">${t('dash.claim')}</a>` : ''}
    </div>
    ${flash(msg || '')}
    <h2 class="dash-h">${t('mg.details')}</h2>
    <form class="form" method="post" action="/business/${esc(b.slug)}/profile" enctype="multipart/form-data">
      <div class="f2">
        <div class="f-row"><label for="pl">${t('mg.logo')}</label><input id="pl" name="logo" type="file" accept="image/png,image/jpeg,image/webp">
        <p class="tiny muted">${t('add.logoHelp')}</p></div>
        <div class="f-row"><label>${t('mg.current')}</label>
        <div class="biz-avatar big">${b.logo_path ? `<img src="/logo/${b.id}" alt="${esc(b.name)}">` : esc(b.name.slice(0, 2).toUpperCase())}</div></div>
      </div>
      <div class="f-row"><label for="pn2">${t('add.name')}</label><input id="pn2" name="name" required maxlength="120" value="${esc(b.name)}"></div>
      <div class="f2">
        <div class="f-row"><label for="pc">${t('add.category')}</label><select id="pc" name="category">${catOpts}</select></div>
        <div class="f-row"><label for="pco">${t('add.country')}</label><select id="pco" name="country">${ctyOpts}</select></div>
      </div>
      <div class="f2">
        <div class="f-row"><label for="pci">${t('add.city')}</label><input id="pci" name="city" maxlength="80" value="${esc(b.city)}"></div>
        <div class="f-row"><label for="pp">${t('add.phone')}</label><input id="pp" name="phone" maxlength="40" value="${esc(b.phone || '')}"></div>
      </div>
      <div class="f-row"><label for="pw2">${t('add.website')}</label><input id="pw2" name="website" maxlength="200" value="${esc(b.website || '')}" placeholder="https://…"></div>
      <div class="f-row"><label for="pd2">${t('add.desc')}</label><textarea id="pd2" name="description" rows="3" maxlength="600">${esc(b.description || '')}</textarea></div>
      <button class="btn btn-green" type="submit">${t('mg.save')} →</button>
    </form>
    <h2 class="dash-h">${t('mg.reviewsHeading')}</h2>
    <p class="small muted">${t('mg.reviewsHelp')}</p>
    ${reviews.length ? items : `<div class="empty"><p class="muted">${t('biz.noReviews')}</p></div>`}
  </div></section>` });
}

// ---------- DELETE OWN REVIEW ----------
function deleteReviewPage({ user, r }) {
  return layout({ title: 'Delete review — The Legit Rank', user, seo: { desc: 'Delete your review on The Legit Rank.', path: '/review/delete', noindex: true }, content: `
  <section class="pad"><div class="wrap narrow">
    <h1 class="sec">${t('rev.deleteTitle')}</h1>
    <div class="card row-card col">
      <div class="rev-me-top">
        <b><a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a></b>
        <span class="stars-a">${stars(r.rating)}</span>
        <span class="muted small">${new Date(r.created_at).toLocaleDateString('en-GB')}</span>
      </div>
      ${r.title ? `<h4>${esc(r.title)}</h4>` : ''}
      <p class="small muted">${esc((r.body || '').slice(0, 240))}</p>
    </div>
    <p class="small muted">${t('rev.deleteWarn')}</p>
    <form method="post" action="/review/${r.id}/delete" class="form">
      <div class="row-actions">
        <button class="btn btn-red" type="submit">${t('rev.deleteYes')}</button>
        <a class="btn-mini" href="/dashboard">${t('common.cancel')}</a>
      </div>
    </form>
  </div></section>` });
}

// ---------- VERIFICATION APPLY ----------
function verifyPage({ user, b, err, pending }) {
  if (pending) {
    return layout({ title: 'Verification — The Legit Rank', user, seo: { desc: 'Apply for a verified badge on The Legit Rank.', path: '/verify', noindex: true }, content: `
    <section class="page-head"><div class="wrap narrow">
      <h1 class="sec">${t('ver.title')}</h1>
      <div class="empty"><p class="p-chip">${t('dash.pendingVerify')}</p></div>
    </div></section>` });
  }
  return layout({ title: 'Verification — The Legit Rank', user, seo: { desc: 'Apply for a verified badge on The Legit Rank.', path: '/verify', noindex: true }, content: `
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

function cookiesPage() {
  return layout({ title: 'Cookie Policy — The Legit Rank', seo: { desc: 'How The Legit Rank uses cookies and how you can control them.', path: '/cookies' }, content: `
  <section class="page-head"><div class="wrap narrow legal">
    <h1 class="sec">Cookie Policy</h1>
    <p class="sec-sub muted">Last updated: 28 October 2026</p>
    <h2>What cookies are</h2><p>Cookies are small pieces of text stored by your browser. They let a site remember things between page loads.</p><h2>The one cookie we use</h2><p>The Legit Rank uses a single essential session cookie (lr_sess) that keeps you signed in. It contains a signed session identifier, is limited to our site, and cannot be used to track you elsewhere on the internet.</p><h2>No tracking</h2><p>We do not use advertising cookies, analytics trackers, or third-party pixels.</p><h2>Managing cookies</h2><p>You can delete or block cookies in your browser settings. Blocking our session cookie means you will need to sign in again for each page, but the site remains usable for browsing.</p>
  </div></section>` });
}

function privacyPage() {
  return layout({ title: 'Privacy Policy — The Legit Rank', seo: { desc: 'What personal data The Legit Rank collects, why we collect it and the rights you have over it.', path: '/privacy' }, content: `
  <section class="page-head"><div class="wrap narrow legal">
    <h1 class="sec">Privacy Policy</h1>
    <p class="sec-sub muted">Last updated: 28 October 2026</p>
    <h2>1. What we collect</h2><p>Account details you give us (name, email, password hash), the reviews, photos and receipts you post, business information you submit, and technical records such as your session token. We do not sell your personal data.</p><h2>2. Receipts and identity documents</h2><p>Receipts and verification documents you upload are stored privately. They are visible only to our moderation staff and are never shown publicly or shared with businesses.</p><h2>3. How we use it</h2><p>To run your account, show your reviews, verify businesses, fight spam and fraud, and improve the platform. We use aggregate, non-identifying statistics to understand how the site is used.</p><h2>4. Cookies</h2><p>We use one essential cookie to keep you signed in. We do not use advertising or tracking cookies. See our Cookie Policy.</p><h2>5. Sharing</h2><p>We only disclose personal data when legally required, or to protect the rights and safety of our users. Business contact details you choose to publish on a listing are public.</p><h2>6. Your rights</h2><p>You can request a copy of your data, ask us to correct it, or ask us to delete your account by contacting us. Some records may be retained where the law requires.</p><h2>7. Security</h2><p>Passwords are stored as salted hashes, sessions are signed, and access to private evidence is restricted to authorised staff and recorded in an audit log.</p>
  </div></section>` });
}

function termsPage() {
  return layout({ title: 'Terms of Service — The Legit Rank', seo: { desc: 'The rules for using The Legit Rank, for buyers, reviewers and business owners.', path: '/terms' }, content: `
  <section class="page-head"><div class="wrap narrow legal">
    <h1 class="sec">Terms of Service</h1>
    <p class="sec-sub muted">Last updated: 28 October 2026</p>
    <h2>1. About The Legit Rank</h2><p>The Legit Rank is a review platform that helps buyers across Africa share and read honest experiences with businesses. Reviews reflect the personal opinions of the users who write them, not the views of The Legit Rank.</p><h2>2. Your account</h2><p>You must provide accurate information when creating an account, keep your password secure, and be at least 16 years old. One account per person. You are responsible for activity carried out under your account.</p><h2>3. Reviews</h2><p>Reviews must be based on your own genuine experience with the business. You may not post fake reviews, reviews in exchange for payment, or reviews written for someone else. Businesses may not review their own business or ask others to remove or change honest reviews. We may hide or remove reviews that break these rules.</p><h2>4. Prohibited conduct</h2><p>Do not use The Legit Rank to harass, defame, threaten, or deceive anyone; to post illegal, hateful, or sexually explicit content; or to attempt to manipulate ratings or rankings. Accounts that abuse the platform may be restricted or suspended.</p><h2>5. Business verification</h2><p>A verification badge means we have checked the documents and details a business submitted. It does not guarantee that every transaction with that business will go well. Always use your own judgement when buying.</p><h2>6. Reports and moderation</h2><p>Anyone can report a review, business, or user. We investigate reports and may remove content, suspend accounts, or dismiss reports. If your content was removed you can appeal from your account page.</p><h2>7. Liability</h2><p>The Legit Rank is provided as-is. We are not a party to any transaction between buyers and businesses and we are not liable for losses arising from such transactions, to the extent permitted by law.</p><h2>8. Changes</h2><p>We may update these terms and will post the new version on this page. Continuing to use The Legit Rank after a change means you accept the updated terms.</p><h2>9. Contact</h2><p>Questions about these terms can be sent through the contact links on this site.</p>
  </div></section>` });
}

// ---------- ADMIN CONTROL CENTRE ----------
const ADM_SECTIONS = [
  ['overview', 'Overview', '/admin'],
  ['businesses', 'Businesses', '/admin/businesses'],
  ['verifications', 'Verification', '/admin/verifications'],
  ['moderation', 'Moderation', '/admin/moderation'],
  ['reports', 'Reports', '/admin/reports'],
  ['users', 'Users', '/admin/users'],
  ['settings', 'Settings', '/admin/settings'],
  ['analytics', 'Analytics', '/admin/analytics'],
  ['audit', 'Audit log', '/admin/audit'],
];
function admNav(active) {
  return `<nav class="adm-nav">${ADM_SECTIONS.map(([id, label, href]) =>
    `<a class="chip ${id === active ? 'chip-on' : ''}" href="${href}">${label}</a>`).join('')}</nav>`;
}
function admPage(user, active, heading, inner, msg) {
  return layout({ title: heading + ' — Control Centre — The Legit Rank', user, seo: { desc: 'The Legit Rank admin control centre.', path: '/admin', noindex: true }, content: `
  <section class="page-head"><div class="wrap">
    <h1 class="sec">Control Centre</h1>
    <p class="sec-sub muted small">The Legit Rank staff area — every action is recorded in the audit log.</p>
    ${admNav(active)}
    ${msg ? `<div class="adm-msg">${esc(msg)}</div>` : ''}
    <h2 class="adm-h">${heading}</h2>
    ${inner}
  </div></section>` });
}
function statusChip(st) {
  const map = { active: 'v-chip', verified: 'v-chip', approved: 'v-chip', resolved: 'v-chip', published: 'v-chip',
    pending: 'p-chip', investigating: 'p-chip', docs_requested: 'p-chip', open: 'p-chip', urgent: 'p-chip',
    suspended: 'nv-chip', removed: 'nv-chip', rejected: 'nv-chip', hidden: 'nv-chip', dismissed: 'nv-chip', restricted: 'nv-chip' };
  return `<span class="${map[st] || 'nv-chip'}">${esc(st.replace('_', ' '))}</span>`;
}
function confirmBox(name, label) {
  return `<label class="confirm-row"><input type="checkbox" name="${name}" required> ${label}</label>`;
}

function adminOverview({ user, stats, activity, msg }) {
  const tiles = [
    ['Users', stats.users, '/admin/users'], ['Businesses', stats.businesses, '/admin/businesses'],
    ['Published reviews', stats.reviews, '/admin/moderation'],
    ['Pending verifications', stats.pendingVerifications, '/admin/verifications'],
    ['Docs requested', stats.docsRequested, '/admin/verifications'],
    ['Pending claims', stats.pendingClaims, '/admin/verifications'],
    ['Open reports', stats.openReports, '/admin/reports'],
    ['Urgent reports', stats.urgentReports, '/admin/reports'],
    ['Hidden reviews', stats.hiddenReviews, '/admin/moderation'],
    ['Suspended users', stats.suspendedUsers, '/admin/users'],
    ['Pending appeals', stats.pendingAppeals, '/admin/moderation'],
  ].map(([label, n, href]) => `<a class="stat-tile" href="${href}"><b>${n}</b><span>${label}</span></a>`).join('');
  const act = activity.map(a =>
    `<li><span class="muted small">${a.created_at.slice(0, 10)}</span> · <b>${esc(a.kind)}</b> — ${esc(a.label || '')}</li>`).join('');
  return admPage(user, 'overview', 'Overview', `
  <div class="stat-tiles">${tiles}</div>
  <div class="adm-cols">
    <div class="card adm-block">
      <h3>Recent activity</h3>
      <ul class="act-list">${act || '<li class="muted">Nothing yet.</li>'}</ul>
    </div>
    <div class="card adm-block">
      <h3>Five critical questions</h3>
      <ul class="act-list">
        <li><b>Legit vs needs verification</b> → <a href="/admin/verifications">Verification centre</a> (${stats.pendingVerifications} pending)</li>
        <li><b>Genuine vs suspicious reviews</b> → <a href="/admin/moderation">Moderation</a> (${stats.hiddenReviews} hidden, ${stats.pendingAppeals} appeals)</li>
        <li><b>Scam reports</b> → <a href="/admin/reports">Reports</a> (${stats.openReports} open${stats.urgentReports ? ', <b class="urgent">' + stats.urgentReports + ' urgent</b>' : ''})</li>
        <li><b>Platform abuse</b> → <a href="/admin/users">Users</a> (${stats.suspendedUsers} restricted/suspended)</li>
        <li><b>Growth & revenue</b> → <a href="/admin/analytics">Analytics</a></li>
      </ul>
    </div>
  </div>`, msg);
}

function adminBusinesses({ user, businesses, qq, msg }) {
  const rows = businesses.map(b => `
    <tr>
      <td><a href="/admin/business/${b.id}"><b>${esc(b.name)}</b></a><br><span class="muted small">${esc(b.category)} · ${esc(b.city)}, ${esc(b.country)}</span></td>
      <td>${b.avg_rating || '–'} ★ (${b.review_count})</td>
      <td>${b.verified ? '<span class="v-chip">verified</span>' : '<span class="nv-chip">unverified</span>'}</td>
      <td>${statusChip(b.status)}</td>
    </tr>`).join('');
  return admPage(user, 'businesses', 'Business management', `
  <form method="get" action="/admin/businesses" class="adm-search">
    <input name="q" value="${esc(qq || '')}" placeholder="Search businesses…">
    <button class="btn-mini btn-mini-g" type="submit">Search</button>
  </form>
  ${businesses.length ? `<table class="adm-table"><thead><tr><th>Business</th><th>Rating</th><th>Verification</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div class="empty"><p class="muted">No businesses found.</p></div>'}`, msg);
}

function adminBusinessDetail({ user, b, reviews, others, msg }) {
  const revRows = reviews.map(r => `
    <tr>
      <td><b>${esc(r.author_name)}</b><br><span class="muted small">${esc(r.created_at.slice(0, 10))}</span></td>
      <td>${stars(r.rating)}<br><span class="small">${esc((r.title || '').slice(0, 60))}</span></td>
      <td>${r.hidden ? `<span class="nv-chip">hidden</span><br><span class="muted small">${esc(r.hidden_reason || '')}</span>` : '<span class="v-chip">published</span>'}</td>
      <td>
        ${r.verified_purchase ? '<span class="v-chip">verified purchase</span>' : `<form method="post" action="/admin/review/${r.id}/purchase" class="inline"><button class="btn-mini">Mark verified purchase</button></form>`}
        ${r.receipt_path ? `<a class="btn-mini" href="/admin/review/${r.id}/receipt" target="_blank">Receipt</a>` : ''}
        <form method="post" action="/admin/review/${r.id}/${r.hidden ? 'restore' : 'hide'}" class="inline">
          ${r.hidden ? '' : '<input name="reason" class="mini-input" placeholder="reason" required maxlength="200">'}
          <button class="btn-mini ${r.hidden ? 'btn-mini-g' : ''}">${r.hidden ? 'Restore' : 'Hide'}</button>
        </form>
      </td>
    </tr>`).join('');
  const otherOpts = others.map(o => `<option value="${o.id}">${esc(o.name)} (${esc(o.city)})</option>`).join('');
  return admPage(user, 'businesses', b.name, `
  <p><a href="/business/${esc(b.slug)}">View public profile →</a> · ${statusChip(b.status)} ·
    ${b.verified ? `<span class="v-chip">verified ${esc((b.verified_at || '').slice(0, 10))}</span>` : '<span class="nv-chip">unverified</span>'}</p>
  <div class="adm-cols">
    <form method="post" action="/admin/business/${b.id}/edit" class="card form adm-block" enctype="multipart/form-data">
      <h3>Edit listing</h3>
      <div class="f-row"><label>Name</label><input name="name" value="${esc(b.name)}" required maxlength="120"></div>
      <div class="f-row"><label>Category</label><input name="category" value="${esc(b.category)}" required maxlength="60"></div>
      <div class="f-row"><label>City</label><input name="city" value="${esc(b.city)}" required maxlength="80"></div>
      <div class="f-row"><label>Country</label><input name="country" value="${esc(b.country)}" required maxlength="60"></div>
      <div class="f-row"><label>Description</label><textarea name="description" rows="3" maxlength="600">${esc(b.description || '')}</textarea></div>
      <div class="f-row"><label>Website</label><input name="website" value="${esc(b.website || '')}" maxlength="200"></div>
      <div class="f-row"><label>Phone</label><input name="phone" value="${esc(b.phone || '')}" maxlength="40"></div>
      <div class="f-row"><label>Business logo</label><input name="logo" type="file" accept="image/png,image/jpeg,image/webp">
      ${b.logo_path ? `<img class="adm-logo-prev" src="/logo/${b.id}" alt="current logo">` : ''}</div>
      <button class="btn-mini btn-mini-g" type="submit">Save changes</button>
    </form>
    <div>
      <div class="card form adm-block">
        <h3>Suspend / restore</h3>
        <p class="small muted">Suspended businesses disappear from search and public pages but keep all data.</p>
        ${b.status === 'active'
          ? `<form method="post" action="/admin/business/${b.id}/status">${confirmBox('confirm', 'I confirm suspending this listing')}<input type="hidden" name="status" value="suspended"><button class="btn-mini">Suspend listing</button></form>`
          : `<form method="post" action="/admin/business/${b.id}/status"><input type="hidden" name="status" value="active"><button class="btn-mini btn-mini-g">Restore to active</button></form>`}
      </div>
      <div class="card form adm-block">
        <h3>Delete listing permanently</h3>
        <p class="small muted">Hard delete: removes the listing with all its reviews, claims, verifications, reports and appeals. Type DELETE to confirm.</p>
        <form method="post" action="/admin/business/${b.id}/delete" class="adm-decision">
          <input type="text" name="confirm" placeholder="Type DELETE" required>
          <button class="btn-mini">Delete forever</button>
        </form>
      </div>
      <div class="card form adm-block">
        <h3>Merge duplicate</h3>
        <p class="small muted">Moves all reviews, claims and reports into the surviving listing, then deletes this one. Nothing is lost.</p>
        <form method="post" action="/admin/businesses/merge">
          <input type="hidden" name="from" value="${b.id}">
          <div class="f-row"><label>Surviving business</label><select name="into" required>${otherOpts}</select></div>
          ${confirmBox('confirm', 'I checked both profiles — merge them')}
          <button class="btn-mini" type="submit">Merge</button>
        </form>
      </div>
    </div>
  </div>
  <h3>Review history (${reviews.length})</h3>
  ${reviews.length ? `<table class="adm-table"><thead><tr><th>Author</th><th>Review</th><th>Status</th><th>Action</th></tr></thead><tbody>${revRows}</tbody></table>`
    : '<div class="empty"><p class="muted">No reviews yet.</p></div>'}`, msg);
}

function adminVerifications({ user, pending, decided, claims, msg }) {
  const pend = pending.map(v => `
    <div class="card row-card col">
      <div class="rev-me-top"><b><a href="/admin/business/${v.business_id}">${esc(v.biz_name)}</a></b>
        <span class="muted small">${esc(v.user_name)} · ${esc(v.created_at.slice(0, 10))}</span></div>
      <p class="small">ID: <b>${esc(v.id_type)}</b> ····${esc(String(v.id_number).slice(-3))} · Payment: ${esc(v.pay_method)} (${esc(v.pay_name)})</p>
      ${v.notes ? `<p class="small muted">${esc(v.notes)}</p>` : ''}
      <p class="tiny muted">Evidence is private. Never share identity documents publicly. A verification badge confirms owner identity and transaction records only — it does not guarantee every transaction is safe.</p>
      <div class="adm-actions">
        <form method="post" action="/admin/verification/${v.id}/decision" class="adm-decision">
          <input type="hidden" name="decision" value="approve">
          <input name="admin_note" class="mini-input" placeholder="What was verified" maxlength="200">
          <input name="expires_at" class="mini-input" type="date" title="Re-verify after this date (optional)">
          <button class="btn-mini btn-mini-g">Approve</button>
        </form>
        <form method="post" action="/admin/verification/${v.id}/decision" class="adm-decision">
          <input type="hidden" name="decision" value="request_docs">
          <input name="admin_note" class="mini-input" placeholder="What extra evidence is needed" required maxlength="200">
          <button class="btn-mini">Request more evidence</button>
        </form>
        <form method="post" action="/admin/verification/${v.id}/decision" class="adm-decision">
          <input type="hidden" name="decision" value="reject">
          <input name="admin_note" class="mini-input" placeholder="Rejection reason" required maxlength="200">
          <button class="btn-mini">Reject</button>
        </form>
      </div>
    </div>`).join('');
  const done = decided.map(v => `
    <tr>
      <td><a href="/admin/business/${v.business_id}">${esc(v.biz_name)}</a></td>
      <td>${statusChip(v.status)}</td>
      <td class="muted small">${esc((v.admin_note || '').slice(0, 60))}</td>
      <td class="muted small">${esc((v.decided_at || '').slice(0, 10))}</td>
      <td class="muted small">${v.expires_at ? esc(v.expires_at) : '—'}</td>
    </tr>`).join('');
  const claimRows = (claims || []).map(c => `
    <div class="card row-card col">
      <div class="rev-me-top"><b><a href="/admin/business/${c.business_id}">${esc(c.biz_name)}</a></b>
        <span class="muted small">claimed by ${esc(c.user_name)} (${esc(c.contact || 'no contact')}) · ${esc(c.created_at.slice(0, 10))}</span></div>
      <p class="small">${esc(c.details)}</p>
      <div class="adm-actions">
        <form method="post" action="/admin/claim/${c.id}"><input type="hidden" name="decision" value="approve"><button class="btn-mini btn-mini-g">Approve claim</button></form>
        <form method="post" action="/admin/claim/${c.id}"><input type="hidden" name="decision" value="reject"><button class="btn-mini">Reject</button></form>
      </div>
    </div>`).join('');
  return admPage(user, 'verifications', 'Verification centre', `
  ${(claims || []).length ? `<div class="card adm-block"><h3>Business claims (${claims.length})</h3>${claimRows}</div>` : ''}
  <div class="card adm-block"><h3>Pending (${pending.length})</h3>${pend || '<p class="muted">Queue is clear.</p>'}</div>
  <h3>Decision history</h3>
  ${decided.length ? `<table class="adm-table"><thead><tr><th>Business</th><th>Outcome</th><th>Note</th><th>Decided</th><th>Re-verify by</th></tr></thead><tbody>${done}</tbody></table>`
    : '<div class="empty"><p class="muted">No decisions yet.</p></div>'}`, msg);
}

function adminModeration({ user, reports, hiddenReviews, appeals, msg }) {
  const reps = reports.map(r => `
    <div class="card row-card col">
      <div class="rev-me-top"><b><a href="/business/${esc(r.biz_slug || '')}">${esc(r.biz_name || 'Unknown')}</a></b>
        <span class="muted small">reported by ${esc(r.reporter_name || 'guest')} · ${esc(r.created_at.slice(0, 10))}</span></div>
      <p class="small">${esc(r.details)}</p>
      <div class="adm-actions">
        <form method="post" action="/admin/review/${r.review_id}/hide" class="adm-decision">
          <input name="reason" class="mini-input" placeholder="Why it violates policy" required maxlength="200">
          <button class="btn-mini">Hide review</button>
        </form>
        <form method="post" action="/admin/report/${r.id}/dismiss" class="inline"><button class="btn-mini btn-mini-g">Dismiss report</button></form>
      </div>
    </div>`).join('');
  const hid = hiddenReviews.map(r => `
    <div class="card row-card col">
      <div class="rev-me-top"><b><a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a></b>
        <span class="muted small">hidden ${esc((r.hidden_at || '').slice(0, 10))}</span></div>
      <p class="small">${esc((r.title ? r.title + ' — ' : '') + (r.body || '').slice(0, 120))}</p>
      <p class="small muted">Reason: ${esc(r.hidden_reason || '—')}</p>
      <form method="post" action="/admin/review/${r.id}/restore">${confirmBox('confirm', 'I reviewed it — restore publicly')}<button class="btn-mini btn-mini-g">Restore</button></form>
    </div>`).join('');
  const aps = appeals.map(a => `
    <div class="card row-card col">
      <div class="rev-me-top"><b>${esc(a.user_name)}</b> appeals a hidden review on <a href="/business/${esc(a.biz_slug)}">${esc(a.biz_name)}</a>
        <span class="muted small">${esc(a.created_at.slice(0, 10))}</span></div>
      <p class="small muted">Review: ${esc((a.review_body || '').slice(0, 120))}</p>
      <p class="small">Appeal: ${esc(a.reason)}</p>
      <div class="adm-actions">
        <form method="post" action="/admin/appeal/${a.id}/accept">${confirmBox('confirm', 'Appeal is valid — unhide the review')}<button class="btn-mini btn-mini-g">Uphold appeal</button></form>
        <form method="post" action="/admin/appeal/${a.id}/reject" class="adm-decision"><input name="note" class="mini-input" placeholder="Reason to reviewer" required maxlength="200"><button class="btn-mini">Reject appeal</button></form>
      </div>
    </div>`).join('');
  return admPage(user, 'moderation', 'Reviews & moderation', `
  <h3>Reported reviews (${reports.length})</h3>
  ${reports.length ? reps : '<div class="empty"><p class="muted">No review reports.</p></div>'}
  <h3>Appeals (${appeals.length})</h3>
  ${appeals.length ? aps : '<div class="empty"><p class="muted">No open appeals.</p></div>'}
  <h3>Hidden reviews (${hiddenReviews.length})</h3>
  ${hiddenReviews.length ? hid : '<div class="empty"><p class="muted">Nothing hidden.</p></div>'}
  <p class="tiny muted">Policy: businesses can never pay to remove a negative review or improve their rating. Every hide/restore is audited, and reviewers can appeal from their account page.</p>`, msg);
}

function adminReports({ user, reports, status, msg }) {
  const filters = ['open', 'investigating', 'resolved', 'dismissed', 'all'].map(st =>
    `<a class="chip ${st === status ? 'chip-on' : ''}" href="/admin/reports?status=${st}">${st}</a>`).join('');
  const rows = reports.map(r => `
    <tr class="${r.priority === 'urgent' ? 'row-urgent' : ''}">
      <td><a href="/admin/report/${r.id}"><b>#${r.id} ${esc(r.type)}</b></a>${r.priority === 'urgent' ? ' <span class="p-chip">urgent</span>' : ''}</td>
      <td>${r.biz_name ? `<a href="/business/${esc(r.biz_slug)}">${esc(r.biz_name)}</a>` : '—'}</td>
      <td>${esc(r.reporter_name || 'guest')}</td>
      <td>${statusChip(r.status)}</td>
      <td class="muted small">${esc(r.created_at.slice(0, 10))}</td>
    </tr>`).join('');
  return admPage(user, 'reports', 'Scam reports & disputes', `
  <div class="chips">${filters}</div>
  ${reports.length ? `<table class="adm-table"><thead><tr><th>Case</th><th>Business</th><th>Reporter</th><th>Status</th><th>Opened</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div class="empty"><p class="muted">No reports in this view.</p></div>'}`, msg);
}

function adminReportCase({ user, report, related, msg }) {
  const rel = related.map(r => `
    <li><a href="/admin/report/${r.id}">#${r.id}</a> ${esc(r.type)} · ${statusChip(r.status)}
      <span class="muted small">${esc((r.details || '').slice(0, 100))}</span></li>`).join('');
  return admPage(user, 'reports', 'Case #' + report.id, `
  <div class="adm-cols">
    <div class="card adm-block">
      <h3>${esc(report.type)} report</h3>
      <p class="small muted">Opened ${esc(report.created_at.slice(0, 10))} · status ${statusChip(report.status)} · priority ${report.priority === 'urgent' ? '<span class="p-chip">urgent</span>' : 'normal'}</p>
      ${report.biz_name ? `<p>Business: <a href="/admin/business/${report.business_id}"><b>${esc(report.biz_name)}</b></a> (<a href="/business/${esc(report.biz_slug)}">public profile</a>)</p>` : ''}
      ${report.review_id ? `<p>Review: <a href="/admin/moderation">#${report.review_id}</a></p>` : ''}
      <p class="small muted">Reporter: ${esc(report.reporter_name || 'guest')}${report.reporter_contact ? ' · ' + esc(report.reporter_contact) : ''}</p>
      <p class="small">${esc(report.details)}</p>
      ${report.outcome ? `<p class="small"><b>Outcome:</b> ${esc(report.outcome)}</p>` : ''}
    </div>
    <div class="card adm-block">
      <h3>Case actions</h3>
      <form method="post" action="/admin/report/${report.id}/update" class="form">
        <div class="f-row"><label>Priority</label>
          <select name="priority"><option value="normal" ${report.priority !== 'urgent' ? 'selected' : ''}>Normal</option><option value="urgent" ${report.priority === 'urgent' ? 'selected' : ''}>Urgent</option></select>
        </div>
        <div class="f-row"><label>Status</label>
          <select name="status"><option value="open" ${report.status === 'open' ? 'selected' : ''}>Open</option><option value="investigating" ${report.status === 'investigating' ? 'selected' : ''}>Investigating</option><option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option><option value="dismissed" ${report.status === 'dismissed' ? 'selected' : ''}>Dismissed</option></select>
        </div>
        <div class="f-row"><label>Investigation outcome (recorded)</label><textarea name="outcome" rows="3" maxlength="600">${esc(report.outcome || '')}</textarea></div>
        <button class="btn-mini btn-mini-g" type="submit">Save case</button>
      </form>
    </div>
  </div>
  <h3>Linked complaints about the same business (${related.length})</h3>
  ${rel ? `<ul class="act-list">${rel}</ul>` : '<p class="muted small">No other reports for this business.</p>'}`, msg);
}

function adminUsers({ user, users, qq, msg }) {
  const rows = users.map(u => `
    <tr>
      <td><b>${esc(u.name)}</b><br><span class="muted small">${esc(u.email)}</span></td>
      <td>${u.review_count}</td>
      <td>${statusChip(u.status)}<br>${esc(u.role)}</td>
      <td class="muted small">${esc(u.created_at.slice(0, 10))}</td>
      <td>
        ${u.id === user.id ? '<span class="muted small">you</span>' : `
        <form method="post" action="/admin/user/${u.id}/update" class="adm-decision">
          <select name="status"><option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option><option value="restricted" ${u.status === 'restricted' ? 'selected' : ''}>Restricted (no reviews)</option><option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended (no login)</option></select>
          <select name="role"><option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option><option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>moderator</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option></select>
          <button class="btn-mini">Apply</button>
        </form>
        ${u.role !== 'admin' ? `
        <form method="post" action="/admin/user/${u.id}/delete" class="adm-decision" style="margin-top:6px">
          <input type="text" name="confirm" placeholder="Type DELETE" required style="width:90px">
          <button class="btn-mini">Delete user</button>
        </form>` : ''}`}
      </td>
    </tr>`).join('');
  return admPage(user, 'users', 'User management', `
  <form method="get" action="/admin/users" class="adm-search">
    <input name="q" value="${esc(qq || '')}" placeholder="Search users…"><button class="btn-mini btn-mini-g">Search</button>
  </form>
  ${users.length ? `<table class="adm-table"><thead><tr><th>User</th><th>Reviews</th><th>Status</th><th>Joined</th><th>Manage</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div class="empty"><p class="muted">No users found.</p></div>'}
  <p class="tiny muted">Moderators can access moderation, reports and verification only. Only admins reach businesses, users, settings, analytics and the audit log. Permissions are enforced on the server.</p>`, msg);
}

function adminSettings({ user, categories, reviewMin, msg }) {
  const cats = categories.map(c => `
    <tr><td>${esc(c.name)}</td><td><form method="post" action="/admin/category/${c.id}/delete">${confirmBox('confirm', 'delete')}<button class="btn-mini">Delete</button></form></td></tr>`).join('');
  return admPage(user, 'settings', 'Platform settings', `
  <div class="adm-cols">
    <div class="card adm-block">
      <h3>Categories</h3>
      <table class="adm-table"><tbody>${cats}</tbody></table>
      <form method="post" action="/admin/category" class="adm-decision">
        <input name="name" class="mini-input" placeholder="New category" required maxlength="60">
        <button class="btn-mini btn-mini-g">Add</button>
      </form>
    </div>
    <div class="card adm-block">
      <h3>Review rules</h3>
      <form method="post" action="/admin/setting/review_min" class="form">
        <div class="f-row"><label>Minimum review length (characters)</label><input type="number" name="value" min="0" max="1000" value="${esc(reviewMin)}"></div>
        <button class="btn-mini btn-mini-g" type="submit">Save rule</button>
      </form>
      <p class="tiny muted">Never allow businesses to pay to remove negative reviews or raise ratings — this is a fixed platform rule.</p>
    </div>
  </div>`, msg);
}

function adminAnalytics({ user, stats, daily, verTotals, msg }) {
  const max = Math.max(1, ...daily.map(d => Math.max(d.signups, d.reviews, d.businesses)));
  const bars = (field) => daily.map(d =>
    `<div class="bar" title="${d.day}: ${d[field]}"><span style="height:${Math.round(d[field] / max * 100)}%"></span><i>${d[field]}</i></div>`).join('');
  const conv = verTotals.total ? Math.round(verTotals.approved / verTotals.total * 100) : 0;
  return admPage(user, 'analytics', 'Analytics & growth', `
  <div class="stat-tiles">
    <a class="stat-tile" href="/admin/users"><b>${stats.users}</b><span>Total users</span></a>
    <a class="stat-tile" href="/admin/businesses"><b>${stats.businesses}</b><span>Active businesses</span></a>
    <a class="stat-tile" href="/admin/moderation"><b>${stats.reviews}</b><span>Published reviews</span></a>
    <a class="stat-tile" href="/admin/verifications"><b>${conv}%</b><span>Verification conversion</span></a>
    <a class="stat-tile" href="/admin/reports"><b>${stats.openReports}</b><span>Open reports</span></a>
  </div>
  <div class="adm-cols">
    <div class="card adm-block"><h3>New signups (14 days)</h3><div class="bar-chart">${bars('signups')}</div></div>
    <div class="card adm-block"><h3>Reviews published (14 days)</h3><div class="bar-chart">${bars('reviews')}</div></div>
  </div>
  <p class="tiny muted">Search demand and premium plan tracking arrive with monetisation (roadmap P3).</p>`, msg);
}

function adminAudit({ user, entries, msg }) {
  const rows = entries.map(a => `
    <tr><td class="muted small">${esc(a.created_at.replace('T', ' ').slice(0, 19))}</td>
    <td>${esc(a.actor_email)} <span class="muted small">(${esc(a.actor_role || '')})</span></td>
    <td><b>${esc(a.action)}</b></td>
    <td>${esc(a.entity_type)} #${a.entity_id || '—'}</td>
    <td class="muted small">${esc((a.details || '').slice(0, 80))}</td></tr>`).join('');
  return admPage(user, 'audit', 'Audit log', `
  ${entries.length ? `<table class="adm-table"><thead><tr><th>When</th><th>Staff</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div class="empty"><p class="muted">No staff actions recorded yet.</p></div>'}`, msg);
}

// ---------- PUBLIC: report a scam / review ----------
function reportPage({ user, type, biz, reviewId, err }) {
  const isReview = type === 'review' && reviewId;
  return layout({ title: 'Report — The Legit Rank', user, seo: { desc: 'Report a scam, a suspicious business or a review on The Legit Rank.', path: '/report', noindex: true }, content: `
  <section class="page-head"><div class="wrap narrow">
    <h1 class="sec">${isReview ? 'Report a review' : 'Report a scam or problem'}</h1>
    <p class="sec-sub muted">${t('rep.sub')}</p>
    ${err ? `<div class="form-err">${t('rep.err')}</div>` : ''}
    <form method="post" action="/report" class="form auth-card">
      <input type="hidden" name="type" value="${esc(type)}">
      <input type="hidden" name="biz" value="${esc(biz || '')}">
      <input type="hidden" name="review_id" value="${esc(reviewId || '')}">
      ${biz ? `<div class="f-row"><label>${t('rep.biz')}</label><input value="${esc(biz)}" disabled></div>` : ''}
      <div class="f-row"><label for="det">${t('rep.details')}</label><textarea id="det" name="details" rows="5" required maxlength="2000" placeholder="${esc(tRaw('rep.detailsPh'))}"></textarea></div>
      <div class="f-row"><label for="ct">${t('rep.contact')}</label><input id="ct" name="contact" maxlength="120" placeholder="${esc(tRaw('rep.contactPh'))}"></div>
      <button class="btn btn-green w100" type="submit">${t('rep.submit')} →</button>
    </form>
    <p class="tiny muted center" style="margin-top:14px">${t('rep.note')}</p>
  </div></section>` });
}

// ---------- 404 ----------
function notFound({ user }) {
  return layout({ title: 'Not found — The Legit Rank', user, seo: { desc: 'This page could not be found on The Legit Rank.', path: '/404', noindex: true }, content: `
  <section class="page-head"><div class="wrap narrow center">
    <h1 class="sec">404</h1>
    <p class="muted">The page you're looking for doesn't exist.</p>
    <p><a class="btn btn-green" href="/">The Legit Rank →</a></p>
  </div></section>` });
}

module.exports = { layout, home, searchPage, businessPage, reviewForm, loginPage, signupPage,
  addBizPage, claimPage, dashboard, bizManagePage, verifyPage, deleteReviewPage, notFound, stars, bizCard, termsPage, privacyPage, cookiesPage,
  adminOverview, adminBusinesses, adminBusinessDetail, adminVerifications, adminModeration,
  adminReports, adminReportCase, adminUsers, adminSettings, adminAnalytics, adminAudit, reportPage };
