import { CONFIG } from '../config.js';
import { EVENTS } from '../events.js';
import { Effects } from '../effects/Effects.js';
import { Abyss } from '../entities/Abyss.js';
import { Player } from '../entities/Player.js';
import { clamp } from '../utils/math.js';
import { JumpModel } from './JumpModel.js';
import { LevelGenerator } from './LevelGenerator.js';

const PREVIEW_STEP = 1 / 30;

/** Everything in the climb, and the rules that connect it. */
export class World {
  constructor({ camera, events, random }) {
    this.camera = camera;
    this.events = events;
    this.width = CONFIG.view.minWidth;
    this.jumpModel = new JumpModel(CONFIG.player);
    this.abyss = new Abyss(camera);
    this.effects = new Effects();
    this.generator = new LevelGenerator({ random, jumpModel: this.jumpModel, viewWidth: this.width });
    this.startFloor = null;
    this.platforms = [];
    this.player = null;
    this.startBottom = 0;
    this.climbed = 0; // highest point reached, in world pixels above the floor
    this.bestClimbed = 0; // drawn as a line, so you can see the record coming
  }

  /** Metres climbed this run. */
  get height() {
    return Math.floor(this.climbed / CONFIG.score.pixelsPerMeter);
  }

  /** Builds a fresh climb with the player standing in the middle of the floor. */
  reset(bestMeters = 0) {
    this.startFloor = this.generator.createStart();
    this.platforms = [this.startFloor];
    this.effects.clear();

    this.player = new Player((this.width - CONFIG.player.size) / 2, 0, this.jumpModel);
    this.player.standOn(this.startFloor);
    this.startBottom = this.player.bottom;
    this.climbed = 0;
    this.bestClimbed = bestMeters * CONFIG.score.pixelsPerMeter;
    this.camera.snapTo(CONFIG.view.height);
    this.extendLevel();
  }

  update(dt, launch = null) {
    for (const platform of this.platforms) platform.update(dt);
    if (this.player.alive) this.updatePlayer(dt, launch);
    this.effects.update(dt);
    this.extendLevel();
    this.forgetOffscreen();
  }

  updatePlayer(dt, launch) {
    const { player } = this;
    const bounds = { left: 0, right: this.width, bottom: this.abyss.top };
    player.update(dt, this.platforms, bounds, launch);

    if (player.jumped) this.onLaunched();
    if (player.landedOn) this.onLanded(player.landedOn);
    if (player.bounced) this.onBounced(player.bounced);
    // Height counts where you stand, so a big jump that misses doesn't score.
    if (player.grounded) this.climb(this.startBottom - player.bottom);
    if (this.abyss.hasSwallowed(player)) this.onFell();
  }

  climb(pixels) {
    if (pixels <= this.climbed) return;
    const { pixelsPerMeter, markerEvery } = CONFIG.score;
    const step = pixelsPerMeter * markerEvery;
    const marker = Math.floor(pixels / step);
    if (marker > Math.floor(this.climbed / step)) {
      this.effects.milestone(this.player.centerX, this.player.top, marker * markerEvery);
    }
    this.climbed = pixels;
  }

  onLanded(platform) {
    const { player } = this;
    this.effects.landingDust(player.centerX, player.bottom, player.impact);
    this.events.emit(EVENTS.PLAYER_LANDED, player.impact);
    const firstTouch = platform.touch();
    if (firstTouch && platform.scores) this.events.emit(EVENTS.PLATFORM_LANDED, platform);
  }

  onLaunched() {
    const { player } = this;
    this.effects.jumpDust(player.centerX, player.bottom);
    const speed = Math.hypot(player.vx, player.vy);
    this.events.emit(EVENTS.PLAYER_LAUNCHED, Math.min(1, speed / CONFIG.slingshot.maxLaunch));
  }

