/**
 * Drives the game with requestAnimationFrame.
 *
 * Each frame's elapsed time is split into equal sub-steps no longer than
 * `maxStep`, so the physics behaves the same at 60 Hz, 120 Hz or 144 Hz.
 */
export class GameLoop {
  constructor({ update, render, maxStep, maxFrame }) {
    this.update = update;
    this.render = render;
    this.maxStep = maxStep;
    this.maxFrame = maxFrame;
    this.lastTime = null;
    this.frameId = null;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.frameId !== null) return;
    this.lastTime = null;
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  tick(now) {
    const elapsed = this.lastTime === null ? 0 : (now - this.lastTime) / 1000;
    this.lastTime = now;

    const frame = Math.min(elapsed, this.maxFrame);
    const steps = Math.max(1, Math.ceil(frame / this.maxStep));
    const dt = frame / steps;
    for (let step = 0; step < steps; step += 1) this.update(dt);

    this.render();
    this.frameId = requestAnimationFrame(this.tick);
  }
}
