/**
 * Every tunable number in the game lives here.
 *
 * Units are world pixels and seconds. The view is a fixed column,
 * `view.width` × `view.height` world pixels, scaled to fit the window.
 * World y grows downwards, so climbing means y gets smaller.
 */

function deepFreeze(object) {
  for (const value of Object.values(object)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(object);
}

export const CONFIG = deepFreeze({
  view: {
    height: 720,
    minWidth: 520, // a fixed-width column; the window letterboxes around it
    maxWidth: 520,
  },

  loop: {
    maxStep: 1 / 120, // physics never advances more than this in one step
    maxFrame: 1 / 20, // longer frames (tab switches, hitches) are clamped
  },

  controls: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'ArrowUp', 'KeyW'],
    confirm: ['Space', 'Enter'],
    pause: ['Escape', 'KeyP'],
  },

  camera: {
    // Once the player climbs above this line (a fraction of the view height),
    // the camera is dragged up with them. It never scrolls back down.
    followLine: 0.42,
    smoothing: 6, // how quickly the camera catches up (higher = snappier)
    maxShake: 10,
    shakeDecay: 1.6,
    // The view also creeps upwards on its own, faster the higher you are.
    creepStartHeight: 240, // world pixels climbed before the creep begins
    creepMaxHeight: 6000, // height at which the creep reaches full speed
    creepMin: 14,
    creepMax: 70,
  },

  hud: {
    height: 44,
  },

  player: {
    size: 24,
    maxSpeed: 380,
    groundAccel: 3600,
    airAccel: 2600,
    groundFriction: 3200,
    airFriction: 900,
    jumpHeight: 170, // apex of a full, held jump
    timeToApex: 0.38,
    fallGravityMultiplier: 1.3, // falling is snappier than rising
    jumpCutMultiplier: 0.45, // upward speed kept when jump is released early
    maxFallSpeed: 1200,
    coyoteTime: 0.1, // grace period to jump after running off an edge
    jumpBufferTime: 0.12, // a jump pressed this long before landing still counts
  },

  slingshot: {
    // Press anywhere, pull back and release: the player flies the opposite way.
    maxPull: 140, // world pixels of pull for a full-power shot
    minPull: 14, // shorter pulls are ignored, so a stray click doesn't launch
    maxLaunch: 1050, // launch speed at full pull
    previewTime: 1.1, // seconds of flight drawn as the aiming arc
  },

  platform: {
    gravity: 1700,
    maxFallSpeed: 1400,
    thickness: { min: 16, max: 20 },
    shakeAmplitude: 2.5,
  },

  start: {
    floorTop: 640, // a full-width floor near the bottom of the first screen
    fallDelay: 2.4,
  },

  generation: {
    lookAhead: 480, // keep the climb built this far above the top of the view
    cleanupMargin: 240, // forget platforms this far below the view
    sideMargin: 6, // keep platforms this far in from the walls
    riseMargin: 22, // the jump's peak must clear the next top by this much
    reachSafety: 0.85, // share of the theoretical jump reach the generator relies on
    rampPlatforms: 120, // platforms until the difficulty maxes out
    // Difficulty blends from `easy` to `hard`. `riseMin`/`riseMax` are fractions of the
    // highest safe climb; `reachMax` caps how far sideways the next platform may sit.
    easy: { widthMin: 130, widthMax: 210, riseMin: 0.35, riseMax: 0.6, reachMax: 0.6, reactionTime: 1.1 },
    hard: { widthMin: 64, widthMax: 110, riseMin: 0.6, riseMax: 1, reachMax: 1, reactionTime: 0.35 },
  },

  score: {
    pixelsPerMeter: 24, // one player height is one metre
    markerEvery: 25, // metres between height markers on the wall
  },

  gameOver: {
    resultsDelay: 0.8, // let the fall play out before the results appear
  },
});
