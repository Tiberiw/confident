/**
 * Sage design tokens. The only colors the app may use.
 * Tailwind reads them through CSS variables (see tailwind.config.ts); canvas and PDF code import them directly.
 */
export const tokens = {
  brand: "#2E7D5B",
  brandHover: "#266B4D",
  brandSoft: "#E8F3ED",
  brandInk: "#22613F",
  page: "#F7F8F7",
  surface: "#FFFFFF",
  line: "#E4E7E5",
  lineStrong: "#D5DAD7",
  muted: "#5F6B66",
  ink: "#1B1F1D",
  warn: "#8A5A14",
  warnSoft: "#FBF1E3",
  danger: "#A3362B",
  dangerSoft: "#FBEAE8",
  annotPathology: "#D98A1C",
  annotTooth: "#2E7D5B",
} as const;

export type TokenName = keyof typeof tokens;
