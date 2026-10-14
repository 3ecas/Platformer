import { clamp } from '../utils/math.js';

const POINTS = 8;
const SPIN_SPEED = 1.6; // radians per second, purely for looks

/**
 * A floating thorn ball that drifts side to side in the gap between two
 * platforms. Flying into it ends the run. It moves on a sine wave, like a
 * moving platform, so the player can time a launch past it.
 */
export class Thorn {
  constructor({ x, y, radius, range, speed, phase }) {
    this.homeX = x; // centre of the swing
    this.y = y;
    this.radius = radius;
    this.range = range;
    this.speed = speed;
    this.clock = phase;
    this.spin = phase;
    this.x = this.centerAfter(0);
  }

  centerAfter(seconds) {
    return this.homeX + Math.sin((this.clock + seconds) * this.speed) * this.range;
  }

  get bottom() {
    return this.y + this.radius;
  }

  update(dt) {
    this.clock += dt;
    this.spin += SPIN_SPEED * dt;
    this.x = this.centerAfter(0);
  }

  /** Circle-versus-box test, a little forgiving so grazes don't count. */
  isTouching(box) {
    const nearestX = clamp(this.x, box.left, box.right);
    const nearestY = clamp(this.y, box.top, box.bottom);
    const reach = this.radius * 0.8;
    return (this.x - nearestX) ** 2 + (this.y - nearestY) ** 2 <= reach ** 2;
  }

  render(ctx, theme) {
    const { colors } = theme;

    // Its track: the same faint dotted rail the moving platforms use.
    ctx.strokeStyle = colors.marker;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(this.homeX - this.range, this.y);
    ctx.lineTo(this.homeX + this.range, this.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';

    // A star of soft points around a round core.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.fillStyle = colors.hazard;
    ctx.beginPath();
    for (let index = 0; index < POINTS * 2; index += 1) {
      const angle = (index / (POINTS * 2)) * Math.PI * 2;
      const distance = index % 2 === 0 ? this.radius * 1.35 : this.radius * 0.8;
      ctx.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.hazardCore;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
