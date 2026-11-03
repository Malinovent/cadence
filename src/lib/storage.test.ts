import { afterEach, describe, expect, it, vi } from "vitest";
import { legacyNormalized, legacyStorage } from "./__fixtures__/legacy";
import { defaultData, normalizeData } from "./model";
import { loadData, saveData, saveKey, type StorageLike } from "./storage";

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(init)) this.map.set(k, v);
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

afterEach(() => vi.restoreAllMocks());

describe("storage", () => {
  it("loads defaults when nothing is stored", () => {
    expect(loadData(new FakeStorage())).toEqual(defaultData());
  });

  it("loads data written by the legacy app", () => {
    expect(loadData(new FakeStorage(legacyStorage))).toEqual(legacyNormalized);
  });

  it("falls back per key on unreadable values", () => {
    const s = new FakeStorage({ ...legacyStorage, "cadence:history": "{oops", "cadence:streaks": "" });
    const d = loadData(s);
    expect(d.history).toEqual([]);
    expect(d.streaks).toEqual({});
    expect(d.weeks).toEqual(legacyNormalized.weeks);
  });

  it("round trips through the five legacy keys", () => {
    const data = normalizeData(JSON.parse(JSON.stringify(legacyNormalized))).data;
    const s = new FakeStorage();
    saveData(data, s);
    expect([...s.map.keys()].sort()).toEqual([
      "cadence:cats",
      "cadence:history",
      "cadence:streaks",
      "cadence:templates",
      "cadence:weeks",
    ]);
    // legacy shapes: no schemaVersion, weeks is a bare pair of arrays
    expect(JSON.parse(s.map.get("cadence:weeks")!)).toEqual(data.weeks);
    expect(JSON.parse(s.map.get("cadence:cats")!)).toEqual(data.cats);
    expect(s.map.get("cadence:streaks")).not.toContain("schemaVersion");
    expect(loadData(s)).toEqual(data);
  });

  it("swallows storage errors like the legacy app", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => saveKey("cadence:cats", [], broken)).not.toThrow();
    expect(err).toHaveBeenCalledWith("save failed", expect.any(Error));
    expect(loadData(broken)).toEqual(defaultData());
  });
});
