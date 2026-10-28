// seo.js — canonical URLs, meta tags, and structured data for every page.
const { esc } = require('./i18n');

const SITE = (process.env.SITE_URL || 'https://legitrank.brandfletch.com').replace(/\/+$/, '');
const SITE_NAME = 'The Legit Rank';
const DEFAULT_IMAGE = SITE + '/og-default.jpg';
const DEFAULT_DESC = 'The independent review platform for African businesses. Check real buyer ratings, read honest reviews, and deal only with verified sellers.';

function abs(pathname) {
  if (!pathname) return SITE + '/';
  return SITE + (pathname.startsWith('/') ? pathname : '/' + pathname);
}

// Collapse whitespace and keep meta descriptions at a sensible length.
function clip(text, max = 158) {
  const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > 60 ? cut.slice(0, space) : cut).replace(/[,;:.\-\s]+$/, '') + '…';
}

function jsonScript(data) {
  const body = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${body}</script>`;
}

function head({ title, desc, path = '/', image, type = 'website', noindex = false, modified, jsonLd = [] }) {
  const fullTitle = title && title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const description = clip(desc || DEFAULT_DESC);
  const url = abs(path);
  const ogImage = image ? abs(image) : DEFAULT_IMAGE;
  const tags = [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    noindex
      ? '<meta name="robots" content="noindex, follow">'
      : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">',
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:type" content="${esc(type)}">`,
    `<meta property="og:title" content="${esc(fullTitle)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(ogImage)}">`,
    `<meta property="og:image:alt" content="${esc(fullTitle)}">`,
    `<meta property="og:locale" content="en_MW">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(fullTitle)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(ogImage)}">`,
  ];
  if (modified) tags.push(`<meta property="article:modified_time" content="${esc(modified)}">`);
  for (const ld of jsonLd.filter(Boolean)) tags.push(jsonScript(ld));
  return tags.join('\n');
}

function orgLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE + '/',
    logo: DEFAULT_IMAGE,
    description: DEFAULT_DESC,
    areaServed: { '@type': 'Place', name: 'Africa' },
  };
}

function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE + '/',
    description: DEFAULT_DESC,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: SITE + '/search?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.path ? abs(it.path) : undefined,
    })),
  };
}

// LocalBusiness + aggregate rating + a sample of the most recent reviews.
function businessLd(b, reviews = []) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': abs('/business/' + b.slug) + '#business',
    name: b.name,
    url: abs('/business/' + b.slug),
    description: clip(b.description || `${b.name} — ${b.category} in ${b.city}, ${b.country}. ${b.review_count || 0} buyer reviews on The Legit Rank.`, 300),
    image: b.logo_path ? abs('/logo/' + b.id) : DEFAULT_IMAGE,
    address: {
      '@type': 'PostalAddress',
      addressLocality: b.city,
      addressCountry: b.country,
    },
  };
  if (b.phone) data.telephone = b.phone;
  if (b.website) data.sameAs = [b.website];
  if (b.category) data.knowledgeGraph = undefined, data.additionalType = b.category;
  if (Number(b.review_count) > 0 && Number(b.avg_rating) > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(b.avg_rating).toFixed(1),
      reviewCount: Number(b.review_count),
      bestRating: 5,
      worstRating: 1,
    };
  }
  const sample = (reviews || []).slice(0, 5).filter(r => r && r.rating);
  if (sample.length) {
    data.review = sample.map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author_name || 'Verified buyer' },
      datePublished: (r.created_at || '').slice(0, 10) || undefined,
      reviewBody: clip(r.body, 500),
      name: r.title || undefined,
      reviewRating: { '@type': 'Rating', ratingValue: Number(r.rating), bestRating: 5, worstRating: 1 },
    }));
  }
  return data;
}

module.exports = { SITE, SITE_NAME, DEFAULT_IMAGE, DEFAULT_DESC, abs, clip, head, orgLd, websiteLd, breadcrumbLd, businessLd };
