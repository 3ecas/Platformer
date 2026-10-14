import { clamp } from '../utils/math.js';

/**
 * Owns the canvas. Keeps it sharp on high-DPI screens and fits the virtual
 * view into whatever space the page gives it. The view is always `width`
 * world pixels wide; its height follows the screen's shape between
 * `minHeight` and `maxHeight`, so a phone held upright is filled top to
 * bottom instead of showing a short column with empty bands.
 */
export class Viewport {
  constructor(canvas, { width, minHeight, maxHeight }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
    this.height = minHeight;
    this.pixelScale = 1; // device pixels per world pixel
    this.offsetX = 0; // device pixels between the canvas edge and the view
    this.offsetY = 0;

    const resize = () => this.resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    window.visualViewport?.addEventListener('resize', resize); // mobile browser bars sliding in and out
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    this.resize();
  }

  resize() {
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    // Phones are high-DPI already; past 2× the extra pixels cost speed without looking sharper.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasWidth = Math.round(cssWidth * dpr);
    const canvasHeight = Math.round(cssHeight * dpr);
    if (this.canvas.width !== canvasWidth) this.canvas.width = canvasWidth;
    if (this.canvas.height !== canvasHeight) this.canvas.height = canvasHeight;

    this.height = clamp(this.width * (cssHeight / cssWidth), this.minHeight, this.maxHeight);
    const cssScale = Math.min(cssWidth / this.width, cssHeight / this.height);
    this.pixelScale = cssScale * dpr;
    this.offsetX = (this.canvas.width - this.width * this.pixelScale) / 2;
    this.offsetY = (this.canvas.height - this.height * this.pixelScale) / 2;

    this.shareLayout(cssScale, dpr);
  }

  /** Converts a pointer event's position to view coordinates (world pixels from the view's top-left). */
  toView(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: ((event.clientX - rect.left) * scaleX - this.offsetX) / this.pixelScale,
      y: ((event.clientY - rect.top) * scaleY - this.offsetY) / this.pixelScale,
    };
  }

  /** Publishes the view rectangle as CSS variables, so HTML overlays can line up with the canvas. */
  shareLayout(cssScale, dpr) {
    const { style } = this.canvas.parentElement;
    style.setProperty('--view-left', `${this.offsetX / dpr}px`);
    style.setProperty('--view-top', `${this.offsetY / dpr}px`);
    style.setProperty('--view-width', `${this.width * cssScale}px`);
    style.setProperty('--view-scale', String(cssScale));
  }

  /** Clears the frame and switches the context to world-pixel units, clipped to the view. */
  begin(backdrop) {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, this.offsetX, this.offsetY);
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();
  }

  end() {
    this.ctx.restore();
  }
}
