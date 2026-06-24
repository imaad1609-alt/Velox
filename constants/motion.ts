// Velox motion system — shared timing/easing so animations feel consistent and
// "subtle & fast" (mirrors the role constants/theme.ts plays for visuals).
// All animations run on the UI thread via reanimated worklets.
import { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";

export const DURATION = {
  fast: 160,
  base: 240,
  slow: 320,
} as const;

// Delay between consecutive items in a staggered entrance (ms).
export const STAGGER = 55;

// Press-to-shrink feedback for primary buttons.
export const PRESS = {
  scaleTo: 0.96,
  in: 90,
  out: 130,
} as const;

// ── Entrance builders ────────────────────────────────────────────────────────
// `index` staggers an item within a list/group; omit for a single element.
export const enterDown = (index = 0) =>
  FadeInDown.duration(DURATION.base).delay(index * STAGGER);

export const enter = (index = 0) =>
  FadeIn.duration(DURATION.base).delay(index * STAGGER);

// Shared smooth reflow for lists that add/remove items (sets, exercises).
export const layout = LinearTransition.duration(DURATION.base);
