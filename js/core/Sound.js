const MUTE_KEY = 'pastel-climb.muted';

/**
 * Small synthesised sound effects (Web Audio, no files to load).
 *
 * Browsers only allow audio after the viewer interacts, so the context is
 * created on the first pointer or key press and resumed after that.
 * Muting is remembered between visits when storage is available.
 */
export class Sound {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = readMuted();
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
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume();
    } catch {
      this.context = null; // no audio here; the game plays on silently
    }
  }

  /** Turns all sound on or off. Returns the new muted state. */
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.context.currentTime, 0.02);
    writeMuted(this.muted);
    return this.muted;
  }

  get playing() {
    return !this.muted && this.context?.state === 'running';
  }

  /**
   * A soft, rounded "bloop" for touching down. `impact` (0–1) makes harder
   * landings lower and a little louder; each one is detuned slightly so a run
   * of landings doesn't sound mechanical.
   */
  land(impact) {
    if (!this.playing) return;
    const now = this.context.currentTime;
    const detune = 0.94 + Math.random() * 0.12;
    const pitch = (520 - 220 * impact) * detune;
    const volume = 0.22 + 0.3 * impact;

    // Body: a sine that drops in pitch, like a pad being pressed.
    this.tone({ type: 'sine', from: pitch, to: pitch * 0.55, start: now, length: 0.16, volume });
    // Sparkle: a quiet triangle an octave and a fifth up, gone almost at once.
    this.tone({ type: 'triangle', from: pitch * 3, to: pitch * 2.4, start: now, length: 0.06, volume: volume * 0.18 });
  }

  /** A light, woody tick off a wall; `strength` (0–1) sets its loudness. */
  bounce(strength) {
    if (!this.playing) return;
    const now = this.context.currentTime;
    const pitch = 880 * (0.95 + Math.random() * 0.1);
    const volume = 0.08 + 0.2 * strength;
    this.tone({ type: 'triangle', from: pitch, to: pitch * 0.7, start: now, length: 0.07, volume });
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

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false; // storage is blocked: start with sound on
  }
}

function writeMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Not remembering the choice is fine; it still applies for this visit.
  }
}
