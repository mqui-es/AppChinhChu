/**
 * ANIMATION SYSTEM — iOS 26 Liquid Glass Motion Language
 * Centralised spring configs, micro-interaction helpers, and entrance factories.
 */

import { Animated, Easing } from 'react-native';

// ─── Spring Physics Library ───────────────────────────────────────────────────
export const SPRINGS = {
  // Near-instant tactile press feedback — feels "real"
  tap:        { stiffness: 340, damping: 28, mass: 0.7, useNativeDriver: true },
  // Snappy dismiss / pop-in
  snappy:     { stiffness: 280, damping: 26, mass: 0.75, useNativeDriver: true },
  // Standard navigation transition
  standard:   { stiffness: 200, damping: 24, mass: 0.85, useNativeDriver: true },
  // Gentle entrance — elements falling into place
  entrance:   { stiffness: 160, damping: 22, mass: 0.9, useNativeDriver: true },
  // Floaty tab-bar show/hide
  float:      { stiffness: 180, damping: 22, mass: 0.8, useNativeDriver: true },
  // Very bouncy for icons/badges
  bounce:     { stiffness: 220, damping: 15, mass: 0.8, useNativeDriver: true },
  // Non-native-driver spring (for layout props like height/width)
  layout:     { stiffness: 180, damping: 22, mass: 0.8, useNativeDriver: false },
};

// ─── Timing Curves ────────────────────────────────────────────────────────────
export const CURVES = {
  easeOut:    Easing.bezier(0.0, 0.0, 0.2, 1),
  easeInOut:  Easing.bezier(0.42, 0, 0.58, 1),
  overshoot:  Easing.bezier(0.34, 1.56, 0.64, 1), // subtle overshoot spring-like
};

// ─── Micro-interaction helpers ────────────────────────────────────────────────

/** Returns animated handlers for press-in / press-out scale feedback. */
export function usePressScale(
  scale: Animated.Value,
  toValue = 0.95,
  bounceBack = 1,
) {
  const pressIn  = () => Animated.spring(scale, { toValue, ...SPRINGS.tap }).start();
  const pressOut = () => Animated.spring(scale, { toValue: bounceBack, ...SPRINGS.tap }).start();
  return { pressIn, pressOut };
}

/** Pulse a value: toValue → back to 1. Great for icon taps. */
export function pulseAnim(anim: Animated.Value, toValue = 1.18, duration = 140) {
  return Animated.sequence([
    Animated.timing(anim, {
      toValue,
      duration,
      easing: CURVES.easeOut,
      useNativeDriver: true,
    }),
    Animated.spring(anim, { toValue: 1, ...SPRINGS.snappy }),
  ]);
}

/** Staggered entrance: slide up + fade in. Returns the Animated.CompositeAnimation. */
export function entranceAnim(
  translateY: Animated.Value,
  opacity: Animated.Value,
  delay = 0,
  fromY = 28,
) {
  return Animated.parallel([
    Animated.spring(translateY, {
      toValue: 0,
      delay,
      ...SPRINGS.entrance,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: 320,
      delay,
      easing: CURVES.easeOut,
      useNativeDriver: true,
    }),
  ]);
}

/** Shimmer loop animation for skeleton screens. */
export function shimmerLoop(anim: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.75, duration: 850, easing: CURVES.easeInOut, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.28, duration: 850, easing: CURVES.easeInOut, useNativeDriver: true }),
    ])
  );
}

/** Modal pop-in: scale 0.88 → 1 + fade in */
export function modalEntranceAnim(scale: Animated.Value, opacity: Animated.Value) {
  return Animated.parallel([
    Animated.spring(scale, { toValue: 1, ...SPRINGS.snappy }),
    Animated.timing(opacity, { toValue: 1, duration: 200, easing: CURVES.easeOut, useNativeDriver: true }),
  ]);
}

/** Modal exit: scale 1 → 0.92 + fade out */
export function modalExitAnim(scale: Animated.Value, opacity: Animated.Value) {
  return Animated.parallel([
    Animated.spring(scale, { toValue: 0.92, ...SPRINGS.tap }),
    Animated.timing(opacity, { toValue: 0, duration: 160, easing: CURVES.easeInOut, useNativeDriver: true }),
  ]);
}

/** Slide-in from bottom for sheets / popovers */
export function sheetEntranceAnim(translateY: Animated.Value, opacity: Animated.Value) {
  return Animated.parallel([
    Animated.spring(translateY, { toValue: 0, ...SPRINGS.standard }),
    Animated.timing(opacity, { toValue: 1, duration: 240, easing: CURVES.easeOut, useNativeDriver: true }),
  ]);
}

/** Tab indicator slide — non-native for layout */
export function tabSlideAnim(anim: Animated.Value, toValue: number) {
  return Animated.spring(anim, { toValue, stiffness: 260, damping: 26, mass: 0.8, useNativeDriver: false });
}
