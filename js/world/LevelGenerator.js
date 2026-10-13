import { CONFIG } from '../config.js';
import { Platform } from '../entities/Platform.js';
import { clamp, lerp } from '../utils/math.js';

const RULES = CONFIG.generation;
const NO_CEILING = -Infinity;
const SPREAD_TRIES = 12;

/**
 * Builds the climb one platform at a time, bottom to top, forever.
 *
 * Every platform is placed where a full jump from the previous one can land:
 * never higher than the jump's peak (less `riseMargin`), and never further
 * sideways than the same arc can carry the player. Within that, each one is
 * pushed away from the last so the climb zigzags across the column instead
 * of stacking up in one place.
 */
export class LevelGenerator {
  constructor({ random, jumpModel, viewWidth }) {
    this.random = random;
    this.jumpModel = jumpModel;
    this.viewWidth = viewWidth;
    this.count = 0;
    this.last = null;
  }

  /** Starts a new climb. Returns the floor the player starts on. */
  createStart() {
    this.count = 0;
    this.last = new Platform({
      x: 0,
      y: CONFIG.start.floorTop,
      width: this.viewWidth,
      height: CONFIG.platform.thickness.max,
      index: 3,
      scores: false,
    });
    return this.last;
  }

  /** Builds the next platform above the previous one. */
  next() {
    const tuning = this.tuning();
    const { thickness } = CONFIG.platform;
    const maxRise = this.jumpModel.jumpHeight - RULES.riseMargin;
    const rise = maxRise * this.random.range(tuning.riseMin, tuning.riseMax);
    const top = this.last.top - rise;
    const width = this.random.range(tuning.widthMin, tuning.widthMax);

    const platform = new Platform({
      x: this.pickX(top, width, tuning),
      y: top,
      width,
      height: this.random.range(thickness.min, thickness.max),
      index: this.count,
    });

    this.last = platform;
    this.count += 1;
    return platform;
  }

  /** Blends the easy and hard settings by how far into the climb we are. */
  tuning() {
    const difficulty = clamp(this.count / RULES.rampPlatforms, 0, 1);
    const { easy, hard } = RULES;
    return Object.fromEntries(Object.keys(easy).map((key) => [key, lerp(easy[key], hard[key], difficulty)]));
  }

  /**
   * Anywhere in the column whose nearest edge is within the safe sideways reach
   * of the last platform, preferring spots at least `minShift` away from it.
   */
  pickX(top, width, tuning) {
    const reach = this.jumpModel.reach(this.last.top, top, NO_CEILING) * RULES.reachSafety * tuning.reachMax;
    const { sideMargin, minShift } = RULES;
    const min = Math.max(sideMargin, this.last.left - reach - width);
    const max = Math.max(min, Math.min(this.viewWidth - sideMargin - width, this.last.right + reach));
    const lastCenter = this.last.centerX;

    let best = min;
    let bestShift = -1;
    for (let attempt = 0; attempt < SPREAD_TRIES; attempt += 1) {
      const x = this.random.range(min, max);
      const shift = Math.abs(x + width / 2 - lastCenter);
      if (shift >= minShift) return x;
      if (shift > bestShift) [best, bestShift] = [x, shift];
    }
    return best; // no room for a full shift: take the widest one found
  }
}
