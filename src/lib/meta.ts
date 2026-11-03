// Sync bookkeeping stored next to the five data keys, under `cadence:meta`.
import type { StorageLike } from "./storage";

export const META_KEY = "cadence:meta";

export type SyncMeta = {
  updatedAt: number; // ms epoch of the last local user edit (0 = never edited since sync existed)
  syncedAt: number | null; // the updatedAt value last confirmed equal to the server copy
  userId: string | null; // the account this device last synced with
};

export const defaultMeta = (): SyncMeta => ({ updatedAt: 0, syncedAt: null, userId: null });

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// tolerant: bad or missing fields fall back to defaults
export const normalizeMeta = (raw: unknown): SyncMeta => {
  const d = defaultMeta();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  return {
    updatedAt: isNum(r.updatedAt) && r.updatedAt >= 0 ? r.updatedAt : d.updatedAt,
    syncedAt: isNum(r.syncedAt) ? r.syncedAt : null,
    userId: typeof r.userId === "string" && r.userId ? r.userId : null,
  };
};

export const isDirty = (m: SyncMeta): boolean => m.syncedAt !== m.updatedAt;

// A user edit's timestamp: now, but always later than the previous one, so an edit made
// after applying a server copy stamped by a device whose clock runs ahead still wins.
export const nextEditTime = (m: SyncMeta, now: number): number => Math.max(now, m.updatedAt + 1);

const defaultStorage = (): StorageLike => globalThis.localStorage;

export function loadMeta(storage: StorageLike = defaultStorage()): SyncMeta {
  try {
    const r = storage.getItem(META_KEY);
    return normalizeMeta(r ? JSON.parse(r) : null);
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: SyncMeta, storage: StorageLike = defaultStorage()): void {
  try {
    storage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error("save failed", e);
  }
}
