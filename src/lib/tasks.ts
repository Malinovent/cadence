// S1.5: tasks. Pure state transitions on CadenceData (same contract as actions.ts:
// a new object when something changes, the same reference when nothing does).
//
// The rules (brief, S1.5):
// - one plain list, apart from the areas (JP, 2026-11-04: "keep categories cleaner"). `catId`
//   is still kept in saved data (tasks given an area earlier keep it) but nothing uses it.
// - dropped on a block, it joins that block's to-do list (blockId)
// - they go into existing blocks only: no estimates, no area, so no block of their own
//   (JP, 2026-11-04). Blocks made from a task earlier (sourceTaskId) keep working:
// - a block made from a single task has one tick: ticking the block finishes the task
// - when a block ends or is ticked, its unticked tasks go back to their list, "back from Tue",
//   never into another block
// - finished tasks leave the list; templates and roll forward copy blocks, never tasks
import { mondayOf } from "./balancedWeeks";
import type { Block, CadenceData, Task, Weeks } from "./model";
import { uid as defaultUid } from "./uid";

type Deps = { uid?: () => string; now?: () => number };
type WeekIndex = 0 | 1;

/** Keep each task's `order` equal to its place in the list (the stored shape carries it). */
const renumber = (tasks: Task[]): Task[] => tasks.map((t, i) => (t.order === i ? t : { ...t, order: i }));

const mapTask = (data: CadenceData, id: string, fn: (t: Task) => Task): CadenceData => {
  let changed = false;
  const tasks = data.tasks.map((t) => {
    if (t.id !== id) return t;
    const u = fn(t);
    if (u !== t) changed = true;
    return u;
  });
  return changed ? { ...data, tasks } : data;
};

const findBlock = (weeks: Weeks, id: string): { week: WeekIndex; block: Block } | null => {
  for (const w of [0, 1] as const) {
    const block = weeks[w].find((b) => b.id === id);
    if (block) return { week: w, block };
  }
  return null;
};

/** The tasks in a block's to-do list, in list order. */
export const blockTasks = (tasks: readonly Task[], blockId: string): Task[] =>
  tasks.filter((t) => t.blockId === blockId);

/** A block made from one task, holding only that task: it shows one tick, no checklist. */
export const singleTaskOf = (tasks: readonly Task[], block: Block): Task | null => {
  if (!block.sourceTaskId) return null;
  const inBlock = blockTasks(tasks, block.id);
  return inBlock.length === 1 && inBlock[0].id === block.sourceTaskId ? inBlock[0] : null;
};

/**
 * Send the unticked tasks of these blocks back to their list ("back from <day>").
 * `unlinkDone`: also unlink finished ones (the block is gone); otherwise they stay ticked inside it.
 */
export const releaseTasks = (tasks: Task[], blocks: readonly Block[], unlinkDone: boolean): Task[] => {
  if (blocks.length === 0) return tasks;
  const dayOf = new Map(blocks.map((b) => [b.id, b.day]));
  let changed = false;
  const out = tasks.map((t) => {
    if (t.blockId === undefined || !dayOf.has(t.blockId)) return t;
    if (t.done && !unlinkDone) return t;
    changed = true;
    const { blockId: _b, attachedAt: _a, ...rest } = t;
    void _b;
    void _a;
    return t.done ? rest : { ...rest, returnedFrom: dayOf.get(t.blockId)! };
  });
  return changed ? out : tasks;
};

/** Blocks that were in `before` and are not in `after` (removed, replaced or rolled away): free their tasks. */
export const releaseRemoved = (before: CadenceData, after: CadenceData): CadenceData => {
  if (after.tasks.every((t) => t.blockId === undefined)) return after;
  const kept = new Set([...after.weeks[0], ...after.weeks[1]].map((b) => b.id));
  const gone = [...before.weeks[0], ...before.weeks[1]].filter((b) => !kept.has(b.id));
  const tasks = releaseTasks(after.tasks, gone, true);
  return tasks === after.tasks ? after : { ...after, tasks };
};

// ---------------------------------------------------------------- list edits

export const addTask = (data: CadenceData, name: string, deps: Deps = {}): CadenceData => {
  const trimmed = name.trim();
  if (!trimmed) return data;
  const task: Task = {
    id: (deps.uid ?? defaultUid)(),
    name: trimmed,
    catId: null,
    done: false,
    order: data.tasks.length,
    createdAt: (deps.now ?? Date.now)(),
  };
  return { ...data, tasks: [...data.tasks, task] };
};

/** Tick or untick a task. Finished tasks leave the list (they stay ticked inside their block, if any). */
export const toggleTask = (data: CadenceData, id: string, deps: Deps = {}): CadenceData =>
  mapTask(data, id, (t) => {
    if (t.done) {
      const { doneAt: _d, ...rest } = t;
      void _d;
      return { ...rest, done: false };
    }
    const { returnedFrom: _r, ...rest } = t;
    void _r;
    return { ...rest, done: true, doneAt: (deps.now ?? Date.now)() };
  });

