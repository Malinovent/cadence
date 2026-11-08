import { describe, expect, it } from "vitest";
import { blendGradient } from "./blend";

describe("blendGradient", () => {
  it("spreads two colours from 15% to 85%", () => {
    expect(blendGradient(["#111", "#222"])).toBe("linear-gradient(135deg, #111 15%, #222 85%)");
  });
  it("puts a middle colour at 50%", () => {
    expect(blendGradient(["#111", "#222", "#333"])).toBe("linear-gradient(135deg, #111 15%, #222 50%, #333 85%)");
  });
});
