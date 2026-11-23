import './style.css';
import { WORD_COUNTS, entropyBits, totalFor } from './derive.js';
import { groupDigits } from './format.js';

const choices = document.getElementById('choices');
const spec = document.getElementById('spec');
for (const n of WORD_COUNTS) {
  const bits = entropyBits(n);
  const a = document.createElement('a');
  a.className = 'choice';
  a.href = `./${n}/`;
  a.innerHTML = `<span class="n">${n}</span><span class="w">words</span><span class="c">2<sup>${bits}</sup></span>`;
  a.title = `${groupDigits(totalFor(n))} phrases`;
  choices.append(a);
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${n}</td><td>${bits} bits</td><td>${n / 3} bits</td><td class="num">${groupDigits(totalFor(n))}</td>`;
  spec.append(tr);
}
