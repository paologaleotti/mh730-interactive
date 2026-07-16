// Reduced-motion helper (FR-14.3). Camera flights and pans collapse to instant
// cuts when the viewer has asked their OS for reduced motion.

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** `ms`, or 0 when reduced motion is preferred. */
export const motionDuration = (ms: number): number => (prefersReducedMotion() ? 0 : ms)
