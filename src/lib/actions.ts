// Pure state transitions. Each takes CadenceData and returns new CadenceData,
// or the same reference when nothing changes. Inputs are never mutated.
import { DAY_END, DAY_START, PALETTE, STEP } from "./constants";
import type { Block, CadenceData, Category, HistoryEntry, Streaks, Task, Template, Weeks } from "./model";
import { resizeBlock, resolvePlacement } from "./placement";
import { uid as defaultUid } from "./uid";

export type WeekIndex = 0 | 1;
export type Deps = { uid?: () => string; now?: () => number };

const BOUNDS = [DAY_START, DAY_END] as const;

const withWeek = (data: CadenceData, week: WeekIndex, blocks: Block[]): CadenceData => {
  const weeks: Weeks = [data.weeks[0], data.weeks[1]];
  weeks[week] = blocks;
  return { ...data, weeks };
};

// map every block in both weeks; returns `data` itself when fn changes nothing
const mapBlocks = (data: CadenceData, fn: (p: Block) => Block): CadenceData => {
  let changed = false;
  const map = (w: Block[]) =>
    w.map((p) => {
      const q = fn(p);
      if (q !== p) changed = true;
      return q;
    });
  const weeks: Weeks = [map(data.weeks[0]), map(data.weeks[1])];
  return changed ? { ...data, weeks } : data;
};

export const placeBlock = (
  data: CadenceData,
  week: WeekIndex,
  catId: string,
  day: number,
  start: number,
  mins?: number,
  deps: Deps = {},
): CadenceData => {
  const dur = mins || data.cats.find((c) => c.id === catId)?.blockMins;
  if (!dur) return data;
  const blocks = data.weeks[week];
  const r = resolvePlacement(blocks, day, start, dur, null, BOUNDS, STEP);
  if (!r) return data; // day full — nothing to do
  const id = (deps.uid ?? defaultUid)();
  return withWeek(data, week, [
    ...blocks,
    { id, catIds: [catId], day, start: r.start, mins: r.mins, label: "", desc: "", done: false },
  ]);
};

export const moveBlock = (data: CadenceData, week: WeekIndex, id: string, day: number, start: number): CadenceData => {
  const blocks = data.weeks[week];
  const p = blocks.find((x) => x.id === id);
  if (!p) return data;
  const r = resolvePlacement(blocks, day, start, p.mins, id, BOUNDS, STEP);
  if (!r) return data; // no room — leave where it was
  if (p.day === day && p.start === r.start && p.mins === r.mins) return data;
  // may shrink to fit the target gap
  return withWeek(data, week, blocks.map((x) => (x === p ? { ...p, day, start: r.start, mins: r.mins } : x)));
};

export const resize = (
  data: CadenceData,
  week: WeekIndex,
  id: string,
  edge: "top" | "bottom",
  origStart: number,
  origMins: number,
  deltaSlots: number,
): CadenceData => {
  const blocks = data.weeks[week];
  const next = resizeBlock(blocks, id, edge, origStart, origMins, deltaSlots, BOUNDS, STEP);
  if (next === blocks) return data;
  const i = blocks.findIndex((x) => x.id === id);
  if (blocks[i].start === next[i].start && blocks[i].mins === next[i].mins) return data;
  return withWeek(data, week, next);
};

// add a second (or third) category to an existing block
export const addTag = (data: CadenceData, id: string, catId: string): CadenceData =>
  mapBlocks(data, (p) => {
    if (p.id !== id || p.catIds.includes(catId)) return p; // already tagged
    return { ...p, catIds: [...p.catIds, catId] };
  });

export const removeTag = (data: CadenceData, id: string, catId: string): CadenceData =>
  mapBlocks(data, (p) => {
    if (p.id !== id || p.catIds.length <= 1 || !p.catIds.includes(catId)) return p; // must keep at least one
    return { ...p, catIds: p.catIds.filter((x) => x !== catId) };
  });

export const updateBlock = (data: CadenceData, id: string, patch: Partial<Omit<Block, "id">>): CadenceData =>
  mapBlocks(data, (p) => (p.id === id ? { ...p, ...patch } : p));

// also drops its history, so a deleted block no longer counts toward stats
export const removeBlock = (data: CadenceData, id: string): CadenceData => {
  const has = (w: Block[]) => w.some((p) => p.id === id);
  const inHistory = data.history.some((e) => e.id === id);
  if (!has(data.weeks[0]) && !has(data.weeks[1]) && !inHistory) return data;
  return {
    ...data,
    weeks: [data.weeks[0].filter((p) => p.id !== id), data.weeks[1].filter((p) => p.id !== id)],
    history: inHistory ? data.history.filter((e) => e.id !== id) : data.history,
  };
};

// done: log one history entry per tagged category, each with the FULL duration.
// undone: remove this block's entries.
export const toggleDone = (data: CadenceData, week: WeekIndex, id: string, deps: Deps = {}): CadenceData => {
  const blocks = data.weeks[week];
  const p = blocks.find((x) => x.id === id);
  if (!p) return data;
  const q = { ...p, done: !p.done };
  let history: HistoryEntry[];
  if (q.done) {
    const stamp = (deps.now ?? Date.now)();
    history = [...data.history, ...q.catIds.map((cid) => ({ id: q.id, catId: cid, mins: q.mins, date: stamp }))];
  } else {
    history = data.history.filter((e) => e.id !== q.id);
  }
  return { ...withWeek(data, week, blocks.map((x) => (x === p ? q : x))), history };
};

