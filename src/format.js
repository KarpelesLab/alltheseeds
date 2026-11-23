/** Group a decimal BigInt string with thin separators for readability. */
export function groupDigits(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Human percentage for a float fraction in [0,1], keeping tiny values visible. */
export function pct(frac) {
  if (frac === 0) return '0%';
  if (frac >= 1) return '100%';
  const p = frac * 100;
  if (p >= 0.001) return p.toFixed(p >= 1 ? 4 : 6).replace(/0+$/, '').replace(/\.$/, '') + '%';
  return p.toExponential(3) + '%';
}
