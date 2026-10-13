import { Entity } from './Entity.js';

const COLOR_KEYS = ['platformA', 'platformB', 'platformC', 'platformD'];

/**
 * A fixed floating ledge, solid only from above, so the player can jump up
 * through it. It stays put; once it slips off the bottom of the view it's gone.
 */
export class Platform extends Entity {
  constructor({ x, y, width, height, index = 0, scores = true }) {
    super(x, y, width, height);
    this.scores = scores; // the starting floor doesn't count
    this.colorKey = COLOR_KEYS[index % COLOR_KEYS.length];
    this.touched = false;
  }

  /** Marks the platform as landed on. Returns true only the first time. */
  touch() {
    if (this.touched) return false;
    this.touched = true;
    return true;
  }

  render(ctx, theme) {
    const { colors } = theme;
    const { x, y, width, height } = this;

    ctx.fillStyle = colors[this.colorKey];
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, Math.min(height / 2, 9));
    ctx.fill();

    // A soft shadow line along the underside gives the pill a little depth.
    ctx.fillStyle = colors.platformEdge;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + height - 4, width - 6, 4, 2);
    ctx.fill();
  }
}
