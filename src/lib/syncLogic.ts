// Pure decisions for Supabase sync (SPEC "Phase 4 design: sync" → "Sync rules").
// Last-write-wins on the whole document, compared by each device's edit time (ms epoch).
import { DEFAULT_CATEGORIES } from "./constants";
import type { SyncMeta } from "./meta";
import type { CadenceData } from "./model";

// a server copy, already through normalizeData; updatedAt in ms epoch
export type ServerRow = { data: CadenceData; updatedAt: number };

export type PullDecision =
  // upload local, stamped `updatedAt` (above meta.updatedAt when local must beat the server copy)
  | { kind: "push"; updatedAt: number }
  | { kind: "apply"; row: ServerRow }
  // same content: set updatedAt = syncedAt = `updatedAt`
  | { kind: "markSynced"; updatedAt: number }
  // first sign-in with different content on both sides: ask the user
  | { kind: "conflict"; server: ServerRow };

export type PushDecision =
  | { kind: "synced"; syncedAt: number } // we won; local may still be dirty if edited meanwhile
  | { kind: "apply"; row: ServerRow } // the server copy is newer than anything we have
  | { kind: "push" } // the server copy is newer than what we sent, but we edited again since, later still
  | { kind: "invalid" }; // server kept something older than what we sent: never expected

type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

// deep equality of JSON values; object key order is ignored, array order is not,
// and a key holding undefined counts as absent (as in JSON)
export const jsonEqual = (a: Json, b: Json): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => jsonEqual(x, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && jsonEqual(a[k], b[k]));
  }
  return false;
};

// same schedule content (schemaVersion aside)
export const contentEqual = (a: CadenceData, b: CadenceData): boolean =>
  jsonEqual(a.cats, b.cats) &&
  jsonEqual(a.weeks, b.weeks) &&
  jsonEqual(a.templates, b.templates) &&
  jsonEqual(a.history, b.history) &&
  jsonEqual(a.streaks, b.streaks);

// nothing worth keeping: no blocks in either week, no templates, history or streaks,
// categories exactly the defaults
export const isEmptyData = (d: CadenceData): boolean =>
  d.weeks[0].length === 0 &&
  d.weeks[1].length === 0 &&
  d.templates.length === 0 &&
  d.history.length === 0 &&
  Object.keys(d.streaks).length === 0 &&
  jsonEqual(d.cats, DEFAULT_CATEGORIES);

// a fresh account on this device: never synced, or last synced as someone else
export const isFirstSignIn = (meta: SyncMeta, sessionUserId: string): boolean => meta.userId !== sessionUserId;

// an edit time for local that beats `server` under last-write-wins
export const winningUpdatedAt = (meta: SyncMeta, server: ServerRow, now = 0): number =>
  Math.max(meta.updatedAt, server.updatedAt + 1, now);

export const decideAfterPull = (
  local: CadenceData,
  meta: SyncMeta,
  server: ServerRow | null,
  sessionUserId: string,
): PullDecision => {
  if (!server) return { kind: "push", updatedAt: meta.updatedAt }; // first upload

  if (isFirstSignIn(meta, sessionUserId)) {
    if (isEmptyData(local)) return { kind: "apply", row: server };
    if (contentEqual(local, server.data)) return { kind: "markSynced", updatedAt: server.updatedAt };
    // the account holds nothing worth keeping (e.g. another device's untouched defaults): keep local
    if (isEmptyData(server.data)) return { kind: "push", updatedAt: winningUpdatedAt(meta, server) };
    return { kind: "conflict", server };
  }

  if (server.updatedAt > meta.updatedAt) return { kind: "apply", row: server };
  if (server.updatedAt < meta.updatedAt) return { kind: "push", updatedAt: meta.updatedAt };
  return { kind: "markSynced", updatedAt: server.updatedAt };
};

// `meta` is the current one (the user may have edited during the push);
// `pushedUpdatedAt` is the edit time that was sent; `returned` is what push_state says is stored
export const decideAfterPush = (meta: SyncMeta, pushedUpdatedAt: number, returned: ServerRow): PushDecision => {
  if (returned.updatedAt === pushedUpdatedAt) return { kind: "synced", syncedAt: pushedUpdatedAt };
  if (returned.updatedAt > pushedUpdatedAt) {
    if (meta.updatedAt > returned.updatedAt) return { kind: "push" };
    return { kind: "apply", row: returned };
  }
  return { kind: "invalid" };
};
