// Design system tokens for code that cannot read CSS: the browser theme color
// in app/layout.tsx and the unit tests (contrast, CSS mirror). Pure, no
// imports, so `node --test` loads it directly. The CSS source of truth is
// app/globals.css; a test keeps both equal.

export const COLORS = {
  bg: "#0a0a0b",
  surface: "#18181b",
  border: "#3f3f46", // decorative only: card outlines, dividers
  control: "#71717a", // outline of anything you tap: fields, chips, +/-
  fg: "#f4f4f5",
  muted: "#a1a1aa",
  accent: "#fbbf24",
  "accent-fg": "#0a0a0b",
  ok: "#86efac",
  warn: "#fdba74",
  danger: "#fca5a5",
} as const;

export type ColorToken = keyof typeof COLORS;

// Type scale in px at the default 16 px root. CSS uses rem, so these are the
// sizes a person sees unless the root font size changes.
export const TEXT_PX = {
  caption: 14,
  body: 16,
  subtitle: 20,
  title: 28,
  number: 36,
} as const;

// Smallest height of anything you tap, in px at the default root.
export const TAP_PX = 44;
