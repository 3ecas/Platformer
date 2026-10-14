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
 * of stacking up in one place.
 *
 * Challenges are added gradually (see `generation.features` in the config):
 * each kind unlocks at its own height, about one per 100 m, and a gap gets at
 * most `budget` of them, so early on they arrive one at a time. A spiked
 * platform is kept wide, within easy reach, with its spikes on the far end,
 * and a thorn or flamethrower is followed by a clear gap while the climb is
 * still young, so the way up always stays open.
 */
export class LevelGenerator {
  constructor({ random, jumpModel, viewWidth }) {
    this.random = random;
    this.jumpModel = jumpModel;
    this.viewWidth = viewWidth;
    this.count = 0;
    this.last = null;
    this.lastGapHadHazard = false;
  }

  /** Starts a new climb. Returns the floor the player starts on. */
  createStart() {
    this.count = 0;
    this.lastGapHadHazard = false;
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

  /** Builds the next platform above the previous one, with whatever challenges this gap draws. */
  next() {
    const lower = this.last;
    const tuning = this.tuning();
    const features = this.pickFeatures(this.metersAt(lower.homeY), lower);
    const { thickness } = CONFIG.platform;

    const maxRise = this.jumpModel.jumpHeight - RULES.riseMargin;
    let rise = maxRise * this.random.range(tuning.riseMin, tuning.riseMax);
    let width = this.random.range(tuning.widthMin, tuning.widthMax);
    let reachShare = 1;
    if (features.has('spikes')) {
      // Spiked platforms are wide and easy to reach, so a landing has room to stick.
      rise = Math.min(rise, maxRise * tuning.riseMin);
      width = Math.max(width, RULES.spikesMinWidth);
      reachShare = RULES.spikedReach;
    }
    const top = lower.homeY - rise;
    const x = this.pickX(top, width, tuning, reachShare);

    const platform = new Platform({
      x,
      y: top,
      width,
      height: this.random.range(thickness.min, thickness.max),
      index: this.count,
      ...this.pickMotion(features, x, width),
      spikes: features.has('spikes') ? this.pickSpikes(lower, x, width) : null,
    });

    let flamer = features.has('flamer') ? this.pickFlamer(lower, platform) : null;
    // A flamethrower only fits where the way up runs near a wall; otherwise a thorn takes its place.
    const wantsThorn = features.has('thorn') || (features.has('flamer') && !flamer);
    const thorn = wantsThorn ? this.pickThorn(lower.homeY, top) : null;
    if (thorn) flamer = null;

    this.lastGapHadHazard = Boolean(thorn || flamer);
    this.last = platform;
    this.count += 1;
    return { platform, thorn, flamer };
  }

  metersAt(top) {
    return (CONFIG.start.floorTop - top) / CONFIG.score.pixelsPerMeter;
  }

  /**
   * Which challenges this gap gets. Each unlocked kind is tried in a random
   * order with its own (rising) chance, until the height's budget is spent.
   * A platform moves one way at most, and a gap holds one hazard at most.
   */
  pickFeatures(meters, lower) {
    const budget = RULES.budget.filter((step) => meters >= step.from).at(-1).max;
    const hazardAllowed = !isLift(lower) && !(this.lastGapHadHazard && meters < RULES.breatherUntil);
    const chosen = new Set();
    for (const name of this.shuffled(Object.keys(RULES.features))) {
      if (chosen.size >= budget) break;
      const { from, chance } = RULES.features[name];
      if (meters < from) continue;
      if ((name === 'slide' || name === 'lift') && (chosen.has('slide') || chosen.has('lift'))) continue;
      if ((name === 'thorn' || name === 'flamer') && (!hazardAllowed || chosen.has('thorn') || chosen.has('flamer'))) continue;
      const ramp = clamp((meters - from) / RULES.featureRamp, 0, 1);
      if (this.random.chance(lerp(chance.min, chance.max, ramp))) chosen.add(name);
    }
    return chosen;
  }

  shuffled(items) {
    const list = [...items];
    for (let index = list.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this.random.next() * (index + 1));
      [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
  }

  /**
   * Spikes along the far end of the top: the end away from the platform the
   * player jumps from. Arriving players land on the near, safe part, and only
   * an overshoot meets the spikes.
   */
  pickSpikes(lower, x, width) {
    const length = Math.min(width * this.random.range(RULES.spikesShare.min, RULES.spikesShare.max), width - RULES.spikesMinSafe);
    if (length < 18) return null; // too narrow to spike and still land on
    const farIsRight = x + width / 2 >= lower.homeX + lower.width / 2;
    return farIsRight ? { from: width - length, to: width } : { from: 0, to: length };
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
   * How the platform moves, if this gap drew a slide or a lift. A slide is
   * centred on the reachable spot `pickX` chose and trimmed to stay inside the
   * walls; a lift's range is small enough that the next jump still works from
   * any point of it.
   */
  pickMotion(features, x, width) {
    const { min, max } = RULES.movingSpeed;
    const motion = { speed: this.random.range(min, max), phase: this.random.range(0, Math.PI * 2) };
    if (features.has('lift')) {
      return { ...motion, axis: 'y', range: this.random.range(RULES.liftRange.min, RULES.liftRange.max) };
    }
    if (!features.has('slide')) return {};
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
   * spots at least `minShift` away from it. `reachShare` pulls it closer still.
   */
  pickX(top, width, tuning, reachShare = 1) {
    const reach = this.jumpModel.reach(this.last.homeY, top, NO_CEILING) * RULES.reachSafety * tuning.reachMax * reachShare;
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
