import { CONFIG } from '../config.js';
import { Platform } from '../entities/Platform.js';
import { Flamer } from '../entities/Flamer.js';
import { Thorn } from '../entities/Thorn.js';
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
 * slide side to side; from `spikesFrom` some carry spikes, and from
 * `thornsFrom` thorn balls drift in the gaps, and from `flamesFrom`
 * flamethrowers fire from the walls, all more often the higher you go.
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

  /** Builds the next platform above the previous one, sometimes with a thorn or a flamethrower in the gap below it. */
  next() {
    const tuning = this.tuning();
    const { thickness } = CONFIG.platform;
    const maxRise = this.jumpModel.jumpHeight - RULES.riseMargin;
    const rise = maxRise * this.random.range(tuning.riseMin, tuning.riseMax);
    const top = this.last.homeY - rise;
    const width = this.random.range(tuning.widthMin, tuning.widthMax);
    const x = this.pickX(top, width, tuning);

    const platform = new Platform({
      x,
      y: top,
      width,
      height: this.random.range(thickness.min, thickness.max),
      index: this.count,
      ...this.pickMotion(top, x, width),
      spikes: this.pickSpikes(top, width),
    });
    // A lift can carry a player standing on it up into the middle of the gap above, so keep that gap clear.
    const aboveLift = isLift(this.last);
    const flamer = aboveLift ? null : this.pickFlamer(this.last, platform);
    const thorn = aboveLift || flamer ? null : this.pickThorn(this.last.homeY, top);

    this.last = platform;
    this.count += 1;
    return { platform, thorn, flamer };
  }

  metersAt(top) {
    return (CONFIG.start.floorTop - top) / CONFIG.score.pixelsPerMeter;
  }

  /** 0 → 1 as the climb goes from `from` metres to `from + obstacleRamp`; −1 below `from`. */
  obstacleRamp(top, from) {
    const meters = this.metersAt(top);
    if (meters < from) return -1;
    return clamp((meters - from) / RULES.obstacleRamp, 0, 1);
  }

  /** Spikes along one end of the top, always leaving a safe stretch to land on. */
  pickSpikes(top, width) {
    const ramp = this.obstacleRamp(top, RULES.spikesFrom);
    if (ramp < 0 || !this.random.chance(lerp(RULES.spikesChance.min, RULES.spikesChance.max, ramp))) return null;
    const length = Math.min(width * this.random.range(RULES.spikesShare.min, RULES.spikesShare.max), width - RULES.spikesMinSafe);
    if (length < 18) return null; // too narrow to spike and still land on
    return this.random.chance(0.5) ? { from: 0, to: length } : { from: width - length, to: width };
  }

  /**
   * A flamethrower across the way up between two platforms. Every jump from
   * the lower one to the upper one passes its height, and the jet reaches from
   * the nearer wall to just past the far end of the stretch between the two
   * platforms' centres, so the player has to time the jump for when it's off.
   * It's only placed where that stretch comes close to a wall, so the jet
   * stays short and doesn't waste flame on space the player never crosses.
   */
  pickFlamer(lower, upper) {
    const ramp = this.obstacleRamp(upper.homeY, RULES.flamesFrom);
    if (ramp < 0) return null;
    const range = (key) => this.random.range(RULES[key].min, RULES[key].max);

    // The stretch a jump between the two crosses, widened by any sideways swing.
    const swing = (platform) => (platform.moving && platform.axis === 'x' ? platform.range : 0);
    const centers = [lower.homeX + lower.width / 2, upper.homeX + upper.width / 2];
    const margin = RULES.flameCoverMargin + Math.max(swing(lower), swing(upper));
    const pathLeft = Math.max(0, Math.min(...centers) - margin);
    const pathRight = Math.min(this.viewWidth, Math.max(...centers) + margin);
    const fromLeft = { side: 'left', idle: pathLeft, length: pathRight };
    const fromRight = { side: 'right', idle: this.viewWidth - pathRight, length: this.viewWidth - pathLeft };
    const { side, idle, length } = fromLeft.idle <= fromRight.idle ? fromLeft : fromRight;
    if (idle > RULES.flameMaxIdle || length > RULES.flameMaxLength) return null; // the way up is too far from a wall
    if (!this.random.chance(lerp(RULES.flamesChance.min, RULES.flamesChance.max, ramp))) return null;

    return new Flamer({
      side,
      y: (lower.homeY + upper.homeY) / 2,
      length: Math.max(length, RULES.flameMinLength),
      viewWidth: this.viewWidth,
      offTime: range('flameOffTime'),
      warnTime: RULES.flameWarnTime,
      onTime: range('flameOnTime'),
      phase: this.random.range(0, 10),
    });
  }

  /** A thorn ball drifting across the middle of the gap between two platforms. */
  pickThorn(lowerTop, upperTop) {
    const ramp = this.obstacleRamp(upperTop, RULES.thornsFrom);
    if (ramp < 0 || !this.random.chance(lerp(RULES.thornsChance.min, RULES.thornsChance.max, ramp))) return null;
    const radius = RULES.thornRadius;
    const range = this.random.range(RULES.thornRange.min, RULES.thornRange.max);
    const margin = RULES.sideMargin + radius * 1.4;
    const homeX = this.random.range(margin + range, Math.max(margin + range, this.viewWidth - margin - range));
    return new Thorn({
      x: Math.min(homeX, this.viewWidth - margin),
      y: (lowerTop + upperTop) / 2,
      radius,
      range: Math.min(range, this.viewWidth / 2 - margin),
      speed: this.random.range(RULES.thornSpeed.min, RULES.thornSpeed.max),
      phase: this.random.range(0, Math.PI * 2),
    });
  }

  /**
   * Motion for platforms high enough up, or none. From `movingFrom` some slide
   * side to side, centred on the reachable spot `pickX` chose and trimmed to
   * stay inside the walls; from `liftsFrom` some rise and sink instead, by a
   * small enough range that the next jump still works from any point of it.
   */
  pickMotion(top, x, width) {
    const meters = this.metersAt(top);
    if (meters < RULES.movingFrom) return {};
    const ramp = clamp((meters - RULES.movingFrom) / RULES.movingRamp, 0, 1);
    if (!this.random.chance(lerp(RULES.movingChance.min, RULES.movingChance.max, ramp))) return {};

    const { min, max } = RULES.movingSpeed;
    const motion = { speed: this.random.range(min, max), phase: this.random.range(0, Math.PI * 2) };
    if (meters >= RULES.liftsFrom && this.random.chance(RULES.liftShare)) {
      return { ...motion, axis: 'y', range: this.random.range(RULES.liftRange.min, RULES.liftRange.max) };
    }

    const room = Math.min(x - RULES.sideMargin, this.viewWidth - RULES.sideMargin - width - x);
    const range = Math.min(room, this.random.range(RULES.movingRange.min, RULES.movingRange.max));
    if (range < RULES.movingRange.min / 2) return {}; // squeezed against a wall: leave it still
    return { ...motion, axis: 'x', range };
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
    const reach = this.jumpModel.reach(this.last.homeY, top, NO_CEILING) * RULES.reachSafety * tuning.reachMax;
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

function isLift(platform) {
  return platform.moving && platform.axis === 'y';
}
