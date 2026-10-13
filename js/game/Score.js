const STORAGE_KEY = 'pastel-climb.best';

/** The current run's height and platform count, plus the best height ever (kept in localStorage when it's available). */
export class Score {
  constructor() {
    this.best = readBest();
    this.reset();
  }

  reset() {
    this.height = 0;
    this.platforms = 0;
  }

  /** Records a new height in metres. Returns true if it went up. */
  setHeight(meters) {
    if (meters <= this.height) return false;
    this.height = meters;
    return true;
  }

  addPlatform() {
    this.platforms += 1;
  }

  /** Records the finished run. Returns true if it set a new best. */
  commit() {
    if (this.height <= this.best) return false;
    this.best = this.height;
    writeBest(this.best);
    return true;
  }
}

function readBest() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0; // storage is blocked (private window, sandboxed frame…)
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Failing to save the best height isn't worth interrupting play for.
  }
}
