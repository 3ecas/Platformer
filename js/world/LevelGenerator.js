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
 * of stacking up in one place. From `movingFrom` metres up, some platforms
 * slide side to side, more of them the higher you go.
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
    const x = this.pickX(top, width, tuning);

    const platform = new Platform({
      x,
      y: top,
      width,
      height: this.random.range(thickness.min, thickness.max),
      index: this.count,
      ...this.pickMotion(top, x, width),
    });

    this.last = platform;
    this.count += 1;
    return platform;
  }

  /**
   * Side-to-side motion for platforms high enough up, or none. The swing is
   * centred on the reachable spot `pickX` chose, trimmed to stay inside the walls.
   */
  pickMotion(top, x, width) {
    const meters = (CONFIG.start.floorTop - top) / CONFIG.score.pixelsPerMeter;
    if (meters < RULES.movingFrom) return {};
    const ramp = clamp((meters - RULES.movingFrom) / RULES.movingRamp, 0, 1);
    if (!this.random.chance(lerp(RULES.movingChance.min, RULES.movingChance.max, ramp))) return {};

    const room = Math.min(x - RULES.sideMargin, this.viewWidth - RULES.sideMargin - width - x);
    const range = Math.min(room, this.random.range(RULES.movingRange.min, RULES.movingRange.max));
    if (range < RULES.movingRange.min / 2) return {}; // squeezed against a wall: leave it still
    const { min, max } = RULES.movingSpeed;
    return { range, speed: this.random.range(min, max), phase: this.random.range(0, Math.PI * 2) };
  }

  /** Blends the easy and hard settings by how far into the climb we are. */
  tuning() {
    const difficulty = clamp(this.count / RULES.rampPlatforms, 0, 1);
    const { easy, hard } = RULES;
    return Object.fromEntries(Object.keys(easy).map((key) => [key, lerp(easy[key], hard[key], difficulty)]));
  }

  /**
   * Anywhere in the column whose nearest edge is within the safe sideways reach
   * of the last platform (the middle of its swing, if it moves), preferring
   * spots at least `minShift` away from it.
   */
  pickX(top, width, tuning) {
    const reach = this.jumpModel.reach(this.last.top, top, NO_CEILING) * RULES.reachSafety * tuning.reachMax;
    const { sideMargin, minShift } = RULES;
    const home = this.last.homeX; // a moving platform's centre of swing
    const min = Math.max(sideMargin, home - reach - width);
    const max = Math.max(min, Math.min(this.viewWidth - sideMargin - width, home + this.last.width + reach));
    const lastCenter = home + this.last.width / 2;

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
