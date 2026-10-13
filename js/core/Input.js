/**
 * Keyboard input, mapped to named actions (see CONFIG.controls).
 *
 * `isDown` is true while any key bound to the action is held.
 * `wasPressed` is true during the first update step after a key goes down;
 * call `endStep()` once each step has had its chance to read it.
 */
export class Input {
  constructor(bindings) {
    this.bindings = bindings;
    this.boundCodes = new Set(Object.values(bindings).flat());
    this.held = new Set();
    this.pressed = new Set();

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('blur', () => this.releaseAll());
  }

  isDown(action) {
    return this.bindings[action].some((code) => this.held.has(code));
  }

  wasPressed(action) {
    return this.bindings[action].some((code) => this.pressed.has(code));
  }

  endStep() {
    this.pressed.clear();
  }

  releaseAll() {
    this.held.clear();
    this.pressed.clear();
  }

  onKeyDown(event) {
    if (!this.isGameKey(event)) return;
    event.preventDefault(); // keep Space and the arrows from scrolling the page
    if (event.repeat) return;
    this.held.add(event.code);
    this.pressed.add(event.code);
  }

  onKeyUp(event) {
    if (!this.boundCodes.has(event.code)) return;
    event.preventDefault();
    this.held.delete(event.code);
  }

  /** Bound keys only, and never browser shortcuts such as Cmd+D. */
  isGameKey(event) {
    return this.boundCodes.has(event.code) && !event.metaKey && !event.ctrlKey && !event.altKey;
  }
}
