import { clamp } from '../utils/math.js';

/**
 * Owns the canvas. Keeps it sharp on high-DPI screens and fits the virtual
 * view (a fixed height, and a width that follows the window within limits)
 * into whatever space the page gives it.
 */
export class Viewport {
  constructor(canvas, { height, minWidth, maxWidth }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.height = height;
    this.minWidth = minWidth;
    this.maxWidth = maxWidth;
    this.width = minWidth;
    this.pixelScale = 1; // device pixels per world pixel
    this.offsetX = 0; // device pixels between the canvas edge and the view
    this.offsetY = 0;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);

    this.width = clamp(this.height * (cssWidth / cssHeight), this.minWidth, this.maxWidth);
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
