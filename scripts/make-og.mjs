// Generates the OpenGraph images (public/og/*.png, 1200x630) and apple-touch-icon.
// Needs Playwright, which is not a project dependency:
//   npm i --no-save playwright && npx playwright install chromium && node scripts/make-og.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { WORD_COUNTS, entropyBits, totalFor, offsetToWords, deriveAddresses } from '../src/derive.js';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'public/og');
mkdirSync(outDir, { recursive: true });

const COLS = { 12: 6, 15: 5, 18: 6, 21: 7, 24: 6 };
const groupDigits = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

async function card(words, offset, cls = '') {
  const list = offsetToWords(offset, words);
  const a = await deriveAddresses(list.join(' '));
  const wl = list
    .map((w, i) => `<li class="${i === list.length - 1 ? 'cs' : ''}"><i>${i + 1}</i>${w}</li>`)
    .join('');
  const addr = [['BTC uncompressed', a.uncompressed], ['BTC compressed', a.compressed], ['BTC segwit', a.segwit], ['ETH', a.eth]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  return `<div class="card ${cls}"><div class="idx">#${groupDigits(offset)}</div>
    <ol class="w" style="--cols:${COLS[words]}">${wl}</ol><dl>${addr}</dl></div>`;
}

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1200px; height: 630px; overflow: hidden; background: #0d0f0e; color: #d9ddd2;
  font-family: "JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace; display: flex; }
.left { width: 470px; padding: 56px 0 56px 64px; display: flex; flex-direction: column; justify-content: space-between; position: relative; z-index: 2; }
.brand { font-weight: 700; font-size: 34px; letter-spacing: -0.02em; }
.brand b { color: #f2a93b; }
.big { font-size: 168px; font-weight: 800; color: #f2a93b; line-height: .9; letter-spacing: -0.04em; }
.big small { display: block; font-size: 40px; color: #d9ddd2; letter-spacing: 0; margin-top: 14px; font-weight: 700; }
.home-h { font-size: 54px; font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; }
.home-h em { font-style: normal; color: #f2a93b; }
.count { font-size: 30px; color: #d9ddd2; }
.count sup { font-size: 18px; color: #f2a93b; }
.sub { font-size: 19px; color: #7b847a; line-height: 1.45; }
.chips { display: flex; gap: 10px; }
.chips span { border: 2px solid #2a2f2c; border-radius: 10px; padding: 8px 12px; font-size: 24px; font-weight: 700; color: #f2a93b; }
.right { flex: 1; position: relative; overflow: hidden; padding-right: 48px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%); }
.stack { position: absolute; left: 0; right: 48px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 18px; }
.card { background: #141716; border: 1px solid #2a2f2c; border-radius: 14px; padding: 18px 22px; }
.card.hl { border-color: #f2a93b; box-shadow: 0 0 0 1px #f2a93b, 0 20px 60px rgba(242,169,59,.12); }
.idx { font-size: 13px; color: #7b847a; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.idx::first-letter { color: #f2a93b; }
.w { list-style: none; display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 3px 8px; font-size: 15px; margin-bottom: 12px; }
.w li { white-space: nowrap; }
.w i { font-style: normal; color: #7b847a; font-size: 11px; display: inline-block; width: 18px; text-align: right; margin-right: 5px; }
.w .cs { color: #f2a93b; font-weight: 700; }
dl div { display: flex; gap: 14px; font-size: 14px; line-height: 1.6; }
dt { width: 150px; color: #7b847a; flex: none; }
dd { color: #9cc7a4; white-space: nowrap; }
`;

function page(left, cards) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="left">${left}</div><div class="right"><div class="stack">${cards}</div></div></body></html>`;
}

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });

async function shot(name, html) {
  await p.setContent(html);
  await p.screenshot({ path: resolve(outDir, `${name}.png`) });
  console.log('wrote', `public/og/${name}.png`);
}

for (const n of WORD_COUNTS) {
  const bits = entropyBits(n);
  const mid = (totalFor(n) * 618n) / 1000n; // fixed, arbitrary-looking position
  const cards = (await card(n, mid - 1n)) + (await card(n, mid, 'hl')) + (await card(n, mid + 1n));
  await shot(String(n), page(
    `<div class="brand">all<b>the</b>seeds</div>
     <div><div class="big">${n}<small>word seed phrases</small></div></div>
     <div><div class="count">all 2<sup>${bits}</sup> of them</div>
     <div class="sub">in order, with Bitcoin &amp; Ethereum addresses</div></div>`,
    cards,
  ));
}

{
  const cards = (await card(12, 0n)) + (await card(12, 1n, 'hl')) + (await card(12, 2n));
  await shot('home', page(
    `<div class="brand">all<b>the</b>seeds</div>
     <div class="home-h">Every BIP39 seed phrase. <em>Yours too.</em></div>
     <div><div class="chips">${WORD_COUNTS.map((n) => `<span>${n}</span>`).join('')}</div>
     <div class="sub" style="margin-top:16px">from 2<sup>128</sup> to 2<sup>256</sup> phrases, with BTC &amp; ETH addresses</div></div>`,
    cards,
  ));
}

// apple-touch-icon from the favicon
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(`<html><body style="margin:0">${readFileSync(resolve(root, 'public/favicon.svg'), 'utf8').replace(' rx="7"', '').replace('<svg ', '<svg width="180" height="180" style="display:block" ')}</body></html>`);
await p.screenshot({ path: resolve(root, 'public/apple-touch-icon.png') });
console.log('wrote public/apple-touch-icon.png');
await b.close();
