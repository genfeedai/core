import type { CubicBezier, EasingPreset } from '@genfeedai/types';

/**
 * Easing presets based on easy-peasy-ease patterns
 * Each preset is a cubic bezier curve: [x1, y1, x2, y2]
 */
export const EASING_PRESETS: Record<EasingPreset, CubicBezier> = {
  // Linear - no easing
  linear: [0, 0, 1, 1],

  // Standard easing functions
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],

  // Quadratic easing
  easeInQuad: [0.55, 0.085, 0.68, 0.53],
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
  easeInOutQuad: [0.455, 0.03, 0.515, 0.955],

  // Cubic easing
  easeInCubic: [0.55, 0.055, 0.675, 0.19],
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeInOutCubic: [0.645, 0.045, 0.355, 1],

  // Exponential easing
  easeInExpo: [0.95, 0.05, 0.795, 0.035],
  easeOutExpo: [0.19, 1, 0.22, 1],
  easeInOutExpo: [1, 0, 0, 1],
};

/**
 * Evaluate a cubic bezier curve at parameter t
 */
export function evaluateBezier(t: number, curve: CubicBezier): number {
  const [x1, y1, x2, y2] = curve;

  // Newton-Raphson iteration to find t for given x
  const epsilon = 1e-6;
  let guess = t;

  for (let i = 0; i < 8; i++) {
    const x =
      3 * (1 - guess) * (1 - guess) * guess * x1 +
      3 * (1 - guess) * guess * guess * x2 +
      guess * guess * guess -
      t;

    if (Math.abs(x) < epsilon) break;

    const dx =
      3 * (1 - guess) * (1 - guess) * x1 +
      6 * (1 - guess) * guess * (x2 - x1) +
      3 * guess * guess * (1 - x2);

    guess -= x / dx;
  }

  // Evaluate y at the found t
  return (
    3 * (1 - guess) * (1 - guess) * guess * y1 +
    3 * (1 - guess) * guess * guess * y2 +
    guess * guess * guess
  );
}

/**
 * Apply speed curve to video timestamps
 * Returns an array of warped timestamps
 */
export function applySpeedCurve(
  duration: number,
  curve: CubicBezier,
  sampleRate: number = 60
): number[] {
  const timestamps: number[] = [];

  for (let i = 0; i <= sampleRate; i++) {
    const t = i / sampleRate;
    const easedT = evaluateBezier(t, curve);
    timestamps.push(easedT * duration);
  }

  return timestamps;
}

/**
 * Get display name for easing preset
 */
export function getEasingDisplayName(preset: EasingPreset): string {
  const names: Record<EasingPreset, string> = {
    linear: 'Linear',
    easeIn: 'Ease In',
    easeOut: 'Ease Out',
    easeInOut: 'Ease In Out',
    easeInQuad: 'Ease In Quadratic',
    easeOutQuad: 'Ease Out Quadratic',
    easeInOutQuad: 'Ease In Out Quadratic',
    easeInCubic: 'Ease In Cubic',
    easeOutCubic: 'Ease Out Cubic',
    easeInOutCubic: 'Ease In Out Cubic',
    easeInExpo: 'Ease In Exponential',
    easeOutExpo: 'Ease Out Exponential',
    easeInOutExpo: 'Ease In Out Exponential',
  };

  return names[preset] || preset;
}
