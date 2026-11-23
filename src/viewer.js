import './style.css';
import { offsetToWords, wordsToOffset, totalFor, entropyBits, WORD_COUNTS, PATHS } from './derive.js';
import { Pool } from './pool.js';
import { groupDigits, pct } from './format.js';

const WORDS = Number(document.body.dataset.words);
const BITS = entropyBits(WORDS);
const TOTAL = totalFor(WORDS);
const LAST = TOTAL - 1n;
const COLS = { 12: 6, 15: 5, 18: 6, 21: 7, 24: 6 }[WORDS];
const SCALE = 2n ** 53n;

const ADDRS = [
  { key: 'uncompressed', label: 'BTC uncompressed', type: 'P2PKH, uncompressed pubkey', path: PATHS.legacy, url: (a) => `https://mempool.space/address/${a}` },
  { key: 'compressed', label: 'BTC compressed', type: 'P2PKH, compressed pubkey', path: PATHS.legacy, url: (a) => `https://mempool.space/address/${a}` },
  { key: 'segwit', label: 'BTC segwit', type: 'P2WPKH, native segwit (bech32)', path: PATHS.segwit, url: (a) => `https://mempool.space/address/${a}` },
  { key: 'eth', label: 'ETH', type: 'EIP-55 checksummed', path: PATHS.eth, url: (a) => `https://etherscan.io/address/${a}` },
];

// ---------- DOM ----------
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...kids);
  return el;
};

const tabs = WORD_COUNTS.map((n) =>
  h('a', { href: `../${n}/`, class: n === WORDS ? 'tab active' : 'tab', 'aria-current': n === WORDS ? 'page' : 'false' }, `${n}`),
);
const jumpInput = h('input', {
  type: 'text', spellcheck: 'false', autocomplete: 'off',
  placeholder: 'Jump: offset, 0x…, 2^n, 50%, or a phrase',
  'aria-label': 'Jump to offset or seed phrase',
});
const msg = h('div', { class: 'msg', role: 'status' });
const pctEl = h('span', { class: 'pct' });
const rowsEl = h('div', { class: 'rows', tabindex: '0', 'aria-label': 'Seed phrases' });
const thumb = h('div', { class: 'thumb', role: 'slider', tabindex: '-1', 'aria-label': 'Position' });
const track = h('div', { class: 'track' }, thumb);
const btnUp = h('button', { class: 'sb-btn', 'aria-label': 'Previous row' }, '▲');
const btnDown = h('button', { class: 'sb-btn', 'aria-label': 'Next row' }, '▼');

document.body.append(
  h('header', { class: 'bar' },
    h('a', { class: 'brand', href: '../' }, 'all', h('b', {}, 'the'), 'seeds'),
    h('nav', { class: 'tabs', 'aria-label': 'Word count' }, h('span', { class: 'tabs-label' }, 'words'), ...tabs),
    h('form', { class: 'jump', onsubmit: (e) => { e.preventDefault(); jump(jumpInput.value); } },
      jumpInput, h('button', { type: 'submit' }, 'Go')),
    h('div', { class: 'actions' },
      h('button', { onclick: () => go(0n), title: 'First (Home)' }, '⇤ first'),
      h('button', { onclick: () => goRandom(), title: 'Random (R)' }, '⚄ random'),
      h('button', { onclick: () => go(LAST), title: 'Last (End)' }, 'last ⇥')),
  ),
  h('div', { class: 'status' },
    h('span', {}, `${WORDS} words · ${BITS} bits entropy + ${WORDS / 3} bits checksum · 2`, h('sup', {}, `${BITS}`), ` = ${groupDigits(TOTAL)} phrases`),
    h('span', { class: 'status-right' }, 'position ', pctEl)),
  msg,
  h('main', { class: 'viewer' }, rowsEl, h('div', { class: 'scrollbar' }, btnUp, track, btnDown)),
  h('footer', { class: 'foot' },
    `Paths: BTC legacy ${PATHS.legacy} · segwit ${PATHS.segwit} · ETH ${PATHS.eth} · empty passphrase. `,
    'Everything is computed in your browser. Click a phrase to copy it. Never put a real seed phrase into any website.'),
);

// ---------- state ----------
let top = 0n;          // offset of first displayed row
let count = 1;         // full rows that fit
let rowH = 100;
let highlight = null;  // offset to highlight after a jump
let shown = [];        // [{ offset, mnemonic, el }]
let rafPending = false;

const pool = new Pool((m, r) => {
  for (const s of shown) if (s.mnemonic === m) fillAddrs(s.el, r);
});

const maxTop = () => (TOTAL > BigInt(count) ? TOTAL - BigInt(count) : 0n);
const clamp = (o) => (o < 0n ? 0n : o > maxTop() ? maxTop() : o);

function go(o, hl = null) {
  top = clamp(o);
  highlight = hl;
  schedule();
}
const move = (d) => go(top + BigInt(d));

