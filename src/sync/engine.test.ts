import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as A from "../lib/actions";
import { META_KEY } from "../lib/meta";
import { defaultData, type CadenceData } from "../lib/model";
import type { StorageLike } from "../lib/storage";
import { createCadenceStore, type CadenceStore } from "../state/store";
import { createSyncEngine, SyncError, type RawRow, type SyncClient, type SyncEngine, type SyncSession } from "./engine";

const U1: SyncSession = { userId: "user-1", email: "me@example.com" };
const U2: SyncSession = { userId: "user-2", email: "other@example.com" };
const REDIRECT = "https://example.test/cadence/";

const memStorage = (init: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(init));
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

const withBlock = (d: CadenceData = defaultData(), id = "b1", day = 1): CadenceData =>
  A.placeBlock(d, 0, "work", day, 9 * 60, undefined, { uid: () => id });

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// In-memory backend with the same last-write-wins rule as push_state in supabase/schema.sql.
class FakeBackend implements SyncClient {
  rows = new Map<string, RawRow>();
  session: SyncSession | null = null;
  online = true;
  failWith: SyncError | null = null; // next network calls throw this
  holdPush = false; // pushes wait until release()
  pushes: { data: CadenceData; updatedAt: number }[] = [];
  pulls = 0;
  inFlight = 0;
  maxInFlight = 0;
  sentCodes: { email: string; redirectTo: string }[] = [];
  private authCbs = new Set<(s: SyncSession | null) => void>();
  private held: (() => void)[] = [];

  release() {
    const h = this.held;
    this.held = [];
    h.forEach((f) => f());
  }
  emitAuth(s: SyncSession | null) {
    this.session = s;
    this.authCbs.forEach((cb) => cb(s));
  }
  private check() {
    if (!this.online) throw new SyncError("network", "Failed to fetch");
    if (this.failWith) throw this.failWith;
  }

  async getSession() {
    return this.session;
  }
  onAuthChange(cb: (s: SyncSession | null) => void) {
    this.authCbs.add(cb);
    return () => void this.authCbs.delete(cb);
  }
  async sendCode(email: string, redirectTo: string) {
    this.check();
    this.sentCodes.push({ email, redirectTo });
  }
  async verifyCode(email: string, code: string) {
    this.check();
    if (code !== "123456") throw new SyncError("invalid_code", "Token has expired or is invalid");
    const s = email === U2.email ? U2 : U1;
    this.session = s;
    return s;
  }
  async signOut() {
    this.emitAuth(null);
  }
  async pull(userId: string) {
    this.pulls++;
    await Promise.resolve();
    this.check();
    const r = this.rows.get(userId);
    return r ? clone(r) : null;
  }
  async push(data: CadenceData, updatedAt: number) {
    this.inFlight++;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      if (this.holdPush) await new Promise<void>((res) => this.held.push(res));
      else await Promise.resolve();
      this.check();
      this.pushes.push({ data: clone(data), updatedAt });
      const uid = this.session!.userId;
      const cur = this.rows.get(uid);
      if (!cur || cur.updatedAt < updatedAt) this.rows.set(uid, { data: clone(data), updatedAt });
      return clone(this.rows.get(uid)!);
    } finally {
      this.inFlight--;
    }
  }
}

let backend: FakeBackend;
let store: CadenceStore;
let engine: SyncEngine;
let clock: number;
let online: boolean;

const setup = (opts: { local?: CadenceData; meta?: object; session?: SyncSession | null } = {}) => {
  const init: Record<string, string> = {};
  if (opts.local) {
    for (const k of ["cats", "weeks", "templates", "history", "streaks"] as const)
      init[`cadence:${k}`] = JSON.stringify(opts.local[k]);
  }
  if (opts.meta) init[META_KEY] = JSON.stringify(opts.meta);
  store = createCadenceStore({ storage: memStorage(init), now: () => clock });
  backend.session = opts.session === undefined ? U1 : opts.session;
  engine = createSyncEngine({
    client: backend,
    store,
    redirectTo: REDIRECT,
    now: () => clock,
    isOnline: () => online,
  });
  engine.start();
};

