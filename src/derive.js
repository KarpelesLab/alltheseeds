// Core derivation: offset (BigInt) -> mnemonic -> addresses.
import { entropyToMnemonic, mnemonicToSeedWebcrypto } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bech32, createBase58check } from '@scure/base';

export { wordlist };

const b58c = createBase58check(sha256);

export const WORD_COUNTS = [12, 15, 18, 21, 24];

/** Entropy bits for a given word count (12 -> 128 ... 24 -> 256). */
export const entropyBits = (words) => (words * 11 * 32) / 33;

/** Total number of valid mnemonics for a word count: 2^entropyBits. */
export const totalFor = (words) => 1n << BigInt(entropyBits(words));

/** BigInt offset -> big-endian entropy bytes. */
export function offsetToEntropy(offset, words) {
  const len = entropyBits(words) / 8;
  const out = new Uint8Array(len);
  let v = offset;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Offset -> array of words (the last word carries the checksum). */
export function offsetToWords(offset, words) {
  return entropyToMnemonic(offsetToEntropy(offset, words), wordlist).split(' ');
}

/** Words (array or string) -> BigInt offset, validating the checksum. */
export function wordsToOffset(input) {
  const list = (Array.isArray(input) ? input : input.trim().toLowerCase().split(/\s+/)).filter(Boolean);
  if (!WORD_COUNTS.includes(list.length)) throw new Error(`Expected 12/15/18/21/24 words, got ${list.length}`);
  let acc = 0n;
  for (const w of list) {
    const idx = wordlist.indexOf(w);
    if (idx < 0) throw new Error(`Unknown word: ${w}`);
    acc = (acc << 11n) | BigInt(idx);
  }
  const csBits = BigInt(list.length * 11 / 33);
  const offset = acc >> csBits;
  // verify checksum by regenerating
  const expected = offsetToWords(offset, list.length);
  const checksumOk = expected[expected.length - 1] === list[list.length - 1];
  return { offset, words: list.length, checksumOk, expectedLast: expected[expected.length - 1] };
}

const hash160 = (b) => ripemd160(sha256(b));

function p2pkh(pub) {
  const payload = new Uint8Array(21);
  payload.set(hash160(pub), 1); // version 0x00
  return b58c.encode(payload);
}

function p2wpkh(pub) {
  const prog = bech32.toWords(hash160(pub));
  return bech32.encode('bc', [0, ...prog]);
}

const hexOf = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function ethAddress(pub) {
  const unc = secp256k1.Point.fromBytes(pub).toBytes(false);
  const addr = hexOf(keccak_256(unc.subarray(1)).subarray(12));
  const h = hexOf(keccak_256(new TextEncoder().encode(addr)));
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(h[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i];
  return out;
}

export const PATHS = {
  legacy: "m/44'/0'/0'/0/0",
  segwit: "m/84'/0'/0'/0/0",
  eth: "m/44'/60'/0'/0/0",
};

/** Mnemonic string -> addresses. */
export async function deriveAddresses(mnemonic, passphrase = '') {
  const seed = await mnemonicToSeedWebcrypto(mnemonic, passphrase);
  const root = HDKey.fromMasterSeed(seed);
  const legacyPub = root.derive(PATHS.legacy).publicKey;
  const segwitPub = root.derive(PATHS.segwit).publicKey;
  const ethPub = root.derive(PATHS.eth).publicKey;
  const legacyUnc = secp256k1.Point.fromBytes(legacyPub).toBytes(false);
  return {
    uncompressed: p2pkh(legacyUnc),
    compressed: p2pkh(legacyPub),
    segwit: p2wpkh(segwitPub),
    eth: ethAddress(ethPub),
  };
}
