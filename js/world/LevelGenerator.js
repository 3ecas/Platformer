import { CONFIG } from '../config.js';
import { Platform } from '../entities/Platform.js';
import { clamp, lerp } from '../utils/math.js';

const RULES = CONFIG.generation;
const PLAYER = CONFIG.player;
const NO_CEILING = -Infinity;

/**
 * Builds the climb one platform at a time, bottom to top, forever.
 *
 * Every platform is placed where a full jump from the previous one can land:
 * never higher than the jump's peak (less `riseMargin`), and never further
 * sideways than the same arc can carry the player. Platforms are solid only
 * from above, so one sitting directly overhead is fine.
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
    const { floorTop, fallDelay } = CONFIG.start;
    this.count = 0;
    this.last = new Platform({
      x: 0,
      y: floorTop,
      width: this.viewWidth,
      height: CONFIG.platform.thickness.max,
      fallDelay,
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
      // Wide platforms wait longer, so there is always time to run across.
      fallDelay: tuning.reactionTime + width / PLAYER.maxSpeed,
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

  /** Anywhere in the column whose nearest edge is within the safe sideways reach of the last platform. */
  pickX(top, width, tuning) {
    const reach = this.jumpModel.reach(this.last.top, top, NO_CEILING) * RULES.reachSafety * tuning.reachMax;
    const { sideMargin } = RULES;
    const min = Math.max(sideMargin, this.last.left - reach - width);
    const max = Math.min(this.viewWidth - sideMargin - width, this.last.right + reach);
    return this.random.range(min, Math.max(min, max));
  }
}
