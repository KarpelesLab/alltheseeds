// Small worker pool with an LRU cache. `request()` replaces the pending queue,
// so fast scrolling only ever computes what is (or is about to be) on screen.
const CACHE_MAX = 4000;

export class Pool {
  constructor(onResult) {
    this.onResult = onResult;
    this.cache = new Map();
    this.inflight = new Set();
    this.queue = [];
    this.idle = [];
    const n = Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 8));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this._done(w, e.data);
      this.idle.push(w);
    }
  }

  get(m) {
    const r = this.cache.get(m);
    if (r) { this.cache.delete(m); this.cache.set(m, r); }
    return r;
  }

  request(list) {
    this.queue = list.filter((m) => !this.cache.has(m) && !this.inflight.has(m));
    this._pump();
  }

  _pump() {
    while (this.idle.length && this.queue.length) {
      const m = this.queue.shift();
      const w = this.idle.pop();
      this.inflight.add(m);
      w.postMessage(m);
    }
  }

  _done(w, { m, r, err }) {
    this.inflight.delete(m);
    this.idle.push(w);
    const res = r || { error: err };
    this.cache.set(m, res);
    if (this.cache.size > CACHE_MAX) this.cache.delete(this.cache.keys().next().value);
    this.onResult(m, res);
    this._pump();
  }
}
