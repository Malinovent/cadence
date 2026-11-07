// Onboarding path 1 + checklist (JP, 2026-11-07): after a short purpose page, the app teaches
// one thing at a time in the real app (drag one area in, tick it), then a "Getting started"
// checklist takes over at the person's own pace, ending with templates. Pure rules only.
import { defaultCategories } from "./constants";
import type { Block, CadenceData } from "./model";
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

/**
 * What the checklist shows as done: worked out from the data, and sticky (once done it stays
 * ticked, so un-ticking a block never takes a check away). "template" also comes from trying
 * a starter week or applying a template, which the app reports as it happens.
 */
export function checkDone(data: CadenceData, stored: CheckDone): CheckDone {
  const blocks = [...data.weeks[0], ...data.weeks[1]].filter((b) => !b.buffer);
  const done: CheckDone = { ...stored };
  if (blocks.length > 0 || data.history.length > 0) done.place = true;
  if (data.history.length > 0 || blocks.some((b) => b.done)) done.tick = true;
  if (!jsonEqual(data.cats, defaultCategories("en")) && !jsonEqual(data.cats, defaultCategories("fr")))
    done.area = true;
  if (data.tasks.some((t) => t.blockId !== undefined || t.done)) done.task = true;
  if (data.templates.length > 0) done.template = true;
  return done;
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