export const saveTemplate = (data: CadenceData, week: WeekIndex, name?: string, deps: Deps = {}): CadenceData => {
  const finalName = (name && name.trim()) || `Template ${data.templates.length + 1}`;
  const tpl: Template = {
    id: (deps.uid ?? defaultUid)(),
    name: finalName,
    blocks: data.weeks[week].map((p) => ({
      catIds: [...p.catIds],
      day: p.day,
      start: p.start,
      mins: p.mins,
      label: p.label,
      desc: p.desc || "",
    })),
  };
  return { ...data, templates: [...data.templates, tpl] };
};

// replaces the week with fresh, not-done copies of the template's blocks;
// tags of categories deleted since the save are stripped, untagged blocks dropped
export const applyTemplate = (data: CadenceData, week: WeekIndex, templateId: string, deps: Deps = {}): CadenceData => {
  const tpl = data.templates.find((t) => t.id === templateId);
  if (!tpl) return data;
  const makeId = deps.uid ?? defaultUid;
  const known = new Set(data.cats.map((c) => c.id));
  const blocks: Block[] = [];
  for (const b of tpl.blocks) {
    const catIds = b.catIds.filter((c) => known.has(c));
    if (catIds.length) blocks.push({ ...b, catIds, id: makeId(), done: false });
  }
  return withWeek(data, week, blocks);
};

export const deleteTemplate = (data: CadenceData, id: string): CadenceData =>
  data.templates.some((t) => t.id === id) ? { ...data, templates: data.templates.filter((t) => t.id !== id) } : data;

// Roll forward: week 1 done minutes vs target update streaks, week 2 becomes week 1.
export const advanceWeek = (data: CadenceData): CadenceData => {
  const streaks: Streaks = { ...data.streaks };
  data.cats.forEach((c) => {
    const doneMins = data.weeks[0]
      .filter((p) => p.catIds.includes(c.id) && p.done)
      .reduce((s, p) => s + p.mins, 0);
    const met = doneMins >= c.targetMins;
    const cur = streaks[c.id] || { count: 0 };
    streaks[c.id] = { count: met ? cur.count + 1 : 0 }; // legacy drops lastWeek
  });
  return { ...data, streaks, weeks: [data.weeks[1], []] };
};

// clears history and streaks, and done flags so nothing re-logs
export const resetStats = (data: CadenceData): CadenceData => ({
  ...data,
  history: [],
  streaks: {},
  weeks: [data.weeks[0].map((p) => ({ ...p, done: false })), data.weeks[1].map((p) => ({ ...p, done: false }))],
});

export const updateCat = (data: CadenceData, id: string, patch: Partial<Omit<Category, "id">>): CadenceData =>
  data.cats.some((c) => c.id === id)
    ? { ...data, cats: data.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
    : data;

export const addCat = (data: CadenceData, deps: Deps = {}): CadenceData => ({
  ...data,
  cats: [
    ...data.cats,
    {
      id: (deps.uid ?? defaultUid)(),
      name: "New",
      color: PALETTE[data.cats.length % PALETTE.length],
      targetMins: 60,
      blockMins: 60,
    },
  ],
});

// strips the tag from blocks, drops blocks left untagged, drops its history
export const removeCat = (data: CadenceData, id: string): CadenceData => {
  const strip = (w: Block[]) =>
    w.some((p) => p.catIds.includes(id))
      ? w
          .map((p) => (p.catIds.includes(id) ? { ...p, catIds: p.catIds.filter((x) => x !== id) } : p))
          .filter((p) => p.catIds.length > 0)
      : w;
  const cats = data.cats.filter((c) => c.id !== id);
  const weeks: Weeks = [strip(data.weeks[0]), strip(data.weeks[1])];
  const history = data.history.filter((e) => e.catId !== id);
  const unchanged =
    cats.length === data.cats.length &&
    weeks[0] === data.weeks[0] &&
    weeks[1] === data.weeks[1] &&
    history.length === data.history.length;
  return unchanged ? data : { ...data, cats, weeks, history };
};

// ---- tasks: a plain list in insertion order; done tasks stay where they are ----
export const addTask = (data: CadenceData, name: string, deps: Deps = {}): CadenceData => {
  const trimmed = name.trim();
  if (!trimmed) return data;
  const task: Task = { id: (deps.uid ?? defaultUid)(), name: trimmed, done: false, createdAt: (deps.now ?? Date.now)() };
  return { ...data, tasks: [...data.tasks, task] };
};

export const toggleTask = (data: CadenceData, id: string): CadenceData =>
  data.tasks.some((t) => t.id === id)
    ? { ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }
    : data;

export const removeTask = (data: CadenceData, id: string): CadenceData =>
  data.tasks.some((t) => t.id === id) ? { ...data, tasks: data.tasks.filter((t) => t.id !== id) } : data;

export const replaceAll = (_data: CadenceData, next: CadenceData): CadenceData => next;
