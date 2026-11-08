// Sync orchestration (framework-free). Talks to the server only through an injected SyncClient,
// reads and writes the local document only through the CadenceStore, and leaves every
// decision to the pure functions in src/lib/syncLogic.ts.
import { isDirty } from "../lib/meta";
import { normalizeData, type CadenceData } from "../lib/model";
import {
  decideAfterPull,
  decideAfterPush,
  isFirstSignIn,
  jsonEqual,
  winningUpdatedAt,
  type ServerRow,
} from "../lib/syncLogic";
import { summarize, type ImportSummary } from "../lib/transfer";
import type { CadenceStore } from "../state/store";

export type SyncSession = { userId: string; email: string | null };
// a row as the server sends it: data not yet normalized, updatedAt in ms epoch
export type RawRow = { data: unknown; updatedAt: number };

export type SyncErrorKind = "network" | "rate_limited" | "invalid_code" | "failed";
export class SyncError extends Error {
  constructor(
    readonly kind: SyncErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

// Everything the engine needs from the backend. Implementations throw SyncError on failure.
export interface SyncClient {
  getSession(): Promise<SyncSession | null>;
  /** Called with the current session whenever auth changes (including the initial one). Returns unsubscribe. */
  onAuthChange(cb: (session: SyncSession | null) => void): () => void;
  sendCode(email: string, redirectTo: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<SyncSession>;
  signOut(): Promise<void>;
  /** Deletes the signed-in account and its synced copy on the server (delete_my_account). */
  deleteAccount(): Promise<void>;
  pull(userId: string): Promise<RawRow | null>;
  push(data: CadenceData, updatedAt: number): Promise<RawRow>;
}

export type SyncStatus = "local" | "synced" | "syncing" | "offline" | "error";
export type SyncConflict = { local: ImportSummary; server: ImportSummary };
export type SyncState = {
  configured: boolean; // false → no backend; the app is local-only and shows no account UI
  ready: boolean; // the saved session has been restored (or there was none)
  session: SyncSession | null;
  status: SyncStatus; // "local" whenever signed out; check `conflict` first when showing it
  conflict: SyncConflict | null; // first sign-in found different data on both sides; nothing syncs until resolved
};
export type AuthResult = { ok: true } | { ok: false; reason: "offline" | "rate_limited" | "invalid_code" | "failed" };
export type ConflictChoice = "local" | "server";

export interface SyncEngine {
  start(): void;
  stop(): void;
  getState(): SyncState;
  subscribe(fn: () => void): () => void;
  onVisible(): void;
  onOnline(): void;
  onOffline(): void;
  sendCode(email: string): Promise<AuthResult>;
  verifyCode(email: string, code: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Deletes the account and its server copy; this device keeps its weeks, signed out. */
  deleteAccount(): Promise<AuthResult>;
  resolveConflict(choice: ConflictChoice): void;
}

export type EngineOptions = {
  client: SyncClient;
  store: CadenceStore;
  redirectTo: string;
  debounceMs?: number;
  now?: () => number;
  isOnline?: () => boolean;
};

export const PUSH_DEBOUNCE_MS = 1500;

const defaultOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

const toRow = (raw: RawRow): ServerRow => ({ data: normalizeData(raw.data).data, updatedAt: raw.updatedAt });

const authReason = (e: unknown): Exclude<AuthResult, { ok: true }>["reason"] => {
  if (!(e instanceof SyncError)) return "failed";
  return e.kind === "network" ? "offline" : e.kind;
};

export function createSyncEngine(opts: EngineOptions): SyncEngine {
  const { client, store, redirectTo } = opts;
  const debounceMs = opts.debounceMs ?? PUSH_DEBOUNCE_MS;
  const now = opts.now ?? Date.now;
  const isOnline = opts.isOnline ?? defaultOnline;

  let session: SyncSession | null = null;
  let ready = false;
  let net: "ok" | "offline" | "error" = "ok"; // result of the last network attempt
  let conflictRow: ServerRow | null = null;
  // first sign-in decided local is this account's copy; meta.userId is set once a push confirms it
  let uncommittedUser: string | null = null;
  let busy = false; // one pull/push at a time
  let pendingPull = false;
  let pendingPush = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let gen = 0; // bumps on every session change; results of older operations are dropped
  let running = false;
  let unsubs: (() => void)[] = [];

  const listeners = new Set<() => void>();
  let state: SyncState = { configured: true, ready: false, session: null, status: "local", conflict: null };

  const compute = (): SyncState => {
    const { data, meta } = store.getSnapshot();
    let status: SyncStatus;
    if (!session) status = "local";
    else if (busy) status = "syncing";
    else if (net !== "ok") status = net === "offline" ? "offline" : "error";
    else status = isDirty(meta) || uncommittedUser ? "syncing" : "synced";
    const conflict = conflictRow ? { local: summarize(data), server: summarize(conflictRow.data) } : null;
    return { configured: true, ready, session, status, conflict };
  };

  const emit = () => {
    const next = compute();
    const same =
      next.ready === state.ready &&
      next.session === state.session &&
      next.status === state.status &&
      jsonEqual(next.conflict, state.conflict);
    if (same) return;
    state = next;
    for (const fn of [...listeners]) fn();
  };

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const fail = (e: unknown) => {
    const offline = !isOnline() || (e instanceof SyncError && e.kind === "network");
    net = offline ? "offline" : "error";
    if (!offline) console.warn("sync failed", e);
  };

  const canSync = () => running && session !== null && conflictRow === null;

  // ---- operations (only ever called through run) ----

  const pushOp = async (g: number): Promise<void> => {
    const userId = session!.userId;
    const { data, meta } = store.getSnapshot();
    if (!isDirty(meta) && uncommittedUser !== userId) return; // nothing to send
    if (!isOnline()) {
      net = "offline";
      return;
    }
    const pushed = meta.updatedAt;
    let raw: RawRow;
    try {
      raw = await client.push(data, pushed);
    } catch (e) {
      if (g === gen) fail(e);
      return;
    }
    if (g !== gen) return;
    net = "ok";
    const row = toRow(raw);
    const d = decideAfterPush(store.getSnapshot().meta, pushed, row);
    switch (d.kind) {
      case "synced": {
        const commit = uncommittedUser;
        uncommittedUser = null;
        store.setMeta((m) => ({ ...m, syncedAt: d.syncedAt, userId: commit ?? m.userId }));
        break;
      }
      case "apply":
        // a first sign-in must never silently lose local data: look again, as a first sign-in
        if (uncommittedUser) pendingPull = true;
        else store.applyRemote(d.row.data, d.row.updatedAt, userId);
        break;
      case "push":
        pendingPush = true;
        break;
      case "invalid":
        net = "error";
        console.warn("sync: server kept an older copy than the one sent");
        break;
    }
    // a push timer armed by our own meta updates has nothing left to send
    if (!isDirty(store.getSnapshot().meta) && !uncommittedUser) clearTimer();
  };

  const pullOp = async (g: number): Promise<void> => {
    const userId = session!.userId;
    if (!isOnline()) {
      net = "offline";
      return;
    }
    let raw: RawRow | null;
    try {
      raw = await client.pull(userId);
    } catch (e) {
      if (g === gen) fail(e);
      return;
    }
    if (g !== gen) return;
    net = "ok";
    const row = raw ? toRow(raw) : null;
    const { data, meta } = store.getSnapshot(); // fresh: edits made during the request count
    const first = isFirstSignIn(meta, userId);
    const d = decideAfterPull(data, meta, row, userId);
    switch (d.kind) {
      case "apply":
        uncommittedUser = null;
        store.applyRemote(d.row.data, d.row.updatedAt, userId);
        break;
      case "markSynced":
        uncommittedUser = null;
        store.setMeta((m) => ({ ...m, updatedAt: d.updatedAt, syncedAt: d.updatedAt, userId }));
        break;
      case "conflict":
        uncommittedUser = null;
        conflictRow = d.server;
        clearTimer();
        pendingPush = false;
        break;
      case "push":
        uncommittedUser = first ? userId : null;
        if (d.updatedAt > meta.updatedAt)
          store.setMeta((m) => ({ ...m, updatedAt: Math.max(m.updatedAt, d.updatedAt) }));
        await pushOp(g);
        return;
    }
    if (!isDirty(store.getSnapshot().meta)) clearTimer();
  };

  // runs one operation, then whatever was requested meanwhile (a pull covers a push)
  const run = async (op: (g: number) => Promise<void>): Promise<void> => {
    busy = true;
    emit();
    try {
      await op(gen);
    } finally {
      busy = false;
    }
    if (!canSync()) {
      pendingPull = pendingPush = false;
      emit();
      return;
    }
    if (pendingPull) {
      pendingPull = pendingPush = false;
      return run(pullOp);
    }
    if (pendingPush) {
      pendingPush = false;
      return run(pushOp);
    }
    emit();
  };

  const requestPull = () => {
    if (!canSync()) return;
    if (busy) pendingPull = true;
    else void run(pullOp);
  };

  const requestPush = () => {
    if (!canSync()) return;
    clearTimer();
    if (busy) pendingPush = true;
    else void run(pushOp);
  };

  const schedulePush = () => {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      requestPush();
    }, debounceMs);
  };

  const onStoreChange = () => {
    emit();
    if (canSync() && isDirty(store.getSnapshot().meta)) schedulePush();
  };

  const setSession = (s: SyncSession | null) => {
    if (s && session && s.userId === session.userId) {
      if (s.email !== session.email) {
        session = s;
        emit();
      }
      return;
    }
    if (!s && !session) return;
    gen++;
    clearTimer();
    pendingPull = pendingPush = false;
    conflictRow = null;
    uncommittedUser = null;
    net = "ok";
    session = s;
    emit();
    if (s) requestPull(); // right after sign-in, and on launch after session restore
  };

  return {
    start() {
      if (running) return;
      running = true;
      unsubs = [store.subscribe(onStoreChange), client.onAuthChange((s) => running && setSession(s))];
      client
        .getSession()
        .then((s) => {
          if (!running) return;
          ready = true;
          setSession(s);
          emit();
        })
        .catch((e) => {
          if (!running) return;
          ready = true;
          fail(e);
          emit();
        });
    },
    stop() {
      running = false;
      gen++;
      clearTimer();
      for (const u of unsubs) u();
      unsubs = [];
    },
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    onVisible: requestPull,
    onOnline: requestPull,
    onOffline() {
      if (!session || busy) return;
      net = "offline";
      emit();
    },
    async sendCode(email) {
      try {
        await client.sendCode(email.trim(), redirectTo);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: authReason(e) };
      }
    },
    async verifyCode(email, code) {
      try {
        const s = await client.verifyCode(email.trim(), code.trim());
        if (running) setSession(s);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: authReason(e) };
      }
    },
    async signOut() {
      // stop syncing first; local data stays on the device
      setSession(null);
      store.setMeta((m) => ({ ...m, userId: null, syncedAt: null }));
      try {
        await client.signOut();
      } catch (e) {
        console.warn("sign out failed", e);
      }
    },
    async deleteAccount() {
      if (!session) return { ok: false, reason: "failed" };
      try {
        await client.deleteAccount();
      } catch (e) {
        return { ok: false, reason: authReason(e) }; // nothing changed: still signed in
      }
      // the account and its server copy are gone; the weeks stay here, local only
      setSession(null);
      store.setMeta((m) => ({ ...m, userId: null, syncedAt: null }));
      try {
        await client.signOut();
      } catch {
        // the session went with the account
      }
      return { ok: true };
    },
    resolveConflict(choice) {
      if (!conflictRow || !session) return;
      const row = conflictRow;
      const userId = session.userId;
      conflictRow = null;
      if (choice === "server") {
        store.applyRemote(row.data, row.updatedAt, userId);
        emit();
        return;
      }
      // keep this device's copy: stamp it later than the server's so the push wins
      store.setMeta((m) => ({ ...m, updatedAt: winningUpdatedAt(m, row, now()) }));
      uncommittedUser = userId;
      requestPush();
      emit();
    },
  };
}
