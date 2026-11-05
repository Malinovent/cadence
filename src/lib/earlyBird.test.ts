import { describe, expect, it } from "vitest";
import { cachedEarlyBird, entitlementEmail, parseEarlyBird } from "./earlyBird";

describe("early bird", () => {
  it("reads the entitlements row", () => {
    expect(parseEarlyBird({ early_bird: true })).toBe(true);
    expect(parseEarlyBird({ early_bird: false })).toBe(false);
    expect(parseEarlyBird({ early_bird: "true" })).toBe(false);
    expect(parseEarlyBird(null)).toBe(false);
  });
  it("matches emails the way the table stores them", () => {
    expect(entitlementEmail("  Ana@Example.COM ")).toBe("ana@example.com");
    expect(cachedEarlyBird("ana@example.com", "Ana@Example.com")).toBe(true);
    expect(cachedEarlyBird("ana@example.com", "bo@example.com")).toBe(false);
    expect(cachedEarlyBird(null, "ana@example.com")).toBe(false);
    expect(cachedEarlyBird("ana@example.com", null)).toBe(false);
  });
});
