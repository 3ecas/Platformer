import { damp } from '../utils/math.js';

/**
 * Vertical climbing camera.
 *
 * The horizontal view is fixed: the column is exactly as wide as the screen.
 * When the player climbs above `followLine` the camera is dragged up with
 * them, and it can also creep upwards on its own. It never moves back down,
 * so dropping out of the bottom of the view ends the run.
 */
export class Camera {
  constructor(viewport, { followLine, smoothing, maxShake, shakeDecay }) {
    this.viewport = viewport;
    this.followLine = followLine;
    this.smoothing = smoothing;
    this.maxShake = maxShake;
    this.shakeDecay = shakeDecay;
    this.x = 0;
    this.y = 0;
    this.targetY = 0;
    this.trauma = 0;
  }

  get width() {
    return this.viewport.width;
  }

  get height() {
    return this.viewport.height;
  }

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  /** Jumps straight to a view whose bottom edge sits at `bottomY`. */
  snapTo(bottomY) {
    this.targetY = bottomY - this.height;
    this.y = this.targetY;
    this.trauma = 0;
  }

  /** `creep` is how fast (world px/s) the view rises on its own. */
  follow(target, dt, creep = 0) {
    const line = this.targetY + this.height * this.followLine;
    if (target.top < line) this.targetY -= line - target.top;
    this.targetY -= creep * dt;

    this.y = damp(this.y, this.targetY, this.smoothing, dt);
    this.trauma = Math.max(0, this.trauma - this.shakeDecay * dt);
  }

  /** Adds screen shake. `amount` is 0–1 and stacks up to 1. */
  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Moves the canvas origin so world coordinates can be drawn directly. */
  applyTransform(ctx) {
    const offset = this.trauma ** 2 * this.maxShake;
    const shakeX = (Math.random() * 2 - 1) * offset;
    const shakeY = (Math.random() * 2 - 1) * offset;
    ctx.translate(-this.x + shakeX, -this.y + shakeY);
  }
}
