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
    this.noise = null; // one second of white noise, shared by every whoosh, roar and crackle
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('touchend', unlock, { capture: true }); // iOS only allows audio to start on a touch's end
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

  /**
   * The "fshiuuu" of a launch: a burst of noise through a band-pass filter
   * that sweeps from hiss down to a softer rush. `strength` (0–1) makes it
   * louder and a little longer.
   */
  whoosh(strength) {
    if (!this.playing) return;
    const { context } = this;
    const now = context.currentTime;
    const length = 0.28 + 0.22 * strength;

    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer();
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + length);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 + 0.4 * strength, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + length + 0.02);
  }

  /**
   * A flamethrower firing for `duration` seconds: a soft low "whump", then a
   * rushing roar of low-passed noise with a gentle flutter, fading at the end.
   */
  flame(duration) {
    if (!this.playing) return;
    const { context } = this;
    const now = context.currentTime;
    const end = now + duration;

    this.tone({ type: 'sine', from: 150, to: 55, start: now, length: 0.18, volume: 0.22 });

    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer();
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.linearRampToValueAtTime(1300, now + 0.15);
    filter.Q.value = 0.8;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
    gain.gain.setValueAtTime(0.2, Math.max(now + 0.08, end - 0.18));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    // Flutter: a slow wobble on the roar's loudness, like a real flame.
    const flutter = context.createOscillator();
    const depth = context.createGain();
    flutter.frequency.value = 9;
    depth.gain.value = 0.05;
    flutter.connect(depth).connect(gain.gain);

    source.connect(filter).connect(gain).connect(this.master);
    source.start(now, Math.random()); // start somewhere new in the noise each time
    source.stop(end + 0.05);
    flutter.start(now);
    flutter.stop(end + 0.05);
  }

  /** The warning before a flamethrower fires: a few dry crackles across `duration` seconds. */
  sputter(duration) {
    if (!this.playing) return;
    const { context } = this;
    const now = context.currentTime;
    const count = 5;
    for (let index = 0; index < count; index += 1) {
      const start = now + (index / count) * duration + Math.random() * 0.05;
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer();
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800 + Math.random() * 1400;
      filter.Q.value = 2;
      const gain = context.createGain();
      const volume = 0.08 + 0.1 * (index / count); // building up to the burst
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
      source.connect(filter).connect(gain).connect(this.master);
      source.start(start, Math.random() * 0.9);
      source.stop(start + 0.05);
    }
  }

  /** A gentle "wah-wah-waaah": three falling notes, the last one sagging. */
  lose() {
    if (!this.playing) return;
    const now = this.context.currentTime;
    const notes = [
      { from: 523, to: 515, at: 0, length: 0.2 },
      { from: 440, to: 432, at: 0.2, length: 0.2 },
      { from: 370, to: 262, at: 0.4, length: 0.6 },
    ];
    for (const note of notes) {
      const start = now + note.at;
      this.tone({ type: 'triangle', from: note.from, to: note.to, start, length: note.length, volume: 0.25 });
      this.tone({ type: 'sine', from: note.from / 2, to: note.to / 2, start, length: note.length, volume: 0.12 });
    }
  }

  noiseBuffer() {
    if (!this.noise) {
      const { sampleRate } = this.context;
      this.noise = this.context.createBuffer(1, sampleRate, sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
    }
    return this.noise;
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
