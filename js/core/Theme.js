// Canvas colour names → CSS custom properties defined in css/theme.css.
const COLOR_TOKENS = {
  backdrop: '--page-bg',
  column: '--column',
  wall: '--wall',
  marker: '--marker',
  bestLine: '--best-line',
  platformA: '--platform-a',
  platformB: '--platform-b',
  platformC: '--platform-c',
  platformD: '--platform-d',
  platformEdge: '--platform-edge',
  warn: '--warn',
  void: '--void',
  voidClear: '--void-clear',
  dust: '--dust',
  player: '--player',
  playerEye: '--player-eye',
  pickupText: '--pickup-text',
};

/**
 * Reads the palette and fonts from CSS custom properties, so the canvas and
 * the HTML share one source of truth.
 */
export class Theme {
  constructor(root = document.documentElement) {
    this.root = root;
    this.colors = {};
    this.fontFamily = 'sans-serif';
    this.refresh();
    // Web fonts may arrive after the first read.
    document.fonts?.ready.then(() => this.refresh());
  }

  refresh() {
    const styles = getComputedStyle(this.root);
    for (const [name, property] of Object.entries(COLOR_TOKENS)) {
      this.colors[name] = styles.getPropertyValue(property).trim();
    }
    this.fontFamily = styles.getPropertyValue('--font-data').trim();
  }

  /** A canvas font string in the game's numeric face. */
  font(size, weight = 600) {
    return `${weight} ${size}px ${this.fontFamily}`;
  }
}
