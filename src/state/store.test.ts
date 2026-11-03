import { describe, expect, it } from "vitest";
import * as A from "../lib/actions";
import { META_KEY } from "../lib/meta";
import { defaultData } from "../lib/model";
import { STORAGE_KEYS, type StorageLike } from "../lib/storage";
import { createCadenceStore } from "./store";

const mem = (init: Record<string, string> = {}) => {
  const map = new Map(Object.entries(init));
  const writes: string[] = [];
  const storage: StorageLike = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      map.set(k, v);
    },
  };
  return { map, writes, storage };
};

describe("cadence store", () => {
  it("loads data and meta without writing anything", () => {
    const s = mem({ [META_KEY]: JSON.stringify({ updatedAt: 10, syncedAt: 10, userId: "u" }) });
    const store = createCadenceStore({ storage: s.storage });
    expect(store.getSnapshot().data).toEqual(defaultData());
    expect(store.getSnapshot().meta).toEqual({ updatedAt: 10, syncedAt: 10, userId: "u" });
    expect(s.writes).toEqual([]);
  });

  it("a user edit bumps updatedAt once and saves only the changed key plus meta", () => {
    const s = mem();
    let t = 1000;
    const store = createCadenceStore({ storage: s.storage, now: () => t });
    let calls = 0;
    store.subscribe(() => calls++);
    store.edit((d) => A.placeBlock(d, 0, "work", 0, 9 * 60));
    expect(store.getSnapshot().meta.updatedAt).toBe(1000);
    expect(s.writes.sort()).toEqual([META_KEY, STORAGE_KEYS.weeks].sort());
    expect(calls).toBe(1);
    t = 2000;
    store.edit((d) => A.advanceWeek(d));
    expect(store.getSnapshot().meta.updatedAt).toBe(2000);
  });

  it("a no-op action is not an edit", () => {
    const s = mem();
    const store = createCadenceStore({ storage: s.storage, now: () => 5 });
    const before = store.getSnapshot();
    store.edit((d) => A.moveBlock(d, 0, "missing", 0, 0));
    expect(store.getSnapshot()).toBe(before);
    expect(s.writes).toEqual([]);
  });

  it("edits stay monotonic after applying a copy stamped in the future", () => {
    const s = mem();
    const store = createCadenceStore({ storage: s.storage, now: () => 100 });
    store.applyRemote(defaultData(), 5000, "u");
    store.edit((d) => A.addCat(d));
    expect(store.getSnapshot().meta.updatedAt).toBe(5001);
  });

  it("applyRemote replaces data without counting as an edit", () => {
    const s = mem();
    const store = createCadenceStore({ storage: s.storage, now: () => 999999 });
    const remote = A.placeBlock(defaultData(), 1, "learn", 2, 10 * 60, undefined, { uid: () => "b1" });
    store.applyRemote(remote, 4242, "user-1");
    expect(store.getSnapshot().data).toBe(remote);
    expect(store.getSnapshot().meta).toEqual({ updatedAt: 4242, syncedAt: 4242, userId: "user-1" });
    expect(JSON.parse(s.map.get(STORAGE_KEYS.weeks)!)).toEqual(remote.weeks);
    // legacy shape: no schemaVersion written anywhere
    expect([...s.map.keys()].sort()).toEqual(
      [META_KEY, ...Object.values(STORAGE_KEYS)].sort(),
    );
  });

  it("setMeta never touches data and skips identical meta", () => {
    const s = mem();
    const store = createCadenceStore({ storage: s.storage });
    const data = store.getSnapshot().data;
    store.setMeta((m) => ({ ...m }));
    expect(s.writes).toEqual([]);
    store.setMeta((m) => ({ ...m, syncedAt: 0 }));
    expect(store.getSnapshot().data).toBe(data);
    expect(store.getSnapshot().meta.syncedAt).toBe(0);
    expect(s.writes).toEqual([META_KEY]);
  });
});