function goRandom() {
  const bytes = crypto.getRandomValues(new Uint8Array(BITS / 8));
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  go(v, v);
}

function schedule() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; render(); });
}

// ---------- rows ----------
function makeRow() {
  const words = h('ol', { class: 'words', style: `--cols:${COLS}`, title: 'Click to copy phrase' });
  for (let i = 0; i < WORDS; i++) words.append(h('li', {}, h('i', {}, `${i + 1}`), h('span')));
  words.lastChild.classList.add('checksum');
  words.lastChild.title = 'Last word: contains the checksum';
  words.addEventListener('click', () => copy(words.dataset.phrase));
  const addrs = h('dl', { class: 'addrs' });
  for (const a of ADDRS) {
    addrs.append(h('div', { class: `addr addr-${a.key}` },
      h('dt', { title: `${a.type} · ${a.path}` }, a.label),
      h('dd', {}, h('a', { target: '_blank', rel: 'noopener noreferrer' }))));
  }
  return h('div', { class: 'row' }, h('div', { class: 'idx' }), words, addrs);
}

function fillRow(el, offset, list) {
  el.hidden = false;
  el.querySelector('.idx').textContent = groupDigits(offset);
  const words = el.querySelector('.words');
  words.dataset.phrase = list.join(' ');
  const spans = words.querySelectorAll('span');
  for (let i = 0; i < list.length; i++) spans[i].textContent = list[i];
  el.classList.toggle('hl', highlight !== null && offset === highlight);
}

function fillAddrs(el, r) {
  ADDRS.forEach((a, i) => {
    const link = el.querySelectorAll('.addr a')[i];
    if (!r) { link.textContent = '…'; link.removeAttribute('href'); link.classList.add('pending'); return; }
    const v = r[a.key] || r.error || '?';
    link.textContent = v;
    link.classList.remove('pending');
    if (r[a.key]) link.href = a.url(v); else link.removeAttribute('href');
  });
}

function measure() {
  if (!rowsEl.firstChild) rowsEl.append(makeRow());
  const probe = rowsEl.firstChild;
  fillRow(probe, top, offsetToWords(top, WORDS));
  rowH = probe.getBoundingClientRect().height || 100;
  count = Math.max(1, Math.floor(rowsEl.clientHeight / rowH));
  // keep a jump target fully on screen after layout changes
  if (highlight !== null && highlight >= top + BigInt(count)) top = highlight - BigInt(count) + 1n;
  top = clamp(top);
}

function render() {
  const n = count + 1; // one extra (partial) row at the bottom
  while (rowsEl.children.length < n) rowsEl.append(makeRow());
  while (rowsEl.children.length > n) rowsEl.lastChild.remove();

  shown = [];
  const want = [];
  for (let i = 0; i < n; i++) {
    const el = rowsEl.children[i];
    const offset = top + BigInt(i);
    if (offset > LAST) { el.hidden = true; continue; }
    const list = offsetToWords(offset, WORDS);
    const mnemonic = list.join(' ');
    fillRow(el, offset, list);
    fillAddrs(el, pool.get(mnemonic));
    shown.push({ offset, mnemonic, el });
    want.push(mnemonic);
  }
  // prefetch the next screen (lower priority, after the visible rows)
  for (let i = n; i < n * 2; i++) {
    const offset = top + BigInt(i);
    if (offset > LAST) break;
    want.push(offsetToWords(offset, WORDS).join(' '));
  }
  pool.request(want);

  // status + scrollbar
  const mt = maxTop();
  const frac = mt === 0n ? 0 : Number(top) / Number(mt);
  pctEl.textContent = pct(frac);
  const free = track.clientHeight - thumb.offsetHeight;
  thumb.style.transform = `translateY(${Math.round(frac * free)}px)`;
  thumb.setAttribute('aria-valuetext', pct(frac));
  writeHash();
}

// ---------- URL hash ----------
let hashTimer = 0;
let lastHash = '';
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const target = highlight ?? top;
    lastHash = `#${target}`;
    if (location.hash !== lastHash) history.replaceState(null, '', lastHash);
  }, 250);
}
function readHash() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (!raw || raw === lastHash.slice(1)) return;
  jump(raw, true);
}
addEventListener('hashchange', readHash);

// ---------- jump ----------
function say(text, kind = '') {
  msg.textContent = text;
  msg.className = `msg ${kind}`;
  clearTimeout(say.t);
  if (text) say.t = setTimeout(() => say(''), 6000);
}

