// Framework-free holder of the app document and its sync meta. useCadence renders from it
// (useSyncExternalStore) and the sync engine reads/writes it synchronously, so neither works
// from a stale copy and no React state updater ever has side effects.
import { loadMeta, nextEditTime, saveMeta, type SyncMeta } from "../lib/meta";
import type { CadenceData } from "../lib/model";
import { DATA_KEYS, loadData, saveKey, STORAGE_KEYS, type StorageLike } from "../lib/storage";

export type Snapshot = { readonly data: CadenceData; readonly meta: SyncMeta };

export interface CadenceStore {
  getSnapshot(): Snapshot;
  subscribe(fn: () => void): () => void;
  /** A user edit: applies fn and bumps meta.updatedAt, unless fn returned the same data. */
  edit(fn: (d: CadenceData) => CadenceData): void;
  /** A copy pulled from the server: replaces the data without counting as an edit. */
  applyRemote(data: CadenceData, serverUpdatedAt: number, userId: string | null): void;
  /** Sync bookkeeping only; never touches data. */
  setMeta(fn: (m: SyncMeta) => SyncMeta): void;
}

export type StoreDeps = { storage?: StorageLike; now?: () => number };

export function createCadenceStore(deps: StoreDeps = {}): CadenceStore {
  const storage = deps.storage ?? globalThis.localStorage;
  const now = deps.now ?? Date.now;
  // loading does not write anything back
  let snap: Snapshot = { data: loadData(storage), meta: loadMeta(storage) };
  const listeners = new Set<() => void>();

  const set = (next: Snapshot) => {
    const prev = snap;
    if (next.data === prev.data && next.meta === prev.meta) return;
    snap = next;
    // only slices that changed are rewritten, each under its legacy key and shape
    for (const k of DATA_KEYS) if (next.data[k] !== prev.data[k]) saveKey(STORAGE_KEYS[k], next.data[k], storage);
    if (next.meta !== prev.meta) saveMeta(next.meta, storage);
    for (const fn of [...listeners]) fn();
  };

  return {
    getSnapshot: () => snap,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    edit(fn) {
      const data = fn(snap.data);
      if (data === snap.data) return; // no-op actions are not edits
      set({ data, meta: { ...snap.meta, updatedAt: nextEditTime(snap.meta, now()) } });
    },
    applyRemote(data, serverUpdatedAt, userId) {
      set({ data, meta: { updatedAt: serverUpdatedAt, syncedAt: serverUpdatedAt, userId } });
    },
    setMeta(fn) {
      const meta = fn(snap.meta);
      if (meta === snap.meta) return;
      const same =
        meta.updatedAt === snap.meta.updatedAt && meta.syncedAt === snap.meta.syncedAt && meta.userId === snap.meta.userId;
      if (!same) set({ data: snap.data, meta });
    },
  };
}
