import { CONFIG } from '../config.js';
import { approach, clamp, damp } from '../utils/math.js';
import { Entity } from './Entity.js';

const SETTINGS = CONFIG.player;
const SKIN = 0.5; // overlaps thinner than this count as touching, not colliding
const BLINK_DURATION = 0.12;

/** The hero: a small box that runs, jumps, gets slung, and lands on platforms from above. */
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
    this.jumpBufferTimer = 0;
    this.jumpHeld = false;
    this.slung = false; // airborne from a slingshot launch: keep the momentum

    // Set for a single step; the world reacts to them after each update.
    this.jumped = false;
    this.landedOn = null;
    this.impact = 0; // 0–1: how hard the latest landing was

    // Looks only.
    this.facing = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.blinkTimer = 2;
  }

  /** True while a jump or a slingshot launch can start. */
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
   * Advances the player by one physics step.
   * `input` answers isDown/wasPressed for actions, `solids` are the platforms,
   * `bounds.left`/`bounds.right` are the walls, and `launch` is a released
   * slingshot ({ vx, vy }) or null.
   */
  update(dt, input, solids, bounds, launch = null) {
    const wasGrounded = this.grounded;
    const previousGround = this.ground;
    this.jumped = false;
    this.landedOn = null;

    this.updateTimers(dt, input);
    this.run(dt, input);
    this.jump(input);
    if (launch) this.sling(launch);
    this.fall(dt);
    this.rideGround();
    this.moveX(dt, bounds);
    this.moveY(dt, solids);

    if (this.grounded && (!wasGrounded || this.ground !== previousGround)) this.land();
    this.animate(dt);
  }

  updateTimers(dt, input) {
    this.coyoteTimer = this.grounded ? SETTINGS.coyoteTime : this.coyoteTimer - dt;
    this.jumpBufferTimer = input.wasPressed('jump') ? SETTINGS.jumpBufferTime : this.jumpBufferTimer - dt;
  }

  run(dt, input) {
    const direction = Number(input.isDown('right')) - Number(input.isDown('left'));
    if (direction !== 0) {
      const accel = this.grounded ? SETTINGS.groundAccel : SETTINGS.airAccel;
      const target = direction * Math.max(SETTINGS.maxSpeed, Math.abs(this.vx) * Number(this.slung));
      this.vx = approach(this.vx, target, accel * dt);
      this.facing = direction;
    } else if (!(this.slung && !this.grounded)) {
      const friction = this.grounded ? SETTINGS.groundFriction : SETTINGS.airFriction;
      this.vx = approach(this.vx, 0, friction * dt);
    }
  }

  jump(input) {
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.takeOff(-this.jumpModel.jumpVelocity);
      this.jumpHeld = true;
    }

    // Letting go early cuts the jump short, so a tap gives a small hop.
    if (this.jumpHeld && (this.vy >= 0 || !input.isDown('jump'))) {
      if (this.vy < 0) this.vy *= SETTINGS.jumpCutMultiplier;
      this.jumpHeld = false;
    }
  }

  /** A slingshot launch: only from the ground (or just off an edge). */
  sling({ vx, vy }) {
    if (!this.canLaunch) return;
    this.vx = vx;
    this.takeOff(vy);
    this.jumpHeld = false;
    this.slung = true;
    if (vx !== 0) this.facing = Math.sign(vx);
  }

  takeOff(vy) {
    this.vy = vy;
    this.grounded = false;
    this.ground = null;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumped = true;
    this.squash(0.72, 1.3);
  }

  fall(dt) {
    const gravity = this.vy < 0 ? this.jumpModel.gravity : this.jumpModel.fallGravity;
    this.vy = Math.min(this.vy + gravity * dt, SETTINGS.maxFallSpeed);
  }

  /** A dropping platform carries whoever stands on it down with it. */
  rideGround() {
    if (this.grounded) this.y += this.ground.y - this.ground.prevY;
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

  /** Lands on the highest platform the feet crossed on the way down; jumps pass up through them. */
  moveY(dt, solids) {
    const previousBottom = this.bottom;
    const speedBefore = this.vy;
    this.y += this.vy * dt;
    this.grounded = false;
    this.ground = null;
    if (this.vy < 0) return;

    let landing = null;
    for (const solid of solids) {
      if (!this.overlapsHorizontally(solid)) continue;
      const crossed = previousBottom <= Math.max(solid.top, solid.prevY) + SKIN && this.bottom >= solid.top;
      if (crossed && (!landing || solid.top < landing.top)) landing = solid;
    }
    if (!landing) return;

    this.y = landing.top - this.height;
    this.vy = 0;
    this.grounded = true;
    this.ground = landing;
    this.slung = false;
    this.impact = clamp(speedBefore / SETTINGS.maxFallSpeed, 0, 1);
  }

  land() {
    this.landedOn = this.ground;
    const squash = 0.08 + 0.22 * this.impact;
    this.squash(1 + squash, 1 - squash);
  }

  squash(scaleX, scaleY) {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  animate(dt) {
    this.scaleX = damp(this.scaleX, 1, 12, dt);
    this.scaleY = damp(this.scaleY, 1, 12, dt);
    this.blinkTimer -= dt;
    if (this.blinkTimer < -BLINK_DURATION) this.blinkTimer = 2 + Math.random() * 3;
  }

  render(ctx, theme) {
    const { colors } = theme;
    const unit = this.width / 36; // the face was drawn for a 36 px box
    const width = this.width * this.scaleX;
    const height = this.height * this.scaleY;
    const x = this.centerX - width / 2;
    const y = this.bottom - height; // squash and stretch from the feet

    ctx.fillStyle = colors.player;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6 * unit);
    ctx.fill();

    // Eyes glance the way the box is heading.
    const fullEye = 9 * unit;
    const eyeHeight = this.blinkTimer < 0 ? 2 * unit : fullEye;
    const eyeX = x + width / 2 + this.facing * 4 * unit;
    const eyeY = y + height * 0.3 + clamp(this.vy / 600, -1, 1) * 3 * unit + (fullEye - eyeHeight) / 2;
    ctx.fillStyle = colors.playerEye;
    ctx.fillRect(eyeX - 8 * unit, eyeY, 4 * unit, eyeHeight);
    ctx.fillRect(eyeX + 4 * unit, eyeY, 4 * unit, eyeHeight);
  }
}
