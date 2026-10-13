/**
 * Small, fast, seedable random numbers (mulberry32), so a level can be
 * rebuilt exactly from its seed.
 */
export class Random {
  constructor(seed = Date.now()) {
    this.seed(seed);
  }

  seed(value) {
    this.state = value >>> 0;
  }

  /** A float in [0, 1). */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  chance(probability) {
    return this.next() < probability;
  }
}

/** Stateless hash of an integer to [0, 1): same input, same output. Handy for endless scenery. */
export function hash01(index, seed = 0) {
  let t = (Math.imul(index, 0x9e3779b1) ^ Math.imul(seed + 1, 0x85ebca6b)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
