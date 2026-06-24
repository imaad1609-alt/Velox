// Velox design system — "High-Performance Athletic System"
// A single source of truth for color, typography, spacing, radius and elevation.
// Aesthetic: obsidian "Void" surfaces, Electric Lime as the high-priority "go"
// signal, Cobalt Blue for technical/secondary actions. Type pairs the condensed,
// aggressive Archivo Narrow (display) with neutral Inter (body) and JetBrains
// Mono (numeric/data) for tabular, precision-tool readouts.
//
// Prefer these tokens over raw hex/px literals so the look stays consistent and
// future theme changes happen in one place.

export const COLORS = {
  // Level 0 — base app background (pure obsidian, zero OLED light bleed)
  base: "#0A0A0A",
  // Level 1 — cards / containers
  surface1: "#121212",
  // Level 2 — modals / pop-overs (lighter charcoal, "beveled" feel)
  surface2: "#1C1C1E",
  // A slightly raised inner surface (inputs-on-cards, chips)
  surface3: "#2A2A2A",

  // Hairline borders / outlines used in place of heavy shadows
  border: "#2C2C2E",
  borderStrong: "#3A3A3C",

  // Primary — Electric Lime. Reserved for completion, PRs, primary CTAs.
  primary: "#CCFF00",
  primaryDim: "#ABD600",
  onPrimary: "#000000",
  // Glow tint (use at low opacity behind active primary elements)
  primaryGlow: "rgba(204, 255, 0, 0.20)",

  // Secondary — Cobalt Blue. Technical data, secondary interactive elements.
  secondary: "#2E5BFF",
  secondaryDim: "#1E3FB8",
  onSecondary: "#FFFFFF",

  // Text on dark surfaces
  text: "#E5E2E1",
  textMuted: "#9A9A98",
  textDim: "#6B6B6B",
  onSurfaceVariant: "#C4C9AC",

  // Status
  success: "#CCFF00",
  error: "#FF3B30",
  errorContainer: "#3A0E0C",
  warning: "#FFCC00",
} as const;

// Font family keys — must match the keys registered with useFonts() in
// app/_layout.tsx. Use FONTS.* instead of raw string names.
export const FONTS = {
  // Archivo Narrow — display & headlines (use uppercase for athletic feel)
  display: "ArchivoNarrow_700Bold",
  displaySemiBold: "ArchivoNarrow_600SemiBold",
  heading: "ArchivoNarrow_600SemiBold",
  // Inter — body / long-form / instructions
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  // JetBrains Mono — numeric labels, timers, weight inputs (tabular)
  mono: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

// Type scale (from the design spec). Pair a fontFamily from FONTS with these.
export const TYPE = {
  displayLg: { fontFamily: FONTS.display, fontSize: 40, lineHeight: 40, letterSpacing: -0.8 },
  data: { fontFamily: FONTS.display, fontSize: 32, lineHeight: 32, letterSpacing: -0.3 },
  headline: { fontFamily: FONTS.heading, fontSize: 24, lineHeight: 28, letterSpacing: 0.5 },
  bodyLg: { fontFamily: FONTS.body, fontSize: 18, lineHeight: 26, letterSpacing: 0.1 },
  bodyMd: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 24, letterSpacing: 0.1 },
  // Uppercase mono micro-label (tracking) — use with textTransform: "uppercase"
  labelCaps: { fontFamily: FONTS.mono, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
} as const;

// 4px baseline spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
  margin: 20, // mobile side margin
} as const;

// Corner radii — soft but disciplined; avoid pill shapes on buttons
export const RADIUS = {
  sm: 2,
  md: 4,
  lg: 8,
  full: 9999,
} as const;

// Minimum touch targets (56 preferred for primary logging buttons)
export const HIT = {
  min: 44,
  primary: 56,
} as const;
