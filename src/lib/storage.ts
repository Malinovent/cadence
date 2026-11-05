import { normalizeData, type CadenceData } from "./model";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type DataKey = "cats" | "weeks" | "templates" | "history" | "streaks" | "tasks";

export const STORAGE_KEYS = {
  cats: "cadence:cats",
  weeks: "cadence:weeks",
  templates: "cadence:templates",
  history: "cadence:history",
  streaks: "cadence:streaks",
  tasks: "cadence:tasks",
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

/**
 * Before a stored-data migration runs, an untouched copy of the saved data is kept here, as an
 * export envelope Settings can download (brief: "Offer a JSON export before any migration runs").
 * One key per migration; it is never synced and never overwritten.
 */
export const PREMIGRATION_KEYS = {
  guardrails: "cadence:backup:before-guardrails",
  tasks: "cadence:backup:before-tasks", // S1.5: schema 2 tasks
} as const;

/** S1.2: saved categories that don't have a guardrail yet (written by an older version). */
export const needsGuardrailMigration = (rawCats: unknown): boolean =>
  Array.isArray(rawCats) && rawCats.some((c) => typeof c === "object" && c !== null && !("limit" in c));

/** S1.5: saved tasks in the schema 1 shape (no `order`), written before S1.5. */
export const needsTaskMigration = (rawTasks: unknown): boolean =>
  Array.isArray(rawTasks) && rawTasks.some((t) => typeof t === "object" && t !== null && !("order" in t));

function keepPremigrationCopy(key: string, raw: Partial<Record<DataKey, unknown>>, storage: StorageLike, now: Date) {
  try {
    if (storage.getItem(key)) return;
    storage.setItem(key, JSON.stringify({ app: "cadence", schemaVersion: 1, exportedAt: now.toISOString(), data: raw }));
  } catch {
    /* storage full or blocked: the migration itself is lossless, so carry on */
  }
}

export function loadPremigrationCopy(key: string, storage: StorageLike = defaultStorage()): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

// Reads the five legacy keys plus cadence:tasks; missing or unreadable ones fall back to defaults.
export function loadData(storage: StorageLike = defaultStorage(), now: Date = new Date(), lang: "en" | "fr" = "en"): CadenceData {
  const raw: Partial<Record<DataKey, unknown>> = {};
  for (const k of DATA_KEYS) raw[k] = loadState(STORAGE_KEYS[k], storage);
  if (needsGuardrailMigration(raw.cats)) keepPremigrationCopy(PREMIGRATION_KEYS.guardrails, raw, storage, now);
  if (needsTaskMigration(raw.tasks)) keepPremigrationCopy(PREMIGRATION_KEYS.tasks, raw, storage, now);
  return normalizeData(raw, lang).data;
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
