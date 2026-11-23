// Vite plugin: per-page <head> SEO/OpenGraph/Twitter/JSON-LD tags, crawlable
// <noscript> content for the viewer pages, plus sitemap.xml and robots.txt.
import { WORD_COUNTS, entropyBits, totalFor, offsetToWords, deriveAddresses, PATHS } from '../src/derive.js';

const SITE_NAME = 'All The Seeds';
const THEME = '#0d0f0e';
const groupDigits = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function pageInfo(site, words) {
  if (!words) {
    return {
      url: site,
      title: 'All The Seeds: Every BIP39 Seed Phrase, in Order',
      ogTitle: 'All The Seeds: every BIP39 seed phrase, in order',
      description:
        'Browse every possible 12, 15, 18, 21 and 24-word BIP39 seed phrase in order, with Bitcoin (legacy & segwit) and Ethereum addresses. Yours is in here somewhere.',
      image: `${site}og/home.png`,
      imageAlt: 'All The Seeds: every BIP39 seed phrase, from 2^128 to 2^256 of them',
    };
  }
  const bits = entropyBits(words);
  return {
    url: `${site}${words}/`,
    title: `All ${words}-Word Seed Phrases (2^${bits}) with BTC & ETH Addresses`,
    ogTitle: `Every ${words}-word seed phrase: all 2^${bits} of them`,
    description:
      `Scroll through all 2^${bits} (${groupDigits(totalFor(words)).slice(0, 15)}…) valid ${words}-word BIP39 mnemonics, from “abandon” to “zoo”, ` +
      'each with its Bitcoin P2PKH, segwit and Ethereum address, computed in your browser.',
    image: `${site}og/${words}.png`,
    imageAlt: `A list of ${words}-word BIP39 seed phrases with their Bitcoin and Ethereum addresses`,
  };
}

function headTags(site, words) {
  const p = pageInfo(site, words);
  const meta = (attrs) => ({ tag: 'meta', attrs, injectTo: 'head' });
  const tags = [
    { tag: 'title', children: p.title, injectTo: 'head' },
    meta({ name: 'description', content: p.description }),
    { tag: 'link', attrs: { rel: 'canonical', href: p.url }, injectTo: 'head' },
    meta({ name: 'robots', content: 'index, follow, max-image-preview:large' }),
    meta({ name: 'theme-color', content: THEME }),
    meta({ name: 'author', content: 'Karpeles Lab' }),
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:site_name', content: SITE_NAME }),
    meta({ property: 'og:locale', content: 'en_US' }),
    meta({ property: 'og:url', content: p.url }),
    meta({ property: 'og:title', content: p.ogTitle }),
    meta({ property: 'og:description', content: p.description }),
    meta({ property: 'og:image', content: p.image }),
    meta({ property: 'og:image:type', content: 'image/png' }),
    meta({ property: 'og:image:width', content: '1200' }),
    meta({ property: 'og:image:height', content: '630' }),
    meta({ property: 'og:image:alt', content: p.imageAlt }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:title', content: p.ogTitle }),
    meta({ name: 'twitter:description', content: p.description }),
    meta({ name: 'twitter:image', content: p.image }),
    meta({ name: 'twitter:image:alt', content: p.imageAlt }),
    { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: `${site}favicon.svg` }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${site}apple-touch-icon.png` }, injectTo: 'head' },
  ];

  const ld = words
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `Every ${words}-word BIP39 seed phrase`,
          url: p.url,
          description: p.description,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any (web browser)',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: site },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE_NAME, item: site },
            { '@type': 'ListItem', position: 2, name: `${words} words`, item: p.url },
          ],
        },
      ]
    : [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: site,
          description: p.description,
          inLanguage: 'en',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: SITE_NAME,
          url: site,
          description: p.description,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any (web browser)',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
      ];
  for (const obj of ld) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(obj).replace(/</g, '\\u003c'), injectTo: 'head' });
  }
  return tags;
}

/** Static fallback for crawlers/no-JS: what the page is, plus the first few rows. */
async function noscriptBody(words) {
  const bits = entropyBits(words);
  const rows = [];
  for (const off of [0n, 1n, 2n, totalFor(words) - 1n]) {
    const m = offsetToWords(off, words).join(' ');
    rows.push({ off, m, a: await deriveAddresses(m) });
  }
  const others = WORD_COUNTS.filter((n) => n !== words).map((n) => `<a href="../${n}/">${n} words</a>`).join(' · ');
  return `<noscript><div class="noscript">
<h1>Every ${words}-word BIP39 seed phrase</h1>
<p>There are 2<sup>${bits}</sup> = ${groupDigits(totalFor(words))} valid ${words}-word seed phrases (${bits} bits of entropy plus ${words / 3 === 8 ? 'an' : 'a'} ${words / 3}-bit checksum in the last word). This page lists all of them in order, each with its Bitcoin legacy (${PATHS.legacy}, compressed and uncompressed), native segwit (${PATHS.segwit}) and Ethereum (${PATHS.eth}) address. JavaScript is required to browse; here are the first and last rows:</p>
<ol>${rows.map((r) => `<li value="${r.off}"><b>${esc(r.m)}</b><br>BTC uncompressed ${r.a.uncompressed} · BTC compressed ${r.a.compressed} · BTC segwit ${r.a.segwit} · ETH ${r.a.eth}</li>`).join('\n')}</ol>
<p>Other lengths: ${others} · <a href="../">About All The Seeds</a></p>
</div></noscript>`;
}

export default function seo({ site }) {
  site = site.replace(/\/?$/, '/');
  return {
    name: 'alltheseeds-seo',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const m = /^\/(\d+)\/index\.html$/.exec(ctx.path);
        const words = m ? Number(m[1]) : null;
        if (words) html = html.replace('<!--noscript-->', await noscriptBody(words));
        return { html, tags: headTags(site, words) };
      },
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = [pageInfo(site, null).url, ...WORD_COUNTS.map((n) => pageInfo(site, n).url)];
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.map((u, i) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><priority>${i ? '0.8' : '1.0'}</priority></url>`).join('\n') +
          '\n</urlset>\n',
      });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n` });
    },
  };
}
