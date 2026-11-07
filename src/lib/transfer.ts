import { APP_NAME } from "../appName";
import { normalizeData, SCHEMA_VERSION, type CadenceData } from "./model";
import { DATA_KEYS, STORAGE_KEYS, type DataKey } from "./storage";

export type ExportEnvelope = {
  app: "cadence";
  schemaVersion: 2;
  exportedAt: string;
  data: Pick<CadenceData, DataKey>;
};

export type ImportSummary = { categories: number; blocks: number; templates: number; sessions: number; streaks: number; tasks: number };
export type ImportResult =
  | { ok: true; data: CadenceData; dropped: number; summary: ImportSummary }
  | { ok: false; error: string };

export const NOT_A_BACKUP = `That file doesn't look like a ${APP_NAME} backup.`;
export const NEWER_VERSION = `This backup is from a newer version of ${APP_NAME}.`;

export const buildExport = (data: CadenceData, now: Date = new Date()): ExportEnvelope => ({
  app: "cadence",
  schemaVersion: 2,
  exportedAt: now.toISOString(),
  data: {
    cats: data.cats,
    weeks: data.weeks,
    templates: data.templates,
    history: data.history,
    streaks: data.streaks,
    tasks: data.tasks,
  },
});

const pad = (n: number) => String(n).padStart(2, "0");
export const exportFilename = (now: Date = new Date()): string =>
  `cadence-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

export const summarize = (data: CadenceData): ImportSummary => ({
  categories: data.cats.length,
  blocks: data.weeks[0].length + data.weeks[1].length,
  templates: data.templates.length,
  sessions: data.history.length,
  streaks: data.cats.filter((c) => (data.streaks[c.id]?.count ?? 0) > 0).length,
  tasks: data.tasks.length,
});

// Accepts the export envelope, or a flat object keyed by the localStorage keys
// (the five legacy ones, plus cadence:tasks) whose values are parsed JSON or JSON strings.
export const parseImport = (text: string): ImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!isRec(parsed)) return { ok: false, error: NOT_A_BACKUP };

  const raw: Partial<Record<DataKey, unknown>> = {};
  let dropped = 0;
  let found = 0;
  if ("data" in parsed || parsed.app === "cadence") {
    if (parsed.app !== undefined && parsed.app !== "cadence") return { ok: false, error: NOT_A_BACKUP };
    if (typeof parsed.schemaVersion === "number" && parsed.schemaVersion > SCHEMA_VERSION) return { ok: false, error: NEWER_VERSION };
    const data = parsed.data;
    if (!isRec(data)) return { ok: false, error: NOT_A_BACKUP };
    for (const k of DATA_KEYS) {
      if (k in data) {
        found++;
        raw[k] = data[k];
      }
    }
  } else {
    for (const k of DATA_KEYS) {
      const key = STORAGE_KEYS[k];
      if (!(key in parsed)) continue;
      found++;
      const v = parsed[key];
      if (typeof v === "string") {
        try {
          raw[k] = JSON.parse(v);
        } catch {
          dropped++;
        }
      } else {
        raw[k] = v;
      }
    }
  }
  if (found === 0) return { ok: false, error: NOT_A_BACKUP };

  const n = normalizeData(raw);
  return { ok: true, data: n.data, dropped: dropped + n.dropped, summary: summarize(n.data) };
};
