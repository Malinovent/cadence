import { describe, expect, it } from "vitest";
import { PALETTES, paletteVars, parseTheme, resolveTheme } from "./theme";

// WCAG contrast ratio between two #rrggbb colours
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("themes", () => {
  it("stay on paper unless chosen, and follow the device when asked", () => {
    expect(parseTheme(null)).toBe("paper");
    expect(parseTheme("neon")).toBe("paper");
    expect(parseTheme("night")).toBe("night");
    expect(resolveTheme("device", true)).toBe("night");
    expect(resolveTheme("device", false)).toBe("paper");
    expect(resolveTheme("contrast", true)).toBe("contrast");
  });
  it("keep paper exactly as it was", () => {
    expect(PALETTES.paper.ink).toBe("#2b2622");
    expect(PALETTES.paper.paper).toBe("#f4ede1");
  });
  it("read clearly: text at least 4.5:1 on the page and on cards, 7:1 in high contrast", () => {
    for (const [name, p] of Object.entries(PALETTES)) {
      const min = name === "contrast" ? 7 : 4.5;
      for (const bg of [p.paper, p.card]) {
        expect(ratio(p.ink, bg)).toBeGreaterThanOrEqual(min);
        expect(ratio(p.soft, bg)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(p.muted, bg)).toBeGreaterThanOrEqual(name === "paper" ? 4 : 4.5);
      }
    }
  });
  it("write CSS variables", () => {
    expect(paletteVars(PALETTES.paper)).toContain("--c-ink: #2b2622;");
  });
});
