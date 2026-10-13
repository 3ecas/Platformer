import { Entity } from './Entity.js';

const COLOR_KEYS = ['platformA', 'platformB', 'platformC', 'platformD'];

/**
 * A floating ledge, solid only from above, so the player can jump up through it.
 * Most stay put; a moving one (`range` > 0) swings side to side around `centerX`
 * on a sine wave, so where it will be at any moment can be worked out exactly.
 * Once a platform slips off the bottom of the view it's gone.
 */
export class Platform extends Entity {
  constructor({ x, y, width, height, index = 0, scores = true, range = 0, speed = 0, phase = 0 }) {
    super(x, y, width, height);
    this.scores = scores; // the starting floor doesn't count
    this.colorKey = COLOR_KEYS[index % COLOR_KEYS.length];
    this.touched = false;
    this.homeX = x;
    this.range = range;
    this.speed = speed;
    this.clock = phase;
    this.x = this.leftAfter(0);
    this.prevX = this.x; // position before this step, so riders can move with it
  }

  get moving() {
    return this.range > 0;
  }

  /** Left edge `seconds` from now. */
  leftAfter(seconds) {
    if (!this.moving) return this.homeX;
    return this.homeX + Math.sin((this.clock + seconds) * this.speed) * this.range;
  }

  /** Marks the platform as landed on. Returns true only the first time. */
  touch() {
    if (this.touched) return false;
    this.touched = true;
    return true;
  }

  update(dt) {
    this.prevX = this.x;
    if (!this.moving) return;
    this.clock += dt;
    this.x = this.leftAfter(0);
  }

  render(ctx, theme) {
    const { colors } = theme;
    const { x, y, width, height } = this;

    // A moving platform's track: a faint dotted rail across its whole swing.
    if (this.moving) {
      const railY = y + height / 2;
      ctx.strokeStyle = colors.marker;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.setLineDash([2, 8]);
      ctx.beginPath();
      ctx.moveTo(this.homeX - this.range, railY);
      ctx.lineTo(this.homeX + this.range + width, railY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }

    ctx.fillStyle = colors[this.colorKey];
    ctx.fillRect(x, y, width, height);

    // A soft shadow band along the underside gives the slab a little depth.
    ctx.fillStyle = colors.platformEdge;
    ctx.fillRect(x, y + height - 4, width, 4);
  }
}
