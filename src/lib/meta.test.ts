import { describe, expect, it, vi } from "vitest";
import { defaultMeta, isDirty, loadMeta, META_KEY, nextEditTime, normalizeMeta, saveMeta } from "./meta";
import type { StorageLike } from "./storage";

const mem = (init: Record<string, string> = {}): StorageLike & { map: Map<string, string> } => {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe("meta", () => {
  it("defaults: never edited, never synced, no user", () => {
    expect(defaultMeta()).toEqual({ updatedAt: 0, syncedAt: null, userId: null });
    expect(loadMeta(mem())).toEqual(defaultMeta());
  });

  it("round-trips through storage under cadence:meta", () => {
    const s = mem();
    const m = { updatedAt: 1700000000123, syncedAt: 1700000000000, userId: "u1" };
    saveMeta(m, s);
    expect(JSON.parse(s.map.get(META_KEY)!)).toEqual(m);
    expect(loadMeta(s)).toEqual(m);
  });

  it("falls back to defaults on unreadable or malformed values", () => {
    expect(loadMeta(mem({ [META_KEY]: "{not json" }))).toEqual(defaultMeta());
    expect(loadMeta(mem({ [META_KEY]: "[1,2]" }))).toEqual(defaultMeta());
    expect(normalizeMeta({ updatedAt: "5", syncedAt: Infinity, userId: "" })).toEqual(defaultMeta());
    expect(normalizeMeta({ updatedAt: -3, syncedAt: 4, userId: 7 })).toEqual({ updatedAt: 0, syncedAt: 4, userId: null });
  });

  it("does not throw when storage fails", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadMeta(bad)).toEqual(defaultMeta());
    expect(() => saveMeta(defaultMeta(), bad)).not.toThrow();
    err.mockRestore();
  });

  it("isDirty is syncedAt !== updatedAt", () => {
    expect(isDirty({ updatedAt: 0, syncedAt: null, userId: null })).toBe(true);
    expect(isDirty({ updatedAt: 5, syncedAt: 5, userId: "u" })).toBe(false);
    expect(isDirty({ updatedAt: 6, syncedAt: 5, userId: "u" })).toBe(true);
  });

  it("nextEditTime is now, but always after the previous edit", () => {
    expect(nextEditTime({ updatedAt: 100, syncedAt: null, userId: null }, 500)).toBe(500);
    // previous stamp came from a device whose clock runs ahead
    expect(nextEditTime({ updatedAt: 900, syncedAt: 900, userId: "u" }, 500)).toBe(901);
  });
});
