import { CONFIG } from '../config.js';
import { approach, clamp, damp } from '../utils/math.js';
import { Entity } from './Entity.js';

const SETTINGS = CONFIG.player;
const SKIN = 0.5; // overlaps thinner than this count as touching, not colliding
const QUARTER_TURN = Math.PI / 2;
const PREDICT_STEP = 1 / 120;
const TIP_SPEED = 90; // sideways nudge when the box tips off an edge
const PREDICT_LIMIT = 5; // seconds of flight to look ahead before giving up
const TRAIL_LIFE = 0.28; // seconds a trail ghost lingers
const TRAIL_EVERY = 1 / 60; // seconds between ghosts

/**
 * The hero: a small box that only moves when slung. It tumbles in the air and
 * always lands flat: at take-off it works out when it will land and picks a
 * spin that finishes on a whole number of quarter turns.
 */
export class Player extends Entity {
  constructor(x, y, jumpModel) {
    super(x, y, SETTINGS.size, SETTINGS.size);
    this.jumpModel = jumpModel;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.grounded = false;
    this.ground = null; // the platform underfoot
    this.coyoteTimer = 0;

    // Set for a single step; the world reacts to them after each update.
    this.jumped = false;
    this.landedOn = null;
    this.impact = 0; // 0–1: how hard the latest landing was

    // Looks only.
    this.angle = 0;
    this.spin = 0; // radians per second while airborne
    this.scaleX = 1;
    this.scaleY = 1;
    this.trail = []; // fading ghosts of the box, left behind in flight
    this.trailTimer = 0;
  }

  /** True while a slingshot launch can start. */
  get canLaunch() {
    return this.grounded || this.coyoteTimer > 0;
  }

  standOn(platform) {
    this.y = platform.top - this.height;
    this.vy = 0;
    this.grounded = true;
    this.ground = platform;
  }

  /**
   * Advances the player by one physics step. `solids` are the platforms
   * (already moved for this step), `bounds` holds the walls (`left`, `right`)
   * and the bottom of the view (`bottom`), and `launch` is a released
   * slingshot ({ vx, vy }) or null.
   */
  update(dt, solids, bounds, launch = null) {
    const wasGrounded = this.grounded;
    const previousGround = this.ground;
    this.jumped = false;
    this.landedOn = null;

    this.coyoteTimer = this.grounded ? SETTINGS.coyoteTime : this.coyoteTimer - dt;
    if (launch) this.sling(launch);
    this.slow(dt);
    this.fall(dt);
    this.rideGround();
    this.moveX(dt, bounds);
    this.moveY(dt, solids);

    if (this.grounded && (!wasGrounded || this.ground !== previousGround)) this.land();
    // Airborne this step, by launching or by sliding off an edge: plan the tumble.
    if (!this.grounded && wasGrounded && !this.jumped) this.tipOff(previousGround);
    if (!this.grounded && (this.jumped || wasGrounded)) this.planSpin(solids, bounds);
    this.animate(dt);
  }

  /** A slingshot launch: only from a platform (or just off its edge). */
  sling({ vx, vy }) {
    if (!this.canLaunch) return;
    this.vx = vx;
    this.vy = vy;
    this.grounded = false;
    this.ground = null;
    this.coyoteTimer = 0;
    this.jumped = true;
    this.squash(0.72, 1.3);
  }

  slow(dt) {
    const friction = this.grounded ? SETTINGS.groundFriction : SETTINGS.airFriction;
    this.vx = approach(this.vx, 0, friction * dt);
  }

  fall(dt) {
    this.vy = this.gravityStep(this.vy, dt);
  }

  gravityStep(vy, dt) {
    const gravity = vy < 0 ? this.jumpModel.gravity : this.jumpModel.fallGravity;
    return Math.min(vy + gravity * dt, SETTINGS.maxFallSpeed);
  }

  /** A moving platform carries whoever stands on it. */
  rideGround() {
    if (this.grounded) this.x += this.ground.x - this.ground.prevX;
  }

  /** Platforms are open at the sides, so only the walls stop sideways movement. */
  moveX(dt, bounds) {
    this.x += this.vx * dt;
    if (this.x < bounds.left) {
      this.x = bounds.left;
      this.vx = Math.max(this.vx, 0);
    } else if (this.right > bounds.right) {
      this.x = bounds.right - this.width;
      this.vx = Math.min(this.vx, 0);
    }
  }

