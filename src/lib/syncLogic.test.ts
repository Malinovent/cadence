import { describe, expect, it } from "vitest";
import * as A from "./actions";
import * as T from "./tasks";
import type { SyncMeta } from "./meta";
import { defaultData, normalizeData, type CadenceData } from "./model";
import {
  contentEqual,
  decideAfterPull,
  decideAfterPush,
  isEmptyData,
  isFirstSignIn,
  jsonEqual,
  winningUpdatedAt,
  type ServerRow,
} from "./syncLogic";

const U = "user-1";
const meta = (updatedAt: number, syncedAt: number | null = null, userId: string | null = U): SyncMeta => ({
  updatedAt,
  syncedAt,
  userId,
});
const withBlock = (d: CadenceData = defaultData(), id = "b1"): CadenceData =>
  A.placeBlock(d, 0, "work", 1, 9 * 60, undefined, { uid: () => id });
const row = (data: CadenceData, updatedAt: number): ServerRow => ({ data, updatedAt });

// what a jsonb round trip does: object keys come back in a different order
const reorderKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(reorderKeys);
  if (typeof v === "object" && v !== null)
    return Object.fromEntries(
      Object.entries(v)
        .reverse()
        .map(([k, x]) => [k, reorderKeys(x)]),
    );
  return v;
};

