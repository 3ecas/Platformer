/** One square fleck of dust or sparkle. `colorKey` names a theme colour. */
export class Particle {
  constructor({ x, y, vx, vy, size, life, colorKey, gravity = 0, drag = 0 }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.life = life;
    this.colorKey = colorKey;
    this.gravity = gravity;
    this.drag = drag;
    this.age = 0;
  }

  get alive() {
    return this.age < this.life;
  }

  update(dt) {
    this.age += dt;
    const damping = Math.exp(-this.drag * dt);
    this.vx *= damping;
    this.vy = this.vy * damping + this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx, theme) {
    const remaining = 1 - this.age / this.life;
    const size = this.size * (0.4 + 0.6 * remaining);
    ctx.globalAlpha = remaining;
    ctx.fillStyle = theme.colors[this.colorKey];
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
  }
}
