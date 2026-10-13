/**
 * Small synthesised sound effects (Web Audio, no files to load).
 *
 * Browsers only allow audio after the viewer interacts, so the context is
 * created on the first pointer or key press and resumed after that.
 */
export class Sound {
  constructor() {
    this.context = null;
    this.master = null;
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  unlock() {
    try {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume();
    } catch {
      this.context = null; // no audio here; the game plays on silently
    }
  }

  /**
   * A soft, rounded "bloop" for touching down. `impact` (0–1) makes harder
   * landings lower and a little louder; each one is detuned slightly so a run
   * of landings doesn't sound mechanical.
   */
  land(impact) {
    const { context } = this;
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    const detune = 0.94 + Math.random() * 0.12;
    const pitch = (520 - 220 * impact) * detune;
    const volume = 0.22 + 0.3 * impact;

    // Body: a sine that drops in pitch, like a pad being pressed.
    this.tone({ type: 'sine', from: pitch, to: pitch * 0.55, start: now, length: 0.16, volume });
    // Sparkle: a quiet triangle an octave and a fifth up, gone almost at once.
    this.tone({ type: 'triangle', from: pitch * 3, to: pitch * 2.4, start: now, length: 0.06, volume: volume * 0.18 });
  }

  tone({ type, from, to, start, length, volume }) {
    const { context } = this;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + length);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  }
}
