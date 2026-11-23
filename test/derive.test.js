import assert from 'node:assert/strict';
import { test } from 'node:test';
import { offsetToWords, wordsToOffset, deriveAddresses, totalFor } from '../src/derive.js';

test('offset 0 / 12 words', async () => {
  const w = offsetToWords(0n, 12);
  assert.equal(w.join(' '), 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
  const a = await deriveAddresses(w.join(' '));
  assert.equal(a.compressed, '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA');
  assert.equal(a.segwit, 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
  assert.equal(a.eth, '0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
  assert.match(a.uncompressed, /^1[1-9A-HJ-NP-Za-km-z]{25,34}$/);
});

test('last offset / 24 words', () => {
  const w = offsetToWords(totalFor(24) - 1n, 24);
  assert.equal(w.join(' '), 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote');
});

test('roundtrip', () => {
  for (const n of [12, 15, 18, 21, 24]) {
    const off = (totalFor(n) * 7n) / 13n;
    const r = wordsToOffset(offsetToWords(off, n));
    assert.equal(r.offset, off);
    assert.equal(r.checksumOk, true);
  }
});