const flush = () => vi.advanceTimersByTimeAsync(0);
const edit = (fn: (d: CadenceData) => CadenceData) => {
  clock += 1000;
  store.edit(fn);
};

beforeEach(() => {
  vi.useFakeTimers();
  backend = new FakeBackend();
  clock = 1_000_000;
  online = true;
});
afterEach(() => {
  engine?.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sync engine: launch", () => {
  it("signed out: local only, nothing is sent", async () => {
    setup({ session: null });
    await flush();
    expect(engine.getState()).toMatchObject({ configured: true, ready: true, session: null, status: "local" });
    edit((d) => withBlock(d));
    await vi.advanceTimersByTimeAsync(5000);
    expect(backend.pulls).toBe(0);
    expect(backend.pushes).toHaveLength(0);
  });

  it("restores the session, pulls, and uploads local when the account has no row", async () => {
    setup({ local: withBlock(), meta: { updatedAt: 500, syncedAt: null, userId: null } });
    await flush();
    expect(backend.pulls).toBe(1);
    expect(backend.pushes).toHaveLength(1);
    expect(backend.rows.get(U1.userId)!.updatedAt).toBe(500);
    expect(store.getSnapshot().meta).toEqual({ updatedAt: 500, syncedAt: 500, userId: U1.userId });
    expect(engine.getState()).toMatchObject({ ready: true, session: U1, status: "synced", conflict: null });
  });

  it("applies a newer server copy on launch without counting it as an edit", async () => {
    const server = withBlock(defaultData(), "srv");
    backend.rows.set(U1.userId, { data: clone(server), updatedAt: 9_000_000 });
    setup({ local: withBlock(), meta: { updatedAt: 500, syncedAt: 500, userId: U1.userId } });
    await flush();
    expect(store.getSnapshot().data.weeks[0].map((b) => b.id)).toEqual(["srv"]);
    expect(store.getSnapshot().meta).toEqual({ updatedAt: 9_000_000, syncedAt: 9_000_000, userId: U1.userId });
    expect(backend.pushes).toHaveLength(0);
    expect(engine.getState().status).toBe("synced");
  });

  it("first sign-in with an empty device takes the account's schedule silently", async () => {
    backend.rows.set(U1.userId, { data: clone(withBlock(defaultData(), "srv")), updatedAt: 10 });
    setup();
    await flush();
    expect(store.getSnapshot().data.weeks[0].map((b) => b.id)).toEqual(["srv"]);
    expect(engine.getState().conflict).toBeNull();
    expect(backend.pushes).toHaveLength(0);
  });
});

