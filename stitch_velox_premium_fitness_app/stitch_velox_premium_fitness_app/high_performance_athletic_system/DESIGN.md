---
name: High-Performance Athletic System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#b8c3ff'
  on-secondary: '#002388'
  secondary-container: '#0043eb'
  on-secondary-container: '#c6ceff'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001356'
  on-secondary-fixed-variant: '#0035be'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Archivo Narrow
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Archivo Narrow
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-heavy:
    fontFamily: Archivo Narrow
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

The design system is engineered for elite performance, catering to serious lifters who demand precision and focus. The aesthetic is **High-Contrast / Bold** with a **Corporate / Modern** structure, evoking the feeling of high-end gym equipment and precision telemetry tools.

The interface prioritizes "heads-up" readability in high-stress environments (the gym floor). It utilizes deep obsidian surfaces to reduce visual noise, allowing the high-visibility accent colors to command attention for critical data points like PRs, timers, and heavy sets. The emotional response is one of discipline, power, and premium craftsmanship.

## Colors

This design system utilizes a "Void" palette. The background is a pure obsidian (#0A0A0A) to ensure zero light bleed on OLED screens. 

- **Primary (Electric Lime):** Reserved for high-priority actions, completion states, and performance records. It represents energy and "go" signals.
- **Secondary (Cobalt Blue):** Used for technical data, secondary interactive elements, and instructional pathways.
- **Neutral/Surface:** A tiered system of dark greys creates depth. Surfaces that appear "closer" to the user are lighter (#1C1C1E) than the base background.
- **Status Colors:** Success uses Primary; Error uses a high-vibrancy Red (#FF3B30); Warning uses a saturated Amber (#FFCC00).

## Typography

The typographic hierarchy is built on tension between the condensed, aggressive **Archivo Narrow** for headlines and the systematic, neutral **Inter** for long-form data and instructions. 

- **Display & Headlines:** Use uppercase styling for all Display and Headline levels to maximize the "athletic" feel.
- **Data Visualization:** Use **JetBrains Mono** for numerical labels, timers, and weight inputs to ensure tabular alignment and a technical, precision-tool aesthetic.
- **Readability:** Body text maintains generous line height to ensure legibility while moving or during physical exertion.

## Layout & Spacing

This design system uses a **Fluid Grid** model based on a 4px baseline unit. 

- **Mobile Layout:** A 4-column grid with 20px side margins and 16px gutters.
- **Rhythm:** Use `lg` (24px) spacing between distinct content sections and `md` (16px) for elements within a card or group.
- **Touch Targets:** All interactive elements must maintain a minimum hit area of 44x44px, though 56px is preferred for primary exercise logging buttons to accommodate sweaty or shaking hands.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows. 

- **Level 0 (Base):** Obsidian (#0A0A0A). Used for the main app background.
- **Level 1 (Cards/Containers):** Dark Charcoal (#121212) with a 1px solid border (#2C2C2E).
- **Level 2 (Modals/Pop-overs):** Lighter Charcoal (#1C1C1E) with a subtle 10% white inner stroke to simulate a "beveled edge" of high-end equipment.
- **Interaction:** Active states do not use shadows; instead, they use a "glow" effect where the Primary color (#CCFF00) bleeds slightly behind the element using a 4px blur at 20% opacity.

## Shapes

The shape language is **Soft** but disciplined. 

- **Primary Elements:** Use a 4px (`0.25rem`) corner radius for a sharp, precision-machined look.
- **Large Cards:** Use an 8px (`0.5rem`) radius for comfort and containment.
- **Buttons:** Maintain the 4px radius; avoid pill shapes to keep the aesthetic aggressive and structural rather than "lifestyle" or "friendly."

## Components

- **Primary Action Button:** Solid Electric Lime (#CCFF00) with Black (#000000) text. Sharp 4px corners. No gradients.
- **Secondary Action Button:** Transparent background with a 2px Cobalt Blue (#2E5BFF) stroke and Blue text.
- **Input Fields:** Darker surface (#0A0A0A) with a 1px border (#2C2C2E). On focus, the border transitions to Electric Lime. Text is Inter 16px.
- **Exercise Cards:** Use Level 1 elevation. Include a vertical accent bar on the left edge (Primary for completed, Secondary for upcoming) to provide quick scannability.
- **Chips:** Small, rectangular tags with 2px radius. High-contrast background (Grey 800) with JetBrains Mono labels for metadata like "RPE" or "Tempo."
- **Progress Bars:** Thin 4px tracks. The filled portion should use a gradient from Cobalt Blue to Electric Lime to indicate "charging" or "maximum effort."
- **Celebratory Modals:** Full-screen obsidian overlay with high-motion haptics and oversized Archive Narrow "PR" typography in Electric Lime.