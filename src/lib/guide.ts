// Onboarding path 1 + checklist (JP, 2026-11-07): after a short purpose page, the app teaches
// one thing at a time in the real app (drag one area in, tick it), then a "Getting started"
// checklist takes over at the person's own pace, ending with templates. Pure rules only.
// The checklist counts what's done from the moment it starts (JP: a replay showed 5 of 5 at once).
import { defaultCategories } from "./constants";
import type { Block, CadenceData, Category } from "./model";
import { jsonEqual } from "./syncLogic";

type WeekIndex = 0 | 1;

export type CheckItem = "place" | "tick" | "area" | "task" | "template";
export const CHECK_ITEMS: readonly CheckItem[] = ["place", "tick", "area", "task", "template"];
export type CheckDone = Partial<Record<CheckItem, true>>;

/** One guided step: what it points at, and what ends it. */
export type Guide =
  | { step: "drag"; catId: string; week: WeekIndex; before: number } // drag (or tap) this area in
  | { step: "placed"; catId: string; week: WeekIndex } // its count filled: explain it
  | { step: "tick"; blockId: string } // tick this block
  | { step: "area" } // make an area your own (Areas page)
  | { step: "task" } // add a task
  | { step: "template" }; // try a starter week

/** The area the first guided drag uses: the first one in the panel (the buffer isn't an area). */
export const guideArea = (data: CadenceData): string | null => data.cats[0]?.id ?? null;

/** Blocks of an area in a week. */
export const countIn = (data: CadenceData, week: WeekIndex, catId: string): number =>
  data.weeks[week].filter((b) => b.catIds.includes(catId)).length;

/** The block to tick: the newest open one of that area, else the first open one of the week. */
export function tickTarget(data: CadenceData, week: WeekIndex, catId?: string): Block | null {
  const open = data.weeks[week].filter((b) => !b.buffer && !b.done);
  const mine = catId ? open.filter((b) => b.catIds.includes(catId)) : [];
  return mine[mine.length - 1] ?? open[0] ?? null;
}

const allBlocks = (d: CadenceData): Block[] => [...d.weeks[0], ...d.weeks[1]];
const untouchedDefaults = (cats: Category[]): boolean =>
  jsonEqual(cats, defaultCategories("en")) || jsonEqual(cats, defaultCategories("fr"));

/**
 * What one change to the data did, for the checklist. Judged change by change (the app keeps what's
 * earned), so the checklist counts what the person does from the moment it starts, or starts over,
 * whatever their weeks already hold:
 * - place: a block of an area that wasn't one before (placed, or a buffer filled);
 * - tick: an open block ticked (not one brought back already ticked by Undo);
 * - area: an area renamed or changed, or one added or deleted on its own; not the areas a starter
 *   week (or its Undo) brings or takes, and never a language switch of the untouched defaults;
 * - task: a task put into a block that was already there (not tasks Undo brings back);
 * - template: a template saved. Trying a starter week or applying a template the app reports itself.
 */
export function progress(prev: CadenceData, next: CadenceData): CheckDone {
  const got: CheckDone = {};
  if (prev === next) return got;
  const before = new Map(allBlocks(prev).map((b) => [b.id, b]));
  const after = allBlocks(next);
  const wasArea = (id: string) => {
    const b = before.get(id);
    return !!b && !b.buffer;
  };
  if (after.some((b) => !b.buffer && !wasArea(b.id))) got.place = true;
  if (after.some((b) => b.done && before.get(b.id)?.done === false)) got.tick = true;

  if (!jsonEqual(prev.cats, next.cats) && !untouchedDefaults(next.cats)) {
    const old = new Map(prev.cats.map((c) => [c.id, c]));
    const edited = next.cats.some((c) => old.has(c.id) && !jsonEqual(old.get(c.id), c));
    const sameAreas = next.cats.length === prev.cats.length && next.cats.every((c) => old.has(c.id));
    const noNewBlocks = after.every((b) => before.has(b.id)); // a starter week or Undo brings new ones
    if (edited || (!sameAreas && noNewBlocks)) got.area = true;
  }

  const wasIn = new Map(prev.tasks.map((t) => [t.id, t.blockId]));
  if (next.tasks.some((t) => t.blockId !== undefined && t.blockId !== wasIn.get(t.id) && before.has(t.blockId)))
    got.task = true;

  const saved = new Set(prev.templates.map((t) => t.id));
  if (next.templates.some((t) => !saved.has(t.id))) got.template = true;
  return got;
}

export const doneCount = (done: CheckDone): number => CHECK_ITEMS.filter((i) => done[i]).length;

/**
 * The step after this one, given the data now: a drag that placed a block moves on to explaining
 * its count; a tick, an area made one's own, a task in a block or a template tried ends its step.
 * The same object when nothing happened yet.
 */
export function nextGuide(g: Guide, data: CadenceData, done: CheckDone): Guide | null {
  switch (g.step) {
    case "drag":
      return countIn(data, g.week, g.catId) > g.before ? { step: "placed", catId: g.catId, week: g.week } : g;
    case "tick": {
      const block = [...data.weeks[0], ...data.weeks[1]].find((b) => b.id === g.blockId);
      return !block || block.done ? null : g;
    }
    case "area":
      return done.area ? null : g;
    case "task":
      return done.task ? null : g;
    case "template":
      return done.template ? null : g;
    default:
      return g;
  }
}

export type Rect = { left: number; top: number; width: number; height: number };

/** Whether a target needs scrolling to be seen: above the screen, or below `bottom` (the phone tray's top). */
export const outOfView = (t: Rect, bottom: number): boolean => t.top < 0 || t.top + t.height > bottom;

/**
 * Where the hint bubble sits: under its target, or above when there's no room below (the phone
 * tray is at the bottom), kept inside the screen. No target: low and centred.
 */
export function coachPosition(
  target: Rect | null,
  bubble: { w: number; h: number },
  viewport: { w: number; h: number },
  gap = 12,
  margin = 12,
): { left: number; top: number } {
  if (!target)
    return { left: Math.max(margin, (viewport.w - bubble.w) / 2), top: Math.max(margin, viewport.h - bubble.h - 96) };
  const left = Math.min(Math.max(margin, target.left), Math.max(margin, viewport.w - bubble.w - margin));
  const below = target.top + target.height + gap;
  const above = target.top - gap - bubble.h;
  const top =
    below + bubble.h <= viewport.h - margin
      ? below
      : above >= margin
        ? above
        : Math.max(margin, viewport.h - bubble.h - margin);
  return { left, top };
}