function parseTarget(input) {
  const s = input.trim().toLowerCase().replace(/[,_\s]+$/g, '');
  if (!s) return null;
  if (/^0x[0-9a-f]+$/.test(s)) return BigInt(s);
  if (/^[\d,_]+$/.test(s)) return BigInt(s.replace(/[,_]/g, ''));
  let m;
  if ((m = /^2\s*(?:\^|\*\*)\s*(\d+)(?:\s*([+-])\s*(\d+))?$/.exec(s))) {
    let v = 2n ** BigInt(m[1]);
    if (m[2]) v = m[2] === '+' ? v + BigInt(m[3]) : v - BigInt(m[3]);
    return v;
  }
  if ((m = /^(\d+(?:\.\d+)?)\s*%$/.exec(s))) {
    const p = Math.min(100, Math.max(0, parseFloat(m[1])));
    return (BigInt(Math.round((p / 100) * Number(SCALE))) * LAST) / SCALE;
  }
  if (/[a-z]/.test(s)) {
    const r = wordsToOffset(s);
    return { phrase: r };
  }
  throw new Error('Could not parse that');
}

function jump(input, fromHash = false) {
  let t;
  try {
    t = parseTarget(input);
  } catch (e) {
    say(e.message, 'err');
    return;
  }
  if (t === null) return;
  if (typeof t === 'object') {
    const { offset, words, checksumOk, expectedLast } = t.phrase;
    if (words !== WORDS) {
      location.href = `../${words}/#${offset}`;
      return;
    }
    if (!checksumOk) say(`Checksum mismatch: with these words the last word must be “${expectedLast}”. Showing that phrase.`, 'warn');
    else say('');
    jumpInput.value = '';
    jumpInput.blur();
    go(offset - 1n, offset);
    return;
  }
  if (t > LAST) {
    say(`Offset is beyond the last ${WORDS}-word phrase (2^${BITS} − 1). Showing the end.`, 'warn');
    t = LAST;
  } else if (!fromHash) say('');
  if (!fromHash) { jumpInput.value = ''; jumpInput.blur(); }
  // show a row of context above the target
  go(t > 0n ? t - 1n : 0n, t);
}

// ---------- copy ----------
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    say('Phrase copied to clipboard.');
  } catch {
    say('Could not access the clipboard.', 'err');
  }
}

// ---------- input: wheel / touch / keys / scrollbar ----------
let wheelAcc = 0;
rowsEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? rowsEl.clientHeight : 1;
  wheelAcc += e.deltaY * unit;
  const rows = Math.trunc(wheelAcc / (rowH * 0.6));
  if (rows) { wheelAcc -= rows * rowH * 0.6; move(rows); }
}, { passive: false });

let touchY = null;
rowsEl.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
rowsEl.addEventListener('touchmove', (e) => {
  if (touchY === null) return;
  e.preventDefault();
  const y = e.touches[0].clientY;
  const rows = Math.trunc((touchY - y) / (rowH * 0.5));
  if (rows) { touchY -= rows * rowH * 0.5; move(rows); }
}, { passive: false });
rowsEl.addEventListener('touchend', () => { touchY = null; });

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = {
    ArrowDown: () => move(1), ArrowUp: () => move(-1), j: () => move(1), k: () => move(-1),
    PageDown: () => move(count), PageUp: () => move(-count), ' ': () => move(e.shiftKey ? -count : count),
    Home: () => go(0n), End: () => go(LAST), r: () => goRandom(), '/': () => jumpInput.focus(),
  }[e.key];
  if (k) { e.preventDefault(); k(); }
});

const fracToTop = (f) => {
  const mt = maxTop();
  if (f <= 0) return 0n;
  if (f >= 1) return mt;
  return (BigInt(Math.floor(f * Number(SCALE))) * mt) / SCALE;
};
function trackFrac(clientY, grab) {
  const r = track.getBoundingClientRect();
  const free = r.height - thumb.offsetHeight;
  return free > 0 ? (clientY - r.top - grab) / free : 0;
}
let grab = null;
thumb.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  thumb.setPointerCapture(e.pointerId);
  grab = e.clientY - thumb.getBoundingClientRect().top;
  thumb.classList.add('drag');
});
thumb.addEventListener('pointermove', (e) => { if (grab !== null) go(fracToTop(trackFrac(e.clientY, grab))); });
const endDrag = () => { grab = null; thumb.classList.remove('drag'); };
thumb.addEventListener('pointerup', endDrag);
thumb.addEventListener('pointercancel', endDrag);
track.addEventListener('pointerdown', (e) => {
  if (e.target !== track) return;
  go(fracToTop(trackFrac(e.clientY, thumb.offsetHeight / 2)));
});

function holdRepeat(btn, fn) {
  let t1, t2;
  const stop = () => { clearTimeout(t1); clearInterval(t2); };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fn();
    t1 = setTimeout(() => { t2 = setInterval(fn, 50); }, 350);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
}
holdRepeat(btnUp, () => move(-1));
holdRepeat(btnDown, () => move(1));

// ---------- boot ----------
new ResizeObserver(() => { measure(); schedule(); }).observe(rowsEl);
readHash();
measure();
render();
rowsEl.focus({ preventScroll: true });
