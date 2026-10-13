import { FloatingText } from './FloatingText.js';
import { Particle } from './Particle.js';

// Cosmetic randomness uses Math.random, so effects never disturb the seeded level.
const between = (min, max) => min + Math.random() * (max - min);

/** Purely cosmetic feedback (dust, pop-ups), spawned by name. */
export class Effects {
  constructor() {
    this.particles = [];
    this.texts = [];
  }

  clear() {
    this.particles = [];
    this.texts = [];
  }

  jumpDust(x, y) {
    this.sidePuffs(x, y, 3, 90);
  }

  /** `impact` is 0–1: harder landings kick up more dust. */
  landingDust(x, y, impact) {
    this.sidePuffs(x, y, 3 + Math.round(impact * 6), 80 + 170 * impact);
  }

  /** A little "+25 m" pop-up each time the climb passes a height marker. */
  milestone(x, y, meters) {
    this.burst({ x, y, count: 10, colorKey: 'dust', speedMin: 60, speedMax: 180, life: 0.5, drag: 4 });
    this.texts.push(new FloatingText({ x, y: y - 20, text: `${meters} m`, colorKey: 'pickupText' }));
  }

  /** The player vanishing through the bottom of the screen. */
  splash(x, y) {
    this.burst({
      x,
      y,
      count: 26,
      colorKey: 'player',
      angleMin: -Math.PI * 0.85,
      angleMax: -Math.PI * 0.15,
      speedMin: 260,
      speedMax: 620,
      sizeMin: 4,
      sizeMax: 9,
      life: 0.85,
      gravity: 1500,
      drag: 0.6,
    });
  }

  update(dt) {
    for (const particle of this.particles) particle.update(dt);
    for (const text of this.texts) text.update(dt);
    this.particles = this.particles.filter((particle) => particle.alive);
    this.texts = this.texts.filter((text) => text.alive);
  }

  render(ctx, theme) {
    ctx.save();
    for (const particle of this.particles) particle.render(ctx, theme);
    for (const text of this.texts) text.render(ctx, theme);
    ctx.restore();
  }

  /** Two low fans of dust, one to each side of the feet. */
  sidePuffs(x, y, perSide, speed) {
    const fan = { x, y, count: perSide, colorKey: 'dust', speedMin: speed * 0.4, speedMax: speed };
    const settle = { sizeMin: 2, sizeMax: 4, life: 0.35, gravity: 120, drag: 5 };
    this.burst({ ...fan, ...settle, angleMin: Math.PI + 0.05, angleMax: Math.PI + 0.5 });
    this.burst({ ...fan, ...settle, angleMin: -0.5, angleMax: -0.05 });
  }

  /** Sprays particles between two angles (radians: 0 is right, −π/2 is up). */
  burst({
    x,
    y,
    count,
    colorKey,
    angleMin = 0,
    angleMax = Math.PI * 2,
    speedMin,
    speedMax,
    sizeMin = 3,
    sizeMax = 6,
    life = 0.5,
    gravity = 0,
    drag = 3,
  }) {
    for (let index = 0; index < count; index += 1) {
      const angle = between(angleMin, angleMax);
      const speed = between(speedMin, speedMax);
      this.particles.push(
        new Particle({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: between(sizeMin, sizeMax),
          life: life * between(0.7, 1.3),
          colorKey,
          gravity,
          drag,
        }),
      );
    }
  }
}
