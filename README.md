# All The Seeds

Every BIP39 seed phrase that can exist, listed in order, with its addresses.

Pick a length (`/12/`, `/15/`, `/18/`, `/21/`, `/24/`) and scroll from offset `0` to `2^bits − 1`.
Row `n` is the phrase whose entropy is `n` (big-endian); the last word is computed so its checksum bits match `SHA-256(entropy)`.

For each phrase (empty passphrase) the first address on these paths is shown:

| Column | Path | Format |
| --- | --- | --- |
| BTC uncompressed | `m/44'/0'/0'/0/0` | P2PKH, uncompressed pubkey |
| BTC compressed | `m/44'/0'/0'/0/0` | P2PKH, compressed pubkey |
| BTC segwit | `m/84'/0'/0'/0/0` | P2WPKH (bech32) |
| ETH | `m/44'/60'/0'/0/0` | EIP-55 |

Everything runs client-side (Web Workers + WebCrypto PBKDF2, [noble](https://paulmillr.com/noble/)/[scure](https://github.com/paulmillr/scure-bip32) libraries). The page makes no network requests.

## Navigation

- Mouse wheel / touch drag / arrow keys / `j` `k`: one row at a time; PageUp/PageDown/Space: a screen
- Drag the scrollbar thumb anywhere across the whole range; Home / End; `r` for random; `/` to focus the jump box
- The jump box accepts a decimal offset, `0x…` hex, `2^n` (optionally `±k`), a percentage like `50%`, or a phrase
- The URL hash holds the current offset, so positions can be shared: `/24/#57896044618658097711785492504343953926634992332820282019728792003956564819968`

## Development

```sh
npm ci
npm test         # derivation test vectors
npm run dev
npm run build    # static site in dist/
```

Pushing to `master` builds and deploys to GitHub Pages via `.github/workflows/pages.yml`.

## SEO / social previews

`build/seo.js` (a Vite plugin) injects per-page `<title>`, description, canonical URL, OpenGraph/Twitter tags and JSON-LD, adds a crawlable `<noscript>` summary (with real example rows) to each viewer page, and emits `sitemap.xml` and `robots.txt`.
Absolute URLs come from `SITE_URL` (default `https://karpeleslab.github.io/alltheseeds/`); set it in the workflow if a custom domain is added.

OpenGraph images in `public/og/` are pre-rendered and committed. To regenerate them:

```sh
npm i --no-save playwright && npx playwright install chromium
node scripts/make-og.mjs
```