  onBounced(speed) {
    const { player } = this;
    const wallX = player.centerX < this.width / 2 ? player.left : player.right;
    this.effects.wallDust(wallX, player.centerY, Math.sign(this.width / 2 - wallX));
    this.events.emit(EVENTS.PLAYER_BOUNCED, Math.min(1, speed / CONFIG.slingshot.maxLaunch));
  }

  onFell() {
    this.player.alive = false;
    this.effects.splash(this.player.centerX, this.abyss.top);
    this.events.emit(EVENTS.PLAYER_FELL);
  }

  /** Streams new platforms in above the camera. */
  extendLevel() {
    const horizon = this.camera.top - CONFIG.generation.lookAhead;
    while (this.generator.last.top > horizon) this.platforms.push(this.generator.next());
  }

  /** Drops platforms that have slipped out of the bottom of the view. */
  forgetOffscreen() {
    const below = this.abyss.top + CONFIG.generation.cleanupMargin;
    this.platforms = this.platforms.filter((platform) => platform.top < below);
  }

  /** `shot` is the slingshot pull in progress, if any. */
  render(ctx, theme, shot = null) {
    const { colors } = theme;
    ctx.fillStyle = colors.column;
    ctx.fillRect(0, 0, this.camera.width, this.camera.height);

    ctx.save();
    this.camera.applyTransform(ctx);
    this.renderMarkers(ctx, theme);
    for (const platform of this.platforms) platform.render(ctx, theme);
    if (this.player.alive) {
      if (shot) this.renderAim(ctx, theme, shot);
      this.player.render(ctx, theme);
    }
    this.abyss.render(ctx, theme);
    this.effects.render(ctx, theme);
    ctx.restore();

    // Thin walls down each side of the column.
    ctx.fillStyle = colors.wall;
    ctx.fillRect(0, 0, 3, this.camera.height);
    ctx.fillRect(this.camera.width - 3, 0, 3, this.camera.height);
  }

  /** Height ticks up the left wall, plus a dashed line at your best. */
  renderMarkers(ctx, theme) {
    const { colors } = theme;
    const { pixelsPerMeter, markerEvery } = CONFIG.score;
    const step = pixelsPerMeter * markerEvery;
    const { camera } = this;
    const first = Math.max(1, Math.ceil((this.startBottom - camera.bottom) / step));
    const last = Math.floor((this.startBottom - camera.top) / step);

    ctx.font = theme.font(13, 500);
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    const hudBottom = camera.top + CONFIG.hud.clearance;
    for (let index = first; index <= last; index += 1) {
      const y = this.startBottom - index * step;
      if (y < hudBottom) continue; // the readout owns the top-left corner
      ctx.fillStyle = colors.marker;
      ctx.fillRect(4, y - 1, 14, 2);
      ctx.fillText(`${index * markerEvery} m`, 22, y + 6);
    }

    if (this.bestClimbed > 0) {
      const y = this.startBottom - this.bestClimbed;
      ctx.strokeStyle = colors.bestLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.bestLine;
      ctx.textAlign = 'right';
      ctx.fillText('best', this.width - 10, y - 4);
    }
  }

  /** A short dotted arc: the start of the flight the launch would give. */
  renderAim(ctx, theme, shot) {
    const { colors } = theme;
    const { player, jumpModel } = this;
    const ready = shot.valid && player.canLaunch;

    // The same gravity the player feels.
    let { vx, vy } = shot;
    let x = player.centerX;
    let y = player.centerY;
    const steps = Math.round(CONFIG.slingshot.previewTime / PREVIEW_STEP);
    ctx.fillStyle = ready ? colors.pickupText : colors.marker;
    for (let step = 1; step <= steps; step += 1) {
      vy += (vy < 0 ? jumpModel.gravity : jumpModel.fallGravity) * PREVIEW_STEP;
      x += vx * PREVIEW_STEP;
      y += vy * PREVIEW_STEP;
      if (x < 0 || x > this.width) {
        x = clamp(x, 0, this.width);
        vx = 0;
      }
      if (step % 2) continue;
      ctx.globalAlpha = (1 - step / steps) * (ready ? 0.9 : 0.4);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
