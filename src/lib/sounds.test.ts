import { describe, expect, it } from "vitest";
import { DEFAULT_VOLUME, gainAt, parseVolume, SOUNDS, soundLength, type SoundName } from "./sounds";

describe("the volume", () => {
  it("reads 0–100, half by default, and scales each tone", () => {
    expect(parseVolume(null)).toBe(DEFAULT_VOLUME);
    expect(parseVolume("80")).toBe(80);
    expect(parseVolume("140")).toBe(100);
    expect(parseVolume("-3")).toBe(0);
    expect(parseVolume("loud")).toBe(DEFAULT_VOLUME);
    expect(gainAt(0.1, 50)).toBeCloseTo(0.1);
    expect(gainAt(0.1, 100)).toBeCloseTo(0.2);
    expect(gainAt(0.1, 0)).toBe(0);
  });
});

describe("sounds", () => {
  const all = Object.entries(SOUNDS) as [SoundName, (typeof SOUNDS)[SoundName]][];
  it("are short: a tap under a fifth of a second, the longest under a second", () => {
    expect(soundLength(SOUNDS.place)).toBeLessThanOrEqual(200);
    for (const [, tones] of all) expect(soundLength(tones)).toBeLessThan(1000);
  });
  it("are quiet, and pitched where they're pleasant to hear", () => {
    for (const [, tones] of all)
      for (const t of tones) {
        expect(t.gain).toBeGreaterThan(0);
        expect(t.gain).toBeLessThanOrEqual(0.12);
        for (const f of [t.freq, t.to ?? t.freq]) {
          expect(f).toBeGreaterThanOrEqual(100);
          expect(f).toBeLessThanOrEqual(2000);
        }
      }
  });
  it("say done going up and not done going down", () => {
    const tick = SOUNDS.tick;
    expect(tick[tick.length - 1].freq).toBeGreaterThan(tick[0].freq);
    const un = SOUNDS.untick[0];
    expect(un.to!).toBeLessThan(un.freq);
  });
});