describe("sync engine: pushing edits", () => {
  const synced = async () => {
    backend.rows.set(U1.userId, { data: clone(defaultData()), updatedAt: 500 });
    setup({ meta: { updatedAt: 500, syncedAt: 500, userId: U1.userId } });
    await flush();
    expect(engine.getState().status).toBe("synced");
  };

  it("debounces 1.5s after the last edit and sends the latest copy once", async () => {
    await synced();
    edit((d) => withBlock(d, "a", 0));
    expect(engine.getState().status).toBe("syncing");
    await vi.advanceTimersByTimeAsync(1000);
    edit((d) => withBlock(d, "b", 2));
    await vi.advanceTimersByTimeAsync(1499);
    expect(backend.pushes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(backend.pushes).toHaveLength(1);
    expect(backend.pushes[0].data.weeks[0].map((b) => b.id)).toEqual(["a", "b"]);
    expect(backend.pushes[0].updatedAt).toBe(clock);
    expect(store.getSnapshot().meta.syncedAt).toBe(clock);
    expect(engine.getState().status).toBe("synced");
  });

  it("does not push a no-op action", async () => {
    await synced();
    store.edit((d) => A.moveBlock(d, 0, "missing", 0, 0));
    await vi.advanceTimersByTimeAsync(3000);
    expect(backend.pushes).toHaveLength(0);
  });

  it("never runs two pushes at once; edits during a push are sent right after", async () => {
    await synced();
    backend.holdPush = true;
    edit((d) => withBlock(d, "a", 0));
    await vi.advanceTimersByTimeAsync(1500);
    expect(backend.inFlight).toBe(1);
    edit((d) => withBlock(d, "b", 2));
    await vi.advanceTimersByTimeAsync(1500);
    edit((d) => withBlock(d, "c", 3));
    await vi.advanceTimersByTimeAsync(1500);
    expect(backend.inFlight).toBe(1); // still only the first
    backend.holdPush = false;
    backend.release();
    await flush();
    await vi.advanceTimersByTimeAsync(1500);
    expect(backend.maxInFlight).toBe(1);
    expect(backend.pushes).toHaveLength(2); // coalesced: a, then a+b+c
    expect(backend.pushes[1].data.weeks[0].map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(store.getSnapshot().meta.syncedAt).toBe(store.getSnapshot().meta.updatedAt);
    expect(engine.getState().status).toBe("synced");
  });

  it("losing last-write-wins applies the server's newer copy", async () => {
    await synced();
    edit((d) => withBlock(d, "mine", 0));
    // meanwhile another device wrote a later copy
    backend.rows.set(U1.userId, { data: clone(withBlock(defaultData(), "theirs", 4)), updatedAt: clock + 60_000 });
    await vi.advanceTimersByTimeAsync(1500);
    await flush();
    expect(backend.pushes).toHaveLength(1);
    expect(store.getSnapshot().data.weeks[0].map((b) => b.id)).toEqual(["theirs"]);
    expect(store.getSnapshot().meta).toMatchObject({ updatedAt: clock + 60_000, syncedAt: clock + 60_000 });
    expect(engine.getState().status).toBe("synced");
    // the next edit beats that copy even though the local clock is behind it
    edit((d) => withBlock(d, "after", 5));
    await vi.advanceTimersByTimeAsync(1500);
    await flush();
    expect(backend.rows.get(U1.userId)!.data).toMatchObject({ weeks: [expect.arrayContaining([expect.objectContaining({ id: "after" })]), []] });
  });

  it("offline: keeps edits local, shows offline, then syncs on online", async () => {
    await synced();
    online = false;
    engine.onOffline();
    expect(engine.getState().status).toBe("offline");
    edit((d) => withBlock(d, "a", 0));
    await vi.advanceTimersByTimeAsync(1500);
    expect(backend.pushes).toHaveLength(0);
    expect(engine.getState().status).toBe("offline");
    expect(store.getSnapshot().data.weeks[0]).toHaveLength(1);
    online = true;
    engine.onOnline();
    await flush();
    expect(backend.pushes).toHaveLength(1);
    expect(engine.getState().status).toBe("synced");
  });

  it("a failed fetch while the browser says online → offline; a server error → error; both retry", async () => {
    await synced();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    backend.failWith = new SyncError("network", "Failed to fetch");
    edit((d) => withBlock(d, "a", 0));
    await vi.advanceTimersByTimeAsync(1500);
    expect(engine.getState().status).toBe("offline");
    backend.failWith = new SyncError("failed", "500");
    engine.onVisible();
    await flush();
    expect(engine.getState().status).toBe("error");
    expect(store.getSnapshot().data.weeks[0]).toHaveLength(1); // never lose local edits
    backend.failWith = null;
    edit((d) => withBlock(d, "b", 2)); // the next edit retries
    await vi.advanceTimersByTimeAsync(1500);
    await flush();
    expect(engine.getState().status).toBe("synced");
    expect(backend.rows.get(U1.userId)!.data).toMatchObject({ weeks: [[{ id: "a" }, { id: "b" }], []] });
  });

  it("pulls on visibility and applies what another device saved", async () => {
    await synced();
    backend.rows.set(U1.userId, { data: clone(withBlock(defaultData(), "phone")), updatedAt: 700 });
    engine.onVisible();
    await flush();
    expect(store.getSnapshot().data.weeks[0].map((b) => b.id)).toEqual(["phone"]);
  });

  it("coalesces pull triggers that arrive while busy", async () => {
    await synced();
    const before = backend.pulls;
    engine.onVisible();
    engine.onOnline();
    engine.onVisible();
    await flush();
    expect(backend.pulls - before).toBe(2); // the running one + one queued
  });
});

describe("sync engine: first sign-in conflict", () => {
  const conflicted = async () => {
    backend.rows.set(U1.userId, { data: clone(withBlock(defaultData(), "srv", 4)), updatedAt: 800 });
    setup({ local: withBlock(defaultData(), "loc", 0), meta: { updatedAt: 900, syncedAt: null, userId: null } });
    await flush();
  };

  it("asks with both summaries and blocks push/pull until resolved", async () => {
    await conflicted();
    const st = engine.getState();
    expect(st.conflict).toEqual({
      local: { categories: 4, blocks: 1, templates: 0, sessions: 0, streaks: 0 },
      server: { categories: 4, blocks: 1, templates: 0, sessions: 0, streaks: 0 },
    });
    const pulls = backend.pulls;
    edit((d) => withBlock(d, "loc2", 2));
    expect(engine.getState().conflict!.local.blocks).toBe(2); // summary follows local edits
    await vi.advanceTimersByTimeAsync(5000);
    engine.onVisible();
    engine.onOnline();
    await flush();
    expect(backend.pushes).toHaveLength(0);
    expect(backend.pulls).toBe(pulls);
    expect(store.getSnapshot().meta.userId).toBeNull();
  });

  it("keep this device's: pushes local and wins even though the server copy was newer", async () => {
    backend.rows.set(U1.userId, { data: clone(withBlock(defaultData(), "srv", 4)), updatedAt: 5_000_000 });
    setup({ local: withBlock(defaultData(), "loc", 0), meta: { updatedAt: 900, syncedAt: null, userId: null } });
    await flush();
    expect(engine.getState().conflict).not.toBeNull();
    engine.resolveConflict("local");
    await flush();
    expect(backend.pushes).toHaveLength(1);
    expect(backend.rows.get(U1.userId)!.data).toMatchObject({ weeks: [[{ id: "loc" }], []] });
    expect(store.getSnapshot().meta).toMatchObject({ userId: U1.userId, syncedAt: 5_000_001 });
    expect(engine.getState()).toMatchObject({ conflict: null, status: "synced" });
  });

  it("use my account's: replaces local with the server copy", async () => {
    await conflicted();
    engine.resolveConflict("server");
    await flush();
    expect(store.getSnapshot().data.weeks[0].map((b) => b.id)).toEqual(["srv"]);
    expect(store.getSnapshot().meta).toEqual({ updatedAt: 800, syncedAt: 800, userId: U1.userId });
    expect(backend.pushes).toHaveLength(0);
    expect(engine.getState()).toMatchObject({ conflict: null, status: "synced" });
  });

  it("an empty account copy (another device's untouched defaults) is overwritten without asking", async () => {
    backend.rows.set(U1.userId, { data: clone(defaultData()), updatedAt: 5_000_000 });
    setup({ local: withBlock(), meta: { updatedAt: 900, syncedAt: null, userId: null } });
    await flush();
    expect(engine.getState().conflict).toBeNull();
    expect(backend.rows.get(U1.userId)!.data).toMatchObject({ weeks: [[{ id: "b1" }], []] });
    expect(store.getSnapshot().meta.userId).toBe(U1.userId);
  });

  it("identical content on both sides just marks synced", async () => {
    backend.rows.set(U1.userId, { data: clone(withBlock()), updatedAt: 300 });
    setup({ local: withBlock(), meta: { updatedAt: 900, syncedAt: null, userId: null } });
    await flush();
    expect(engine.getState()).toMatchObject({ conflict: null, status: "synced" });
    expect(store.getSnapshot().meta).toEqual({ updatedAt: 300, syncedAt: 300, userId: U1.userId });
    expect(backend.pushes).toHaveLength(0);
  });
});

describe("sync engine: auth", () => {
  it("sendCode passes the redirect URL; verifyCode signs in and pulls", async () => {
    setup({ session: null, local: withBlock() });
    await flush();
    expect(await engine.sendCode("  me@example.com ")).toEqual({ ok: true });
    expect(backend.sentCodes).toEqual([{ email: "me@example.com", redirectTo: REDIRECT }]);
    expect(await engine.verifyCode("me@example.com", "000000")).toEqual({ ok: false, reason: "invalid_code" });
    expect(engine.getState().session).toBeNull();
    expect(await engine.verifyCode("me@example.com", "123456")).toEqual({ ok: true });
    await flush();
    expect(engine.getState().session).toEqual(U1);
    expect(backend.pulls).toBe(1);
    expect(backend.rows.get(U1.userId)).toBeDefined(); // first upload
  });

  it("reports offline and rate limits from sendCode", async () => {
    setup({ session: null });
    await flush();
    backend.online = false;
    expect(await engine.sendCode("me@example.com")).toEqual({ ok: false, reason: "offline" });
    backend.online = true;
    backend.failWith = new SyncError("rate_limited", "too many");
    expect(await engine.sendCode("me@example.com")).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("a magic-link sign-in (auth event) triggers a pull once, even if repeated", async () => {
    setup({ session: null });
    await flush();
    backend.emitAuth(U1);
    backend.emitAuth(U1); // e.g. SIGNED_IN then TOKEN_REFRESHED
    await flush();
    expect(backend.pulls).toBe(1);
    expect(engine.getState().session).toEqual(U1);
  });

  it("sign out keeps local data, forgets the account, and stops syncing", async () => {
    setup({ local: withBlock() });
    await flush();
    expect(engine.getState().status).toBe("synced");
    await engine.signOut();
    await flush();
    expect(engine.getState()).toMatchObject({ session: null, status: "local" });
    expect(store.getSnapshot().data.weeks[0]).toHaveLength(1);
    expect(store.getSnapshot().meta).toMatchObject({ userId: null, syncedAt: null });
    const pushes = backend.pushes.length;
    edit((d) => withBlock(d, "x", 3));
    await vi.advanceTimersByTimeAsync(5000);
    engine.onVisible();
    await flush();
    expect(backend.pushes).toHaveLength(pushes);
  });

  it("switching to another account is treated as a first sign-in", async () => {
    backend.rows.set(U2.userId, { data: clone(withBlock(defaultData(), "u2", 5)), updatedAt: 100 });
    setup({ local: withBlock() });
    await flush();
    await engine.signOut();
    expect(await engine.verifyCode(U2.email!, "123456")).toEqual({ ok: true });
    await flush();
    expect(engine.getState().session).toEqual(U2);
    expect(engine.getState().conflict).not.toBeNull(); // not silently overwritten by timestamps
    expect(backend.rows.get(U2.userId)!.data).toMatchObject({ weeks: [[{ id: "u2" }], []] });
  });

  it("drops results of requests that finish after the session ended", async () => {
    backend.rows.set(U1.userId, { data: clone(defaultData()), updatedAt: 500 });
    setup({ meta: { updatedAt: 500, syncedAt: 500, userId: U1.userId } });
    await flush();
    backend.holdPush = true;
    edit((d) => withBlock(d, "a", 0));
    await vi.advanceTimersByTimeAsync(1500);
    expect(backend.inFlight).toBe(1);
    await engine.signOut();
    backend.release();
    await flush();
    expect(store.getSnapshot().meta).toMatchObject({ userId: null, syncedAt: null });
    expect(engine.getState().status).toBe("local");
  });

  it("stop() detaches from the store and auth", async () => {
    setup({ session: null });
    await flush();
    engine.stop();
    backend.emitAuth(U1);
    await flush();
    expect(backend.pulls).toBe(0);
  });
});
