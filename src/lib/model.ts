import { DAY_END, DAY_START, DEFAULT_CATEGORIES, STEP } from "./constants";
import { uid } from "./uid";

export type Category = { id: string; name: string; color: string; targetMins: number; blockMins: number };
export type Block = {
  id: string;
  catIds: string[];
  day: number; // 0=Mon..6
  start: number; // mins from 00:00
  mins: number;
  label: string;
  desc: string;
  done: boolean;
};
export type TemplateBlock = Omit<Block, "id" | "done">;
export type Template = { id: string; name: string; blocks: TemplateBlock[] };
export type HistoryEntry = { id: string /* block id */; catId: string; mins: number; date: number /* ms epoch */ };
export type Streaks = Record<string, { count: number; lastWeek?: number }>;
export type Weeks = [Block[], Block[]];
export type Task = { id: string; name: string; done: boolean; createdAt: number /* ms epoch */ };
export type CadenceData = {
  schemaVersion: 1;
  cats: Category[];
  weeks: Weeks;
  templates: Template[];
  history: HistoryEntry[];
  streaks: Streaks;
  tasks: Task[];
};

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export const defaultData = (): CadenceData => ({
  schemaVersion: 1,
  cats: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
  weeks: [[], []],
  templates: [],
  history: [],
  streaks: {},
  tasks: [],
});

// ---- migrate older saved data (single catId -> catIds array, add desc) ----
type Migrated = Rec & { catIds: unknown[]; desc: unknown };
const migrateBlock = (p: Rec): Migrated => ({
  ...p,
  catIds: Array.isArray(p.catIds) ? p.catIds : p.catId ? [p.catId] : [],
  desc: p.desc || "",
});
const migrateList = (list: unknown): Migrated[] =>
  arr(list)
    .filter(isRec)
    .map(migrateBlock)
    .filter((p) => p.catIds.length > 0);

export const migrateBlocks = (weeksData: unknown): Migrated[][] =>
  (Array.isArray(weeksData) ? weeksData : [[], []]).map(migrateList);

export const migrateTemplates = (templates: unknown): (Rec & { blocks: Migrated[] })[] =>
  arr(templates)
    .filter(isRec)
    .map((tpl) => ({ ...tpl, blocks: migrateList(tpl.blocks) }));

