const NOZZLE = { width: 10, height: 18 };
const JET_HALF_HEIGHT = 9; // the flame's danger zone reaches this far above and below its line
const PARTICLES_PER_PIXEL = 0.7; // puffs per second for each pixel of jet, so long jets stay as dense as short ones
const PARTICLE_LIFE = 0.42;

const Phase = Object.freeze({ OFF: 'off', WARN: 'warn', ON: 'on' });

/**
 * A flamethrower bolted to one of the side walls. It cycles: off, a short
 * sputtering warning, then a jet of flame across part of the column. The
 * jet only hurts while it is fully on. The cycle runs on a fixed clock, so
 * its timing can be learned and waited out.
 */
export class Flamer {
  constructor({ side, y, length, viewWidth, offTime, warnTime, onTime, phase }) {
    this.side = side; // 'left' or 'right'
    this.y = y;
    this.length = length;
    this.wallX = side === 'left' ? 0 : viewWidth;
    this.direction = side === 'left' ? 1 : -1;
    this.offTime = offTime;
    this.warnTime = warnTime;
    this.onTime = onTime;
    this.clock = phase;
    this.particles = [];
    this.emitDebt = 0;
    this.lastPhase = this.phase;
    // Set for a single step when the phase changes, so the world can play a sound.
    this.startedWarning = false;
    this.ignited = false;
  }

  get cycle() {
    return this.offTime + this.warnTime + this.onTime;
  }

  get phase() {
    const t = this.clock % this.cycle;
    if (t < this.offTime) return Phase.OFF;
    if (t < this.offTime + this.warnTime) return Phase.WARN;
    return Phase.ON;
  }

  get bottom() {
    return this.y + JET_HALF_HEIGHT;
  }

  update(dt) {
    this.clock += dt;
    const { phase } = this;
    this.startedWarning = phase === Phase.WARN && this.lastPhase !== Phase.WARN;
    this.ignited = phase === Phase.ON && this.lastPhase !== Phase.ON;
    this.lastPhase = phase;

    // Full jet when on; a weak sputter at the nozzle while warning.
    const full = PARTICLES_PER_PIXEL * this.length;
    const rate = phase === Phase.ON ? full : phase === Phase.WARN ? Math.min(full * 0.25, 45) : 0;
    this.emitDebt += rate * dt;
    while (this.emitDebt >= 1) {
      this.emitDebt -= 1;
      this.emit(phase === Phase.ON ? 1 : 0.18);
    }

    for (const particle of this.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);
  }

  /** One puff of flame; `reach` (0–1) scales how far it travels. */
  emit(reach) {
    const life = PARTICLE_LIFE * (0.75 + Math.random() * 0.5);
    // Each puff dies within the jet's length, so what you see is what burns.
    const speed = (this.length * reach * (0.8 + Math.random() * 0.2)) / life;
    this.particles.push({
      x: this.wallX + this.direction * NOZZLE.width,
      y: this.y + (Math.random() * 2 - 1) * 3,
      vx: this.direction * speed,
      vy: (Math.random() * 2 - 1) * 22,
      size: 8 + Math.random() * 5,
      life,
      age: 0,
    });
  }

  /** True while the jet is fully on and the box overlaps it. */
  isBurning(box) {
    if (this.phase !== Phase.ON) return false;
    const near = this.wallX;
    const far = this.wallX + this.direction * this.length;
    const left = Math.min(near, far);
    const right = Math.max(near, far);
    return box.right > left && box.left < right && box.bottom > this.y - JET_HALF_HEIGHT && box.top < this.y + JET_HALF_HEIGHT;
  }

  render(ctx, theme) {
    const { colors } = theme;

    // Flame: puffs swell and cool from butter yellow through peach to rose as they travel.
    for (const particle of this.particles) {
      const progress = particle.age / particle.life;
      ctx.globalAlpha = 0.9 - progress * 0.75;
      ctx.fillStyle = progress < 0.35 ? colors.flameHot : progress < 0.7 ? colors.flame : colors.flameTip;
      const size = particle.size * (1 + progress * 1.1);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Nozzle: a small block on the wall, glowing while it warms up or fires.
    const x = this.side === 'left' ? this.wallX : this.wallX - NOZZLE.width;
    ctx.fillStyle = colors.hazard;
    ctx.fillRect(x, this.y - NOZZLE.height / 2, NOZZLE.width, NOZZLE.height);
    if (this.phase !== Phase.OFF) {
      ctx.fillStyle = colors.flameHot;
      const mouthX = this.side === 'left' ? x + NOZZLE.width - 3 : x;
      ctx.fillRect(mouthX, this.y - 4, 3, 8);
    }
  }
}
