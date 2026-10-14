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
    confirm: ['Space', 'Enter'],
    pause: ['Escape', 'KeyP'],
    mute: ['KeyM'],
  },

  camera: {
    // Once the player climbs above this line (a fraction of the view height),
    // the camera is dragged up with them. It never scrolls back down.
    followLine: 0.42,
    smoothing: 6, // how quickly the camera catches up (higher = snappier)
    maxShake: 10,
    shakeDecay: 1.6,
  },

  hud: {
    clearance: 120, // world pixels under the top-left readout kept free of wall markers
  },

  player: {
    size: 24,
    maxSpeed: 380, // the sideways speed the level generator plans its gaps around
    groundFriction: 3200, // stops a landing slide quickly
    airFriction: 0, // a launch keeps its sideways speed
    // The launch arc: these set gravity, and the height of a near-full shot.
    jumpHeight: 210,
    timeToApex: 0.42,
    fallGravityMultiplier: 1.3, // falling is snappier than rising
    maxFallSpeed: 1200,
    coyoteTime: 0.1, // grace period to launch after sliding off an edge
    spinRate: 9, // radians per second the box aims to tumble in the air
    wallBounce: 0.75, // share of sideways speed kept when bouncing off a wall (never above 1)
  },

  slingshot: {
    // Press anywhere, drag the way you want to fly and release: a push.
    maxPull: 140, // world pixels of drag for a full-power shot
    minPull: 14, // shorter drags are ignored, so a stray click doesn't launch
    maxLaunch: 1050, // launch speed at full pull
    previewTime: 0.4, // seconds of flight drawn as the aiming arc
  },

  platform: {
    thickness: { min: 16, max: 20 },
  },

  start: {
    floorTop: 640, // a full-width floor near the bottom of the first screen
  },

  generation: {
    lookAhead: 480, // keep the climb built this far above the top of the view
    cleanupMargin: 0, // platforms are gone once they're fully below the view
    sideMargin: 6, // keep platforms this far in from the walls
    riseMargin: 22, // the jump's peak must clear the next top by this much
    minShift: 150, // preferred sideways distance between neighbouring platforms' centres
    // Platforms that slide side to side, from `movingFrom` metres up.
    movingFrom: 50,
    movingChance: { min: 0.3, max: 0.65 }, // at `movingFrom`, and at `movingFrom + movingRamp`
    movingRamp: 250,
    movingRange: { min: 50, max: 130 }, // how far either side of its centre it travels
    movingSpeed: { min: 0.7, max: 1.5 }, // radians per second through the swing
    // Obstacles, each starting at its own height and growing more common over `obstacleRamp` metres.
    obstacleRamp: 300,
    spikesFrom: 75, // metres: spikes along part of some platforms
    spikesChance: { min: 0.25, max: 0.55 },
    spikesShare: { min: 0.3, max: 0.5 }, // share of the platform's top that is spiked
    spikesMinSafe: 44, // world pixels of top always left safe
    thornsFrom: 125, // metres: thorn balls drifting in the gaps
    thornsChance: { min: 0.2, max: 0.5 },
    thornRadius: 10,
    thornRange: { min: 60, max: 170 },
    thornSpeed: { min: 0.8, max: 1.7 },
    flamesFrom: 100, // metres: flamethrowers on the side walls, in gaps without a thorn
    flamesChance: { min: 0.2, max: 0.45 },
    flameLength: { min: 150, max: 270 }, // never past about half the column, so there's always a way by
    flameOffTime: { min: 1.6, max: 2.8 }, // seconds
    flameWarnTime: 0.6,
    flameOnTime: { min: 1.1, max: 1.8 },
    reachSafety: 0.85, // share of the theoretical jump reach the generator relies on
    rampPlatforms: 120, // platforms until the difficulty maxes out
    // Difficulty blends from `easy` to `hard`. `riseMin`/`riseMax` are fractions of the
    // highest safe climb; `reachMax` caps how far sideways the next platform may sit.
    easy: { widthMin: 100, widthMax: 160, riseMin: 0.55, riseMax: 0.75, reachMax: 0.85 },
    hard: { widthMin: 56, widthMax: 96, riseMin: 0.75, riseMax: 0.95, reachMax: 1 },
  },

  score: {
    pixelsPerMeter: 24, // one player height is one metre
    markerEvery: 25, // metres between height markers on the wall
  },

  gameOver: {
    resultsDelay: 0.8, // let the fall play out before the results appear
  },
});
