import { easeOutCubic } from '../utils/math.js';

/** A short label, such as "+5", that drifts up and fades out. */
export class FloatingText {
  constructor({ x, y, text, colorKey, life = 0.9, rise = 56, size = 24 }) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.colorKey = colorKey;
    this.life = life;
    this.rise = rise;
    this.size = size;
    this.age = 0;
  }

  get alive() {
    return this.age < this.life;
  }

  update(dt) {
    this.age += dt;
  }

  render(ctx, theme) {
    const progress = this.age / this.life;
    ctx.globalAlpha = 1 - progress ** 3;
    ctx.fillStyle = theme.colors[this.colorKey];
    ctx.font = theme.font(this.size, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y - this.rise * easeOutCubic(progress));
  }
}