  /** Lands on the highest platform the feet crossed on the way down; launches pass up through them. */
  moveY(dt, solids) {
    const previousBottom = this.bottom;
    const speedBefore = this.vy;
    this.y += this.vy * dt;
    this.grounded = false;
    this.ground = null;
    if (this.vy < 0) return;

    let landing = null;
    for (const solid of solids) {
      if (!this.isSupportedBy(solid.left, solid.width, this.centerX)) continue;
      const crossed = previousBottom <= solid.top + SKIN && this.bottom >= solid.top;
      if (crossed && (!landing || solid.top < landing.top)) landing = solid;
    }
    if (!landing) return;

    this.y = landing.top - this.height;
    this.vy = 0;
    this.grounded = true;
    this.ground = landing;
    this.impact = clamp(speedBefore / SETTINGS.maxFallSpeed, 0, 1);
  }

  /**
   * The box only rests on a platform while its centre is over it: with more
   * than half of its base hanging past the edge, it falls.
   */
  isSupportedBy(left, width, centerX) {
    return centerX >= left && centerX <= left + width;
  }

  /** Slid or was carried past an edge: tip outwards so it drops clear. */
  tipOff(platform) {
    if (!platform) return;
    const outward = Math.sign(this.centerX - platform.centerX) || 1;
    if (Math.sign(this.vx) !== outward || Math.abs(this.vx) < TIP_SPEED) this.vx = outward * TIP_SPEED;
  }

  /**
   * Flies the same physics forward to find when the box will land, then picks
   * a spin that completes a whole number of quarter turns by then.
   */
  planSpin(solids, bounds) {
    const direction = Math.sign(this.vx) || 1;
    const flightTime = this.predictLanding(solids, bounds);
    if (flightTime === null) {
      this.spin = direction * SETTINGS.spinRate; // heading off the bottom: just tumble
      return;
    }
    const turns = Math.round((SETTINGS.spinRate * flightTime) / QUARTER_TURN);
    this.spin = (direction * turns * QUARTER_TURN) / flightTime;
  }

  /** Seconds until the next landing, or null if the box falls out of the view first. */
  predictLanding(solids, bounds) {
    let { x, y, vx, vy } = this;
    const { width, height } = this;
    for (let time = PREDICT_STEP; time <= PREDICT_LIMIT; time += PREDICT_STEP) {
      vy = this.gravityStep(vy, PREDICT_STEP);
      x += vx * PREDICT_STEP;
      if (x < bounds.left) [x, vx] = [bounds.left, Math.max(vx, 0)];
      else if (x + width > bounds.right) [x, vx] = [bounds.right - width, Math.min(vx, 0)];

      const previousBottom = y + height;
      y += vy * PREDICT_STEP;
      const bottom = y + height;
      if (y > bounds.bottom) return null;
      if (vy < 0) continue;

      for (const solid of solids) {
        const left = solid.leftAfter(time);
        const supported = this.isSupportedBy(left, solid.width, x + width / 2);
        if (supported && previousBottom <= solid.top + SKIN && bottom >= solid.top) return time;
      }
    }
    return null;
  }

  land() {
    this.landedOn = this.ground;
    // Drop the whole quarter turns (a square looks the same), keep any small error to ease out.
    this.angle -= Math.round(this.angle / QUARTER_TURN) * QUARTER_TURN;
    this.spin = 0;
    const squash = 0.08 + 0.22 * this.impact;
    this.squash(1 + squash, 1 - squash);
  }

  squash(scaleX, scaleY) {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  animate(dt) {
    if (this.grounded) this.angle = damp(this.angle, 0, 20, dt);
    else this.angle += this.spin * dt;
    this.scaleX = damp(this.scaleX, 1, 12, dt);
    this.scaleY = damp(this.scaleY, 1, 12, dt);
    this.updateTrail(dt);
  }

  /** Drops a ghost every `TRAIL_EVERY` seconds while airborne; old ones fade out. */
  updateTrail(dt) {
    for (const ghost of this.trail) ghost.age += dt;
    this.trail = this.trail.filter((ghost) => ghost.age < TRAIL_LIFE);
    this.trailTimer -= dt;
    if (this.grounded || this.trailTimer > 0) return;
    this.trailTimer = TRAIL_EVERY;
    this.trail.push({ x: this.centerX, y: this.centerY, angle: this.angle, age: 0 });
  }

  render(ctx, theme) {
    const width = this.width * this.scaleX;
    const height = this.height * this.scaleY;

    ctx.fillStyle = theme.colors.player;
    for (const ghost of this.trail) {
      const fade = 1 - ghost.age / TRAIL_LIFE;
      const size = this.width * (0.35 + 0.5 * fade);
      ctx.save();
      ctx.globalAlpha = fade * 0.45;
      ctx.translate(ghost.x, ghost.y);
      ctx.rotate(ghost.angle);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle);
    ctx.fillStyle = theme.colors.player;
    // Squash and stretch from the feet.
    ctx.fillRect(-width / 2, this.height / 2 - height, width, height);
    ctx.restore();
  }
}
