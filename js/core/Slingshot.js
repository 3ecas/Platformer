/**
 * Mouse and touch launcher: a push, not a pull.
 *
 * Press anywhere on the canvas, drag the way you want to fly, and release:
 * the launch follows the drag, and gets stronger the further you drag (up
 * to `maxPull`). Drags shorter than `minPull` are ignored.
 */
export class Slingshot {
  constructor(canvas, viewport, { maxPull, minPull, maxLaunch }) {
    this.viewport = viewport;
    this.maxPull = maxPull;
    this.minPull = minPull;
    this.power = maxLaunch / maxPull;
    this.enabled = false;
    this.pointerId = null;
    this.start = null;
    this.current = null;
    this.released = null;

    canvas.addEventListener('pointerdown', (event) => this.onDown(event, canvas));
    canvas.addEventListener('pointermove', (event) => this.onMove(event));
    canvas.addEventListener('pointerup', (event) => this.onUp(event));
    canvas.addEventListener('pointercancel', () => this.cancel());
    canvas.addEventListener('contextmenu', (event) => event.preventDefault()); // no long-press menu mid-aim
    window.addEventListener('blur', () => this.cancel());
  }

  /** True while a pull is in progress. */
  get aiming() {
    return this.pointerId !== null;
  }

  /** The launch the current pull would give: { vx, vy, strength (0–1), valid }. */
  get shot() {
    if (!this.aiming) return null;
    const dx = this.current.x - this.start.x;
    const dy = this.current.y - this.start.y;
    const length = Math.hypot(dx, dy);
    const pull = Math.min(length, this.maxPull);
    const scale = length > 0 ? (pull / length) * this.power : 0;
    return { vx: dx * scale, vy: dy * scale, strength: pull / this.maxPull, valid: length >= this.minPull };
  }

  /** The launch from the latest release, if any; each one is handed out once. */
  takeRelease() {
    const shot = this.released;
    this.released = null;
    return shot;
  }

  cancel() {
    this.pointerId = null;
    this.released = null;
  }

  onDown(event, canvas) {
    if (!this.enabled || this.aiming || event.button > 0) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    this.pointerId = event.pointerId;
    this.start = this.viewport.toView(event);
    this.current = this.start;
  }

  onMove(event) {
    if (event.pointerId !== this.pointerId) return;
    this.current = this.viewport.toView(event);
  }

  onUp(event) {
    if (event.pointerId !== this.pointerId) return;
    this.current = this.viewport.toView(event);
    const { shot } = this;
    this.pointerId = null;
    if (this.enabled && shot.valid) this.released = shot;
  }
}
