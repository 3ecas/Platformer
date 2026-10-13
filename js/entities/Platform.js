import { CONFIG } from '../config.js';
import { Entity } from './Entity.js';

const SETTINGS = CONFIG.platform;
const COLOR_KEYS = ['platformA', 'platformB', 'platformC', 'platformD'];

const State = Object.freeze({
  IDLE: 'idle',
  SHAKING: 'shaking', // touched: counting down to the drop
  FALLING: 'falling',
});

/**
 * A floating ledge, solid only from above, so the player can jump up through it.
 * Land on it and it shakes for `fallDelay` seconds, then drops away.
 */
export class Platform extends Entity {
  constructor({ x, y, width, height, fallDelay, index = 0, scores = true }) {
    super(x, y, width, height);
    this.fallDelay = fallDelay;
    this.scores = scores; // the starting floor doesn't count
    this.colorKey = COLOR_KEYS[index % COLOR_KEYS.length];
    this.state = State.IDLE;
    this.countdown = 0;
    this.vy = 0;
    this.prevY = y; // position before this step, so riders can move with it
  }

  get touched() {
    return this.state !== State.IDLE;
  }

  /** 0 → 1 across the countdown; drives the warning tint and the shake. */
  get warning() {
    if (this.state === State.IDLE) return 0;
    if (this.state === State.FALLING) return 1;
    return 1 - this.countdown / this.fallDelay;
  }

  /** Starts the countdown. Returns true only the first time. */
  touch() {
    if (this.touched) return false;
    this.state = State.SHAKING;
    this.countdown = this.fallDelay;
    return true;
  }

  update(dt) {
    this.prevY = this.y;
    if (this.state === State.SHAKING) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.state = State.FALLING;
    } else if (this.state === State.FALLING) {
      this.vy = Math.min(this.vy + SETTINGS.gravity * dt, SETTINGS.maxFallSpeed);
      this.y += this.vy * dt;
    }
  }

  render(ctx, theme) {
    const { colors } = theme;
    const { warning, y, width, height } = this;
    const shake = this.state === State.SHAKING ? Math.sin(this.countdown * 90) * SETTINGS.shakeAmplitude * warning : 0;
    const x = this.x + shake;
    const radius = Math.min(height / 2, 9);

    ctx.fillStyle = colors[this.colorKey];
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    if (warning > 0) {
      ctx.globalAlpha = warning * 0.85;
      ctx.fillStyle = colors.warn;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // A soft shadow line along the underside gives the pill a little depth.
    ctx.fillStyle = colors.platformEdge;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + height - 4, width - 6, 4, 2);
    ctx.fill();
  }
}
