import { Entity } from './Entity.js';

const COLOR_KEYS = ['platformA', 'platformB', 'platformC', 'platformD'];
const SPIKE_WIDTH = 9;
const SPIKE_HEIGHT = 9;

/**
 * A floating ledge, solid only from above, so the player can jump up through it.
 * Higher up, part of its top may carry spikes: landing there ends the run.
 * Most stay put; a moving one (`range` > 0) swings side to side (`axis` 'x') or
 * up and down ('y') around its home spot on a sine wave, so where it will be
 * at any moment can be worked out exactly.
 * Once a platform slips off the bottom of the view it's gone.
 */
export class Platform extends Entity {
  constructor({ x, y, width, height, index = 0, scores = true, axis = 'x', range = 0, speed = 0, phase = 0, spikes = null }) {
    super(x, y, width, height);
    this.scores = scores; // the starting floor doesn't count
    this.colorKey = COLOR_KEYS[index % COLOR_KEYS.length];
    this.touched = false;
    this.homeX = x;
    this.homeY = y; // a moving platform swings around this spot
    this.axis = axis; // 'x' slides side to side, 'y' rises and sinks
    this.range = range;
    this.speed = speed;
    this.clock = phase;
    this.x = this.leftAfter(0);
    this.y = this.topAfter(0);
    this.prevX = this.x; // position before this step, so riders can move with it
    this.prevY = this.y;
    this.spikes = spikes; // { from, to }: a stretch of the top, measured from the left edge
  }

  /** True if a point at world x sits over this platform's spikes. */
  isSpikedAt(x) {
    if (!this.spikes) return false;
    const offset = x - this.x;
    return offset >= this.spikes.from && offset <= this.spikes.to;
  }

  get moving() {
    return this.range > 0;
  }

  /** Left edge `seconds` from now. */
  leftAfter(seconds) {
    if (!this.moving || this.axis !== 'x') return this.homeX;
    return this.homeX + this.swingAfter(seconds);
  }

  /** Top edge `seconds` from now. */
  topAfter(seconds) {
    if (!this.moving || this.axis !== 'y') return this.homeY;
    return this.homeY + this.swingAfter(seconds);
  }

  swingAfter(seconds) {
    return Math.sin((this.clock + seconds) * this.speed) * this.range;
  }

  /** Marks the platform as landed on. Returns true only the first time. */
  touch() {
    if (this.touched) return false;
    this.touched = true;
    return true;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    if (!this.moving) return;
    this.clock += dt;
    this.x = this.leftAfter(0);
    this.y = this.topAfter(0);
  }

  render(ctx, theme) {
    const { colors } = theme;
    const { x, y, width, height } = this;

    if (this.moving) this.renderRail(ctx, colors);

    ctx.fillStyle = colors[this.colorKey];
    ctx.fillRect(x, y, width, height);

    // A soft shadow band along the underside gives the slab a little depth.
    ctx.fillStyle = colors.platformEdge;
    ctx.fillRect(x, y + height - 4, width, 4);

    if (this.spikes) this.renderSpikes(ctx, colors);
  }

  /** A moving platform's track: a faint dotted rail across its whole swing. */
  renderRail(ctx, colors) {
    const { width, height, homeX, homeY, range } = this;
    ctx.strokeStyle = colors.marker;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    if (this.axis === 'x') {
      const railY = this.y + height / 2;
      ctx.moveTo(homeX - range, railY);
      ctx.lineTo(homeX + range + width, railY);
    } else {
      const railX = homeX + width / 2;
      ctx.moveTo(railX, homeY - range);
      ctx.lineTo(railX, homeY + range + height);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  }

  /** A row of small triangles standing on the top edge. */
  renderSpikes(ctx, colors) {
    const { from, to } = this.spikes;
    const count = Math.max(1, Math.round((to - from) / SPIKE_WIDTH));
    const width = (to - from) / count;
    ctx.fillStyle = colors.hazard;
    ctx.beginPath();
    for (let index = 0; index < count; index += 1) {
      const left = this.x + from + index * width;
      ctx.moveTo(left, this.y);
      ctx.lineTo(left + width / 2, this.y - SPIKE_HEIGHT);
      ctx.lineTo(left + width, this.y);
    }
    ctx.fill();
  }
}
