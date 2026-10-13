import { CONFIG } from '../config.js';
import { EVENTS } from '../events.js';
import { Camera } from '../core/Camera.js';
import { EventBus } from '../core/EventBus.js';
import { GameLoop } from '../core/GameLoop.js';
import { Input } from '../core/Input.js';
import { Slingshot } from '../core/Slingshot.js';
import { Theme } from '../core/Theme.js';
import { Viewport } from '../core/Viewport.js';
import { Hud } from '../ui/Hud.js';
import { Screens } from '../ui/Screens.js';
import { Random } from '../utils/Random.js';
import { World } from '../world/World.js';
import { Score } from './Score.js';

const State = Object.freeze({
  READY: 'ready', // title screen, with the climb waiting behind it
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over', // the player fell; results appear after a beat
});

// Stands in for the keyboard whenever the player shouldn't move.
const NO_INPUT = Object.freeze({ isDown: () => false, wasPressed: () => false });

/** Wires every system together and runs the flow: ready → playing ⇄ paused → over → playing. */
export class Game {
  constructor({ canvas, ui }) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.theme = new Theme();
    this.viewport = new Viewport(canvas, CONFIG.view);
    this.camera = new Camera(this.viewport, {
      ...CONFIG.camera,
      maxShake: reducedMotion ? 0 : CONFIG.camera.maxShake,
    });
    this.input = new Input(CONFIG.controls);
    this.slingshot = new Slingshot(canvas, this.viewport, CONFIG.slingshot);
    this.events = new EventBus();
    this.random = new Random();
    this.world = new World({ camera: this.camera, events: this.events, random: this.random });
    this.score = new Score();
    this.hud = new Hud(ui.querySelector('[data-hud]'), CONFIG.hud);
    this.screens = new Screens(ui, { onPlay: () => this.play(), onResume: () => this.resume() });
    this.loop = new GameLoop({
      ...CONFIG.loop,
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });

    this.state = State.READY;
    this.timeSinceFall = 0;
    this.resultsShown = false;
    this.newBest = false;

    this.listen();
    this.newRun();
    this.screens.showStart();
  }

  start() {
    this.loop.start();
  }

  listen() {
    this.events.on(EVENTS.PLATFORM_LANDED, () => this.score.addPlatform());
    this.events.on(EVENTS.PLAYER_FELL, () => this.endRun());

    // Stop the clock whenever the player looks away.
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
  }

  /** A fresh climb and a fresh score. */
  newRun() {
    this.random.seed(Date.now());
    this.score.reset();
    this.world.reset(this.score.best);
    this.hud.show(this.score);
  }

  play() {
    if (this.state === State.PLAYING || this.state === State.PAUSED) return;
    if (this.state === State.OVER) {
      if (!this.resultsShown) return;
      this.newRun();
    }
    this.state = State.PLAYING;
    this.screens.hide();
    this.setSlingshot(true);
    this.input.endStep(); // the key that started the run shouldn't also jump
  }

  pause() {
    if (this.state !== State.PLAYING) return;
    this.state = State.PAUSED;
    this.setSlingshot(false);
    this.screens.showPause();
  }

  resume() {
    if (this.state !== State.PAUSED) return;
    this.state = State.PLAYING;
    this.screens.hide();
    this.setSlingshot(true);
    this.input.endStep();
  }

  setSlingshot(enabled) {
    this.slingshot.enabled = enabled;
    this.slingshot.cancel();
  }

  endRun() {
    this.state = State.OVER;
    this.setSlingshot(false);
    this.timeSinceFall = 0;
    this.resultsShown = false;
    this.newBest = this.score.commit();
    this.camera.shake(0.6);
    this.hud.show(this.score);
  }

  showResults() {
    this.resultsShown = true;
    this.screens.showGameOver({
      height: this.score.height,
      platforms: this.score.platforms,
      best: this.score.best,
      isNewBest: this.newBest,
    });
  }

  update(dt) {
    switch (this.state) {
      case State.READY:
        this.world.update(dt, NO_INPUT);
        if (this.input.wasPressed('confirm')) this.play();
        break;

      case State.PLAYING:
        if (this.input.wasPressed('pause')) {
          this.pause();
          break;
        }
        this.world.update(dt, this.input, this.slingshot.takeRelease());
        this.camera.follow(this.world.player, dt, this.world.creep);
        if (this.score.setHeight(this.world.height)) this.hud.show(this.score);
        break;

      case State.PAUSED:
        if (this.input.wasPressed('pause') || this.input.wasPressed('confirm')) this.resume();
        break;

      case State.OVER:
        this.world.update(dt, NO_INPUT);
        this.camera.follow(this.world.player, dt); // lets the shake settle
        this.timeSinceFall += dt;
        if (!this.resultsShown && this.timeSinceFall >= CONFIG.gameOver.resultsDelay) {
          this.showResults();
        } else if (this.resultsShown && this.input.wasPressed('confirm')) {
          this.play();
        }
        break;
    }
    this.input.endStep();
  }

  render() {
    this.viewport.begin(this.theme.colors.backdrop);
    const shot = this.state === State.PLAYING ? this.slingshot.shot : null;
    this.world.render(this.viewport.ctx, this.theme, shot);
    this.viewport.end();
  }
}
