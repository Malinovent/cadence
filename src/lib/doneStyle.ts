// How a ticked block looks (JP, 2026-11-08: "a setting that can toggle this solid color versus
// transparent"): "soft", the area's light tint with ink text (the default since sprint 1), or
// "solid", filled with the area's colour like its icon, with white or dark text, whichever reads.

export type DoneStyle = "soft" | "solid";
export const DONE_STYLES: readonly DoneStyle[] = ["soft", "solid"];

export const parseDoneStyle = (v: unknown): DoneStyle => (v === "solid" ? "solid" : "soft");

export const LIGHT_TEXT = "#ffffff";
export const DARK_TEXT = "#1f1a17";

/** WCAG relative luminance of "#rgb" or "#rrggbb"; null when it isn't a hex colour. */
export function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * The text colour for a block filled with these colours (one, or the blend of several): white or
 * dark, whichever keeps the better contrast against the worst of them.
 */
export function textOn(colors: readonly string[]): string {
  const lums = colors.map(luminance).filter((l): l is number => l !== null);
  if (!lums.length) return DARK_TEXT;
  const white = luminance(LIGHT_TEXT)!;
  const dark = luminance(DARK_TEXT)!;
  const worst = (text: number) => Math.min(...lums.map((l) => contrast(l, text)));
  return worst(white) >= worst(dark) ? LIGHT_TEXT : DARK_TEXT;
}
