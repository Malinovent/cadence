import { describe, expect, it } from "vitest";
import { PALETTE } from "./constants";
import { DARK_TEXT, LIGHT_TEXT, luminance, parseDoneStyle, textOn } from "./doneStyle";

describe("how a ticked block looks", () => {
  it("is soft unless solid was chosen", () => {
    expect(parseDoneStyle("solid")).toBe("solid");
    expect(parseDoneStyle(null)).toBe("soft");
    expect(parseDoneStyle("bright")).toBe("soft");
  });
  it("reads hex colours", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000")).toBe(0);
    expect(luminance("var(--c-ink)")).toBeNull();
  });
  it("puts white text on dark fills and dark text on light ones", () => {
    expect(textOn(["#1f3a8a"])).toBe(LIGHT_TEXT);
    expect(textOn(["#f2d64b"])).toBe(DARK_TEXT);
  });
  it("picks for the worst of several colours", () => {
    expect(textOn(["#1f3a8a", "#f2d64b"])).toBe(DARK_TEXT);
  });
  it("keeps every palette colour at a readable contrast", () => {
    for (const c of PALETTE) {
      const l = luminance(c)!;
      const t = luminance(textOn([c]))!;
      expect((Math.max(l, t) + 0.05) / (Math.min(l, t) + 0.05)).toBeGreaterThan(3);
    }
  });
});