describe("jsonEqual / contentEqual", () => {
  it("ignores object key order but not array order", () => {
    expect(jsonEqual({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
    expect(jsonEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(jsonEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(jsonEqual(null, {})).toBe(false);
    expect(jsonEqual([], {})).toBe(false);
    expect(jsonEqual("1", 1)).toBe(false);
  });

  it("treats a jsonb round trip of the same schedule as equal", () => {
    const local = A.toggleDone(withBlock(), 0, "b1", { now: () => 1000 });
    const pulled = normalizeData(reorderKeys(JSON.parse(JSON.stringify(local)))).data;
    expect(contentEqual(local, pulled)).toBe(true);
    expect(contentEqual(local, withBlock())).toBe(false);
  });

  it("compares tasks too", () => {
    const d = defaultData();
    const t = T.addTask(d, "Buy milk", {}, { uid: () => "t", now: () => 1 });
    expect(contentEqual(d, t)).toBe(false);
    expect(contentEqual(t, T.toggleTask(t, "t"))).toBe(false);
    expect(contentEqual(t, normalizeData(reorderKeys(JSON.parse(JSON.stringify(t)))).data)).toBe(true);
  });

  it("ignores schemaVersion", () => {
    const d = defaultData();
    expect(contentEqual(d, { ...d, schemaVersion: 3 as 2 })).toBe(true);
  });
});

describe("isEmptyData", () => {
  it("is true for defaults, even after a jsonb round trip", () => {
    expect(isEmptyData(defaultData())).toBe(true);
    expect(isEmptyData(normalizeData(reorderKeys(defaultData())).data)).toBe(true);
  });

  it("is false once anything worth keeping exists", () => {
    const d = defaultData();
    expect(isEmptyData(withBlock())).toBe(false);
    expect(isEmptyData({ ...d, weeks: [[], withBlock().weeks[0]] })).toBe(false);
    expect(isEmptyData({ ...d, templates: [{ id: "t", name: "T", blocks: [] }] })).toBe(false);
    expect(isEmptyData({ ...d, history: [{ id: "b", catId: "work", mins: 60, date: 1 }] })).toBe(false);
    expect(isEmptyData({ ...d, streaks: { work: { count: 1 } } })).toBe(false);
    expect(isEmptyData(T.addTask(d, "Buy milk", {}, { uid: () => "t", now: () => 1 }))).toBe(false);
    expect(isEmptyData(A.updateCat(d, "work", { limit: { kind: "floor", min: 600 } }))).toBe(false);
    expect(isEmptyData(A.addCat(d, { uid: () => "c" }))).toBe(false);
  });
});

describe("decideAfterPull — same user as last sync", () => {
  const local = withBlock();

  it("no row → push local (first upload)", () => {
    expect(decideAfterPull(local, meta(500), null, U)).toEqual({ kind: "push", updatedAt: 500 });
  });

  it("server newer → apply server", () => {
    const r = row(defaultData(), 600);
    expect(decideAfterPull(local, meta(500, 500), r, U)).toEqual({ kind: "apply", row: r });
  });

  it("server newer wins even over unsynced local edits (last write wins)", () => {
    const r = row(defaultData(), 600);
    expect(decideAfterPull(local, meta(550, 500), r, U).kind).toBe("apply");
  });

  it("server older → push", () => {
    expect(decideAfterPull(local, meta(700, 500), row(defaultData(), 600), U)).toEqual({ kind: "push", updatedAt: 700 });
  });

  it("clock-equal → mark synced", () => {
    expect(decideAfterPull(local, meta(600, null), row(local, 600), U)).toEqual({ kind: "markSynced", updatedAt: 600 });
  });

  it("clock-equal with different content still marks synced (times are the identity)", () => {
    expect(decideAfterPull(local, meta(600, 600), row(defaultData(), 600), U).kind).toBe("markSynced");
  });
});

describe("decideAfterPull — first sign-in on this device", () => {
  it("no row → push local", () => {
    expect(decideAfterPull(withBlock(), meta(500, null, null), null, U)).toEqual({ kind: "push", updatedAt: 500 });
  });

  it("empty local → apply server silently, even if the server copy is older", () => {
    const r = row(withBlock(), 100);
    expect(decideAfterPull(defaultData(), meta(900, null, null), r, U)).toEqual({ kind: "apply", row: r });
  });

  it("same content → mark synced at the server's time", () => {
    const local = withBlock();
    const r = row(normalizeData(reorderKeys(local)).data, 300);
    expect(decideAfterPull(local, meta(900, null, null), r, U)).toEqual({ kind: "markSynced", updatedAt: 300 });
  });

  it("different content on both sides → conflict, whichever is newer", () => {
    const server = row(withBlock(defaultData(), "other"), 100);
    const local = A.toggleDone(withBlock(), 0, "b1", { now: () => 1 });
    expect(decideAfterPull(local, meta(900, null, null), server, U)).toEqual({ kind: "conflict", server });
    expect(decideAfterPull(local, meta(50, null, null), server, U)).toEqual({ kind: "conflict", server });
  });

  it("empty server copy → keep local, stamped later than the server", () => {
    const r = row(defaultData(), 2000);
    expect(decideAfterPull(withBlock(), meta(900, null, null), r, U)).toEqual({ kind: "push", updatedAt: 2001 });
    expect(decideAfterPull(withBlock(), meta(5000, null, null), r, U)).toEqual({ kind: "push", updatedAt: 5000 });
  });

  it("signing in as a different user than last time is a first sign-in", () => {
    const server = row(withBlock(defaultData(), "theirs"), 100);
    const local = A.toggleDone(withBlock(), 0, "b1", { now: () => 1 });
    expect(isFirstSignIn(meta(1, 1, "someone-else"), U)).toBe(true);
    expect(isFirstSignIn(meta(1, 1, U), U)).toBe(false);
    // timestamps alone would say "push"; the user switch makes it a conflict
    expect(decideAfterPull(local, meta(900, 900, "someone-else"), server, U)).toEqual({ kind: "conflict", server });
    expect(decideAfterPull(defaultData(), meta(900, 900, "someone-else"), server, U).kind).toBe("apply");
  });
});

describe("decideAfterPush", () => {
  it("returned time equals ours → synced", () => {
    expect(decideAfterPush(meta(500), 500, row(defaultData(), 500))).toEqual({ kind: "synced", syncedAt: 500 });
  });

  it("synced reports the pushed time even if we edited during the push", () => {
    expect(decideAfterPush(meta(800), 500, row(defaultData(), 500))).toEqual({ kind: "synced", syncedAt: 500 });
  });

  it("server newer → apply the returned copy (we lost)", () => {
    const r = row(withBlock(), 700);
    expect(decideAfterPush(meta(500), 500, r)).toEqual({ kind: "apply", row: r });
    expect(decideAfterPush(meta(700), 500, r)).toEqual({ kind: "apply", row: r }); // edit no later than the server's
  });

  it("server newer than what we sent, but we edited again later still → push again", () => {
    expect(decideAfterPush(meta(900), 500, row(withBlock(), 700))).toEqual({ kind: "push" });
  });

  it("server older than what we sent → invalid", () => {
    expect(decideAfterPush(meta(500), 500, row(defaultData(), 400))).toEqual({ kind: "invalid" });
  });
});

describe("winningUpdatedAt", () => {
  it("beats the server copy and never goes backwards", () => {
    expect(winningUpdatedAt(meta(100), row(defaultData(), 500))).toBe(501);
    expect(winningUpdatedAt(meta(900), row(defaultData(), 500))).toBe(900);
    expect(winningUpdatedAt(meta(100), row(defaultData(), 500), 2000)).toBe(2000);
  });
});
