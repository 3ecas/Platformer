const FADE_HEIGHT = 110;
const OVERDRAW = 40; // drawn past the view edges so screen shake never reveals a gap

/** The drop beneath the view. It follows the camera; fall into it and the run is over. */
export class Abyss {
  constructor(camera) {
    this.camera = camera;
  }

  /** World y of the bottom edge of the view. */
  get top() {
    return this.camera.bottom;
  }

  /** True once a box has dropped entirely out of view. */
  hasSwallowed(box) {
    return box.top > this.top;
  }

  /** A soft lilac haze along the bottom of the screen. */
  render(ctx, theme) {
    const { colors } = theme;
    const { camera } = this;
    const fadeTop = this.top - FADE_HEIGHT;
    const gradient = ctx.createLinearGradient(0, fadeTop, 0, this.top);
    gradient.addColorStop(0, colors.voidClear);
    gradient.addColorStop(1, colors.void);

    ctx.fillStyle = gradient;
    ctx.fillRect(camera.left - OVERDRAW, fadeTop, camera.width + OVERDRAW * 2, FADE_HEIGHT + OVERDRAW);
  }
}
