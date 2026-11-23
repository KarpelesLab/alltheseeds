import { deriveAddresses } from './derive.js';

self.onmessage = async (e) => {
  const m = e.data;
  try {
    self.postMessage({ m, r: await deriveAddresses(m) });
  } catch (err) {
    self.postMessage({ m, err: String(err) });
  }
};
