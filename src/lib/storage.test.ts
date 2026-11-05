import { afterEach, describe, expect, it, vi } from "vitest";
import { legacyNormalized, legacyStorage } from "./__fixtures__/legacy";
import { defaultData, normalizeData } from "./model";
import { parseImport } from "./transfer";
import { loadData, needsGuardrailMigration, PREMIGRATION_KEYS, saveData, saveKey, type StorageLike } from "./storage";

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
      "cadence:tasks",
      "cadence:templates",
      "cadence:weeks",
    ]);
    // legacy shapes: no schemaVersion, weeks is a bare pair of arrays
    expect(JSON.parse(s.map.get("cadence:weeks")!)).toEqual(data.weeks);
    expect(JSON.parse(s.map.get("cadence:cats")!)).toEqual(data.cats);
    expect(s.map.get("cadence:streaks")).not.toContain("schemaVersion");
    expect(loadData(s)).toEqual(data);
  });

  it("round trips tasks through cadence:tasks", () => {
    const tasks = [
      { id: "t1", name: "Call mum", catId: "learn", estMins: 30, done: false, order: 0, createdAt: 10 },
      { id: "t2", name: "Buy milk", catId: null, done: true, doneAt: 25, order: 1, createdAt: 20 },
    ];
    const s = new FakeStorage();
    saveData({ ...defaultData(), tasks }, s);
    expect(JSON.parse(s.map.get("cadence:tasks")!)).toEqual(tasks);
    expect(loadData(s).tasks).toEqual(tasks);
  });

  it("loads legacy keys without cadence:tasks as an empty task list", () => {
    expect("cadence:tasks" in legacyStorage).toBe(false);
    expect(loadData(new FakeStorage(legacyStorage)).tasks).toEqual([]);
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

  describe("pre-migration copy (S1.2 guardrails)", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    it("keeps an untouched copy of data saved before guardrails, once", () => {
      const s = new FakeStorage(legacyStorage);
      loadData(s, now);
      const copy = s.getItem(PREMIGRATION_KEYS.guardrails);
      expect(copy).not.toBeNull();
      const env = JSON.parse(copy!);
      expect(env.exportedAt).toBe("2026-11-20T12:00:00.000Z");
      expect(env.data.cats).toEqual(JSON.parse(legacyStorage["cadence:cats"])); // the old shape, unchanged
      // it imports like any backup, and gives back the same data
      const back = parseImport(copy!);
      expect(back.ok && back.data).toEqual(legacyNormalized);
      // a later load never overwrites it
      loadData(s, new Date("2027-01-01T00:00:00Z"));
      expect(s.getItem(PREMIGRATION_KEYS.guardrails)).toBe(copy);
    });
    it("makes no copy for new users or already-migrated data", () => {
      const fresh = new FakeStorage();
      loadData(fresh, now);
      expect(fresh.getItem(PREMIGRATION_KEYS.guardrails)).toBeNull();
      const migrated = new FakeStorage();
      saveData(loadData(new FakeStorage(legacyStorage), now), migrated);
      loadData(migrated, now);
      expect(migrated.getItem(PREMIGRATION_KEYS.guardrails)).toBeNull();
    });
    it("detects old categories", () => {
      expect(needsGuardrailMigration([{ id: "a" }])).toBe(true);
      expect(needsGuardrailMigration([{ id: "a", limit: { kind: "floor", min: 0 } }])).toBe(false);
      expect(needsGuardrailMigration(null)).toBe(false);
    });
  });
});