/** Dismiss a task for good; a block made from it keeps its name but forgets the link. */
export const removeTask = (data: CadenceData, id: string): CadenceData => {
  if (!data.tasks.some((t) => t.id === id)) return data;
  const strip = (w: Block[]) =>
    w.some((b) => b.sourceTaskId === id)
      ? w.map((b) => {
          if (b.sourceTaskId !== id) return b;
          const { sourceTaskId: _s, ...rest } = b;
          void _s;
          return rest;
        })
      : w;
  const weeks: Weeks = [strip(data.weeks[0]), strip(data.weeks[1])];
  return { ...data, weeks, tasks: renumber(data.tasks.filter((t) => t.id !== id)) };
};

// ---------------------------------------------------------------- tasks and blocks

/** Dropped on a block: the task joins its to-do list (from another block too; a finished task can't). */
export const attachTask = (data: CadenceData, taskId: string, blockId: string, deps: Deps = {}): CadenceData => {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task || task.done || task.blockId === blockId || !findBlock(data.weeks, blockId)) return data;
  return mapTask(data, taskId, (t) => {
    const { returnedFrom: _r, ...rest } = t;
    void _r;
    return { ...rest, blockId, attachedAt: (deps.now ?? Date.now)() };
  });
};

/** Take a task out of its block by hand: back to its list, without a "back from" note. */
export const detachTask = (data: CadenceData, taskId: string): CadenceData =>
  mapTask(data, taskId, (t) => {
    if (t.blockId === undefined) return t;
    const { blockId: _b, attachedAt: _a, ...rest } = t;
    void _b;
    void _a;
    return rest;
  });

/**
 * A block was just ticked or unticked (call with the block as it is now).
 * Ticked: a single-task block finishes its task; otherwise unticked tasks go back to their list.
 * Unticked: a single-task block's task is open again.
 */
export const afterBlockTick = (data: CadenceData, block: Block, deps: Deps = {}): CadenceData => {
  if (block.done) {
    const single = singleTaskOf(data.tasks, block);
    if (single) return single.done ? data : toggleTask(data, single.id, deps);
    const tasks = releaseTasks(data.tasks, [block], false);
    return tasks === data.tasks ? data : { ...data, tasks };
  }
  const source = block.sourceTaskId ? data.tasks.find((t) => t.id === block.sourceTaskId) : undefined;
  if (source && source.done && source.blockId === block.id && blockTasks(data.tasks, block.id).length === 1)
    return toggleTask(data, source.id, deps);
  return data;
};

/**
 * Blocks of this week (Week 1) that ended without a tick, after the task joined them, send their
 * unticked tasks back. A task put into a block that's already over (logging after the fact) stays
 * until the block is ticked or rolled away. Idempotent; run as the clock moves.
 */
export const returnEnded = (data: CadenceData, now: Date): CadenceData => {
  if (data.tasks.every((t) => t.blockId === undefined || t.done)) return data;
  const monday = mondayOf(now);
  const endOf = (b: Block) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + b.day, 0, b.start + b.mins).getTime();
  const at = now.getTime();
  const ended = new Map<string, Block>();
  for (const b of data.weeks[0]) if (!b.done && endOf(b) <= at) ended.set(b.id, b);
  if (ended.size === 0) return data;
  const isDue = (t: Task) => {
    const b = t.blockId === undefined ? undefined : ended.get(t.blockId);
    return b !== undefined && !t.done && endOf(b) > (t.attachedAt ?? 0);
  };
  if (!data.tasks.some(isDue)) return data;
  const tasks = data.tasks.map((t) => (isDue(t) ? releaseTasks([t], [ended.get(t.blockId!)!], false)[0] : t));
  return { ...data, tasks };
};

/** An area was deleted: tasks that had it forget it (never go away). */
export const unsortArea = (data: CadenceData, catId: string): CadenceData =>
  data.tasks.some((t) => t.catId === catId)
    ? { ...data, tasks: data.tasks.map((t) => (t.catId === catId ? { ...t, catId: null } : t)) }
    : data;

// ---------------------------------------------------------------- reading the list

/** The list shows open tasks only, in the user's order; ones in a block too (they show where they are). */
export const openTasks = (tasks: readonly Task[]): Task[] => tasks.filter((t) => !t.done);

/** "Show 3 done this week": tasks finished since this Monday. */
export const doneThisWeek = (tasks: readonly Task[], now: Date): Task[] => {
  const from = mondayOf(now).getTime();
  return tasks.filter((t) => t.done && (t.doneAt ?? 0) >= from);
};

