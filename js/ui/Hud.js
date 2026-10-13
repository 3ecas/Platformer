const BUMP = [{ transform: 'translateY(-18%) scale(1.2)' }, { transform: 'none' }];
const BUMP_TIMING = { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

/** The height readout along the top of the view. */
export class Hud {
  constructor(root, { height }) {
    this.fields = {
      height: root.querySelector('[data-hud="height"]'),
      best: root.querySelector('[data-hud="best"]'),
    };
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    root.style.setProperty('--hud-height', String(height));
  }

  /** Writes the current numbers, giving a little bump to any that changed. */
  show(score) {
    this.write('height', score.height);
    this.write('best', Math.max(score.best, score.height));
  }

  write(name, value) {
    const field = this.fields[name];
    const text = String(value);
    if (field.textContent === text) return;
    field.textContent = text;
    if (!this.reducedMotion.matches) field.animate(BUMP, BUMP_TIMING);
  }
}
