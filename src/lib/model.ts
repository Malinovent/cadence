import { DAY_END, DAY_START, DEFAULT_CATEGORIES, STEP } from "./constants";
import { floorFromTarget, legacyTarget, parseLimit, type Limit } from "./guardrail";
import { uid } from "./uid";

// `limit` is the S1.2 guardrail; `targetMins` stays in the stored shape (= legacyTarget(limit)) so
// older copies of the app still read a sensible weekly target.
export type Category = { id: string; name: string; color: string; targetMins: number; blockMins: number; limit: Limit };
export type Block = {
  id: string;
  catIds: string[];
  day: number; // 0=Mon..6
  start: number; // mins from 00:00
  mins: number;
  label: string;
  desc: string;
  done: boolean;
  buffer?: true; // S1.2: unassigned buffer time; catIds is [] and it never counts toward an area
  sourceTaskId?: string; // S1.5: the block was made by dropping this task on empty time
};
export type TemplateBlock = Omit<Block, "id" | "done">;
export type Template = { id: string; name: string; blocks: TemplateBlock[] };
export type HistoryEntry = { id: string /* block id */; catId: string; mins: number; date: number /* ms epoch */ };
export type Streaks = Record<string, { count: number; lastWeek?: number }>;
export type Weeks = [Block[], Block[]];
// S1.5 (schema 2): tasks live under an area. `name` is the brief's "title" (kept as `name` so a
// copy of the app from before S1.5 still reads the list). catId null = "Unsorted" (tasks from
// before areas, until the user gives them one). blockId = in that block's to-do list.
// returnedFrom = day (0 = Mon) of the block it came back from, for "back from Tue".
// The list's array order is the user's order; `order` mirrors it (index) in the stored shape.
export type Task = {
  id: string;
  name: string;
  catId: string | null;
  blockId?: string;
  attachedAt?: number; // ms epoch: when it joined that block (a block that ends after this sends it back)
  done: boolean;
  doneAt?: number; // ms epoch
  returnedFrom?: number;
  order: number;
  createdAt: number; // ms epoch
};
export const SCHEMA_VERSION = 2;
export type CadenceData = {
  schemaVersion: 2;
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
  schemaVersion: 2,
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
    .filter((p) => p.catIds.length > 0 || p.buffer === true); // S1.2 buffers have no area

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
      // S1.2: a missing or unreadable guardrail becomes a floor at the old target
      const limit = parseLimit(c.limit) ?? floorFromTarget(Number.isFinite(target) ? target : 0);
      cats.push({
        id: c.id,
        name: c.name,
        color: c.color,
        targetMins: legacyTarget(limit),
        blockMins: Number.isFinite(block) ? Math.max(30, block) : 30,
        limit,
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
    // S1.2: a buffer belongs to no area (any stray tags are ignored)
    if (p.buffer === true)
      return { catIds: [], day, start, mins, label: typeof p.label === "string" ? p.label : "", desc: typeof p.desc === "string" ? p.desc : "", buffer: true };
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
        const block: Block = { id, ...b, done: p.done === true };
        if (typeof p.sourceTaskId === "string" && p.sourceTaskId && !b.buffer) block.sourceTaskId = p.sourceTaskId;
        weeks[i].push(block);
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

  // tasks (a missing key is just an older file, not a drop). Schema 1 tasks had only id, name,
  // done and createdAt: they become Unsorted, in their old order.
  const blockIds = new Map<string, Block>();
  for (const w of weeks) for (const b of w) blockIds.set(b.id, b);
  const tasks: Task[] = [];
  if (piece(raw.tasks, Array.isArray)) {
    const seen = new Set<string>();
    const rawTasks = (raw.tasks as unknown[]).map((t, i) => ({ t, i }));
    // stored `order` wins, then the array position (stable)
    const ord = (x: { t: unknown; i: number }) => (isRec(x.t) && isNum(x.t.order) ? x.t.order : x.i);
    rawTasks.sort((a, b) => ord(a) - ord(b) || a.i - b.i);
    for (const { t } of rawTasks) {
      if (!isRec(t) || typeof t.id !== "string" || !t.id || seen.has(t.id) || typeof t.name !== "string" || !t.name) {
        dropped++;
        continue;
      }
      seen.add(t.id);
      const createdAt = Number(t.createdAt);
      const task: Task = {
        id: t.id,
        name: t.name,
        // an area deleted since (or never set) leaves the task Unsorted, never lost
        catId: typeof t.catId === "string" && catSet.has(t.catId) ? t.catId : null,
        done: t.done === true,
        order: tasks.length,
        createdAt: Number.isFinite(createdAt) ? createdAt : 0,
      };
      // a block that no longer exists: the task is simply back in its list
      if (typeof t.blockId === "string" && blockIds.has(t.blockId)) {
        task.blockId = t.blockId;
        if (isNum(t.attachedAt)) task.attachedAt = t.attachedAt;
      }
      if (task.done && isNum(t.doneAt)) task.doneAt = t.doneAt;
      if (isNum(t.returnedFrom) && Number.isInteger(t.returnedFrom) && t.returnedFrom >= 0 && t.returnedFrom <= 6)
        task.returnedFrom = t.returnedFrom;
      tasks.push(task);
    }
  }
  // a block made from a task keeps the link only while that task exists
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const b of blockIds.values()) if (b.sourceTaskId !== undefined && !taskIds.has(b.sourceTaskId)) delete b.sourceTaskId;

  return { data: { schemaVersion: 2, cats, weeks, templates, history, streaks, tasks }, dropped };
};
