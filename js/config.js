/**
 * Every tunable number in the game lives here.
 *
 * Units are world pixels and seconds. The view is a fixed column,
 * `view.width` world pixels wide and `view.minHeight`–`view.maxHeight` tall,
 * scaled to fit the window.
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
    width: 520, // the column is always this wide
    minHeight: 720, // and at least this tall; on tall screens (phones held upright) it grows to fill them
    maxHeight: 1160,
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
    landingGrip: 0.15, // share of sideways speed kept on touching down, so landings stick instead of sliding off
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
    // Each kind of challenge unlocks at its own height, about one per 100 m, and then
    // turns up more often over the next `featureRamp` metres (`chance` min → max).
    // A gap (a platform plus the space below it) gets at most `budget` of them, so
    // early on they come one at a time and only stack up late in the climb.
    featureRamp: 300,
    features: {
      slide: { from: 50, chance: { min: 0.25, max: 0.45 } }, // platform slides side to side
      spikes: { from: 100, chance: { min: 0.2, max: 0.4 } }, // spikes on the far end of a platform
      lift: { from: 150, chance: { min: 0.15, max: 0.3 } }, // platform rises and sinks
      thorn: { from: 200, chance: { min: 0.2, max: 0.4 } }, // thorn ball drifting in the gap
      flamer: { from: 300, chance: { min: 0.3, max: 0.6 } }, // flamethrower across the gap (where it fits)
    },
    budget: [
      { from: 0, max: 1 },
      { from: 450, max: 2 },
      { from: 800, max: 3 },
    ],
    breatherUntil: 600, // below this height, a gap after a thorn or flamethrower gets neither
    movingRange: { min: 50, max: 130 }, // how far a sliding platform travels either side of its centre
    movingSpeed: { min: 0.7, max: 1.5 }, // radians per second through the swing
    liftRange: { min: 22, max: 42 }, // how far a lift travels above and below its home
    spikesShare: { min: 0.25, max: 0.42 }, // share of the platform's top that is spiked
    spikesMinSafe: 60, // world pixels of top always left safe
    spikesMinWidth: 100, // only platforms at least this wide get spikes
    spikedReach: 0.7, // a spiked platform sits within this share of the usual sideways reach
    thornRadius: 10,
    thornRange: { min: 60, max: 170 },
    thornSpeed: { min: 0.8, max: 1.5 },
    flameCoverMargin: 22, // world pixels the jet reaches past the platforms' centres
    flameMaxIdle: 160, // most world pixels of jet allowed before it reaches the way up
    flameMaxLength: 340,
    flameMinLength: 120,
    flameOffTime: { min: 1.6, max: 2.8 }, // seconds
    flameWarnTime: 0.6,
    flameOnTime: { min: 1.1, max: 1.8 },
    reachSafety: 0.85, // share of the theoretical jump reach the generator relies on
    rampPlatforms: 140, // platforms until the jumps themselves reach full difficulty
    // Difficulty blends from `easy` to `hard`. `riseMin`/`riseMax` are fractions of the
    // highest safe climb; `reachMax` caps how far sideways the next platform may sit.
    easy: { widthMin: 100, widthMax: 160, riseMin: 0.55, riseMax: 0.75, reachMax: 0.85 },
    hard: { widthMin: 80, widthMax: 118, riseMin: 0.7, riseMax: 0.9, reachMax: 0.9 },
  },

  score: {
    pixelsPerMeter: 24, // one player height is one metre
    markerEvery: 25, // metres between height markers on the wall
  },

  gameOver: {
    resultsDelay: 0.8, // let the fall play out before the results appear
  },
});
