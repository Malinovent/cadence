import { normalizeData, type CadenceData } from "./model";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type DataKey = "cats" | "weeks" | "templates" | "history" | "streaks";

export const STORAGE_KEYS = {
  cats: "cadence:cats",
  weeks: "cadence:weeks",
  templates: "cadence:templates",
  history: "cadence:history",
  streaks: "cadence:streaks",
} as const satisfies Record<DataKey, string>;

export type StorageKey = (typeof STORAGE_KEYS)[DataKey];

export const DATA_KEYS = Object.keys(STORAGE_KEYS) as DataKey[];

const defaultStorage = (): StorageLike => globalThis.localStorage;

function loadState(key: string, storage: StorageLike): unknown {
  try {
    const r = storage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

// Reads the five legacy keys; missing or unreadable ones fall back to defaults.
export function loadData(storage: StorageLike = defaultStorage()): CadenceData {
  const raw: Partial<Record<DataKey, unknown>> = {};
  for (const k of DATA_KEYS) raw[k] = loadState(STORAGE_KEYS[k], storage);
  return normalizeData(raw).data;
}

export function saveKey(key: StorageKey, value: unknown, storage: StorageLike = defaultStorage()): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("save failed", e);
  }
}

// Writes every piece under its legacy key, in the legacy shape (no schemaVersion).
export function saveData(data: CadenceData, storage: StorageLike = defaultStorage()): void {
  for (const k of DATA_KEYS) saveKey(STORAGE_KEYS[k], data[k], storage);
}
