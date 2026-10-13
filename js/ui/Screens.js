/**
 * The start, pause and results overlays. Their markup lives in index.html;
 * this class shows one at a time and fills in its `data-field` slots.
 */
export class Screens {
  constructor(root, { onPlay, onResume }) {
    this.screens = new Map();
    for (const element of root.querySelectorAll('[data-screen]')) {
      this.screens.set(element.dataset.screen, element);
    }
    for (const button of root.querySelectorAll('[data-action="play"]')) {
      button.addEventListener('click', onPlay);
    }
    for (const button of root.querySelectorAll('[data-action="resume"]')) {
      button.addEventListener('click', onResume);
    }
  }

  showStart() {
    this.show('start');
  }

  showPause() {
    this.show('pause');
  }

  showGameOver({ isNewBest, ...tally }) {
    this.fill('over', tally);
    this.screens.get('over').querySelector('[data-new-best]').hidden = !isNewBest;
    this.show('over');
  }

  hide() {
    for (const element of this.screens.values()) element.hidden = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  show(name) {
    for (const [key, element] of this.screens) element.hidden = key !== name;
    this.screens.get(name).querySelector('button')?.focus({ preventScroll: true });
  }

  fill(name, values) {
    for (const slot of this.screens.get(name).querySelectorAll('[data-field]')) {
      if (slot.dataset.field in values) slot.textContent = values[slot.dataset.field];
    }
  }
}