// ---- normalize: tolerant cleanup used by storage load and import ----
// Fills defaults for missing pieces, migrates, and drops anything malformed.
// `dropped` counts discarded items (and catIds stripped from surviving blocks).
export const normalizeData = (partial: unknown): { data: CadenceData; dropped: number } => {
  const raw: Rec = isRec(partial) ? partial : {};
  let dropped = 0;
  // a present-but-wrong-typed piece counts as one drop
  const piece = (v: unknown, ok: (v: unknown) => boolean): boolean => {
    if (v === undefined || v === null) return false;
    if (ok(v)) return true;
    dropped++;
    return false;
  };

  // categories
  let cats: Category[];
  if (piece(raw.cats, Array.isArray)) {
    cats = [];
    const seen = new Set<string>();
    for (const c of raw.cats as unknown[]) {
      if (!isRec(c) || typeof c.id !== "string" || !c.id || seen.has(c.id) || typeof c.name !== "string" || typeof c.color !== "string") {
        dropped++;
        continue;
      }
      seen.add(c.id);
      const target = Number(c.targetMins);
      const block = Number(c.blockMins);
      cats.push({
        id: c.id,
        name: c.name,
        color: c.color,
        targetMins: Number.isFinite(target) ? target : 0,
        blockMins: Number.isFinite(block) ? Math.max(30, block) : 30,
      });
    }
  } else {
    cats = defaultData().cats;
  }
  const catSet = new Set(cats.map((c) => c.id));

  const cleanBlock = (p: Migrated): TemplateBlock | null => {
    const { day, start, mins } = p;
    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) return null;
    if (!isNum(start) || !isNum(mins) || mins < STEP || start < DAY_START || start + mins > DAY_END) return null;
    const catIds: string[] = [];
    for (const c of p.catIds) if (typeof c === "string" && catSet.has(c) && !catIds.includes(c)) catIds.push(c);
    if (catIds.length === 0) return null;
    dropped += p.catIds.length - catIds.length;
    return {
      catIds,
      day,
      start,
      mins,
      label: typeof p.label === "string" ? p.label : "",
      desc: typeof p.desc === "string" ? p.desc : "",
    };
  };
  const countRaw = (list: unknown): number => (Array.isArray(list) ? list.length : list == null ? 0 : 1);

  // weeks: exactly two
  const weeks: Weeks = [[], []];
  if (piece(raw.weeks, Array.isArray)) {
    const rw = raw.weeks as unknown[];
    rw.slice(2).forEach((w) => (dropped += countRaw(w)));
    const two = [rw[0], rw[1]];
    const migrated = migrateBlocks(two);
    for (const i of [0, 1] as const) {
      dropped += countRaw(two[i]) - migrated[i].length;
      for (const p of migrated[i]) {
        const b = cleanBlock(p);
        if (!b) {
          dropped++;
          continue;
        }
        const id = typeof p.id === "string" && p.id ? p.id : isNum(p.id) ? String(p.id) : uid();
        weeks[i].push({ id, ...b, done: p.done === true });
      }
    }
  }

  // templates
  const templates: Template[] = [];
  if (piece(raw.templates, Array.isArray)) {
    const recs = (raw.templates as unknown[]).filter(isRec);
    dropped += (raw.templates as unknown[]).length - recs.length;
    migrateTemplates(recs).forEach((tpl, i) => {
      dropped += countRaw(recs[i].blocks) - tpl.blocks.length;
      const blocks: TemplateBlock[] = [];
      for (const p of tpl.blocks) {
        const b = cleanBlock(p);
        if (b) blocks.push(b);
        else dropped++;
      }
      templates.push({
        id: typeof tpl.id === "string" && tpl.id ? tpl.id : uid(),
        name: typeof tpl.name === "string" ? tpl.name : `Template ${i + 1}`,
        blocks,
      });
    });
  }

  // history
  const history: HistoryEntry[] = [];
  if (piece(raw.history, Array.isArray)) {
    for (const e of raw.history as unknown[]) {
      if (!isRec(e) || typeof e.catId !== "string" || !isNum(e.mins) || !isNum(e.date)) {
        dropped++;
        continue;
      }
      // very old entries had no block id
      const id = typeof e.id === "string" ? e.id : isNum(e.id) ? String(e.id) : "";
      history.push({ id, catId: e.catId, mins: e.mins, date: e.date });
    }
  }

  // streaks
  const streaks: Streaks = {};
  if (piece(raw.streaks, isRec)) {
    for (const [k, v] of Object.entries(raw.streaks as Rec)) {
      if (!isRec(v) || !isNum(v.count)) {
        dropped++;
        continue;
      }
      streaks[k] = isNum(v.lastWeek) ? { count: v.count, lastWeek: v.lastWeek } : { count: v.count };
    }
  }

  // tasks (a missing key is just an older file, not a drop)
  const tasks: Task[] = [];
  if (piece(raw.tasks, Array.isArray)) {
    for (const t of raw.tasks as unknown[]) {
      if (!isRec(t) || typeof t.id !== "string" || !t.id || typeof t.name !== "string" || !t.name) {
        dropped++;
        continue;
      }
      const createdAt = Number(t.createdAt);
      tasks.push({ id: t.id, name: t.name, done: t.done === true, createdAt: Number.isFinite(createdAt) ? createdAt : 0 });
    }
  }

  return { data: { schemaVersion: 1, cats, weeks, templates, history, streaks, tasks }, dropped };
};
