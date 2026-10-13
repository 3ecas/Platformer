/**
 * The maths of the player's jump, shared by the Player (to move) and the
 * LevelGenerator (to build only jumps that can actually be made).
 * Heights are y values, so a smaller y is higher up.
 */
export class JumpModel {
  constructor({ jumpHeight, timeToApex, fallGravityMultiplier, maxSpeed, size }) {
    this.jumpHeight = jumpHeight;
    this.gravity = (2 * jumpHeight) / timeToApex ** 2;
    this.fallGravity = this.gravity * fallGravityMultiplier;
    this.jumpVelocity = this.gravity * timeToApex;
    this.runSpeed = maxSpeed;
    this.bodyHeight = size;
  }

  /** How far the feet can rise from a surface, given that the head stops at the ceiling. */
  peakHeight(surfaceY, ceilingY) {
    const headroom = surfaceY - this.bodyHeight - ceilingY;
    return Math.max(0, Math.min(this.jumpHeight, headroom));
  }

  /**
   * Horizontal distance covered at full speed by a full jump that takes off
   * from `fromY` and comes back down onto `toY`. Returns 0 if `toY` is too high.
   */
  reach(fromY, toY, ceilingY) {
    const peak = this.peakHeight(fromY, ceilingY);
    const rise = fromY - toY;
    if (rise > peak) return 0;

    // Rising: v·t − g·t²/2 = peak. A bump on the ceiling cuts this short.
    const speedAtPeak = Math.sqrt(Math.max(0, this.jumpVelocity ** 2 - 2 * this.gravity * peak));
    const riseTime = (this.jumpVelocity - speedAtPeak) / this.gravity;
    // Falling from rest at the peak down to the target.
    const fallTime = Math.sqrt((2 * (peak - rise)) / this.fallGravity);
    return this.runSpeed * (riseTime + fallTime);
  }
}
