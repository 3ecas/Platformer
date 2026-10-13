export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (from, to, t) => from + (to - from) * t;

/** Moves `value` towards `target` by at most `maxDelta`, without overshooting. */
export const approach = (value, target, maxDelta) =>
  value < target ? Math.min(value + maxDelta, target) : Math.max(value - maxDelta, target);

/** Frame-rate independent smoothing: closes ~63% of the distance every 1/rate seconds. */
export const damp = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
