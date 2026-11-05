import { LIB_EN, type LibWords } from "./words";
// S1.4: one panel for areas and tasks. What the panel lists, in order, without any DOM.
import { BUFFER_COLOR, BUFFER_ID, BUFFER_MINS } from "./constants";
import type { WeekIndex } from "./actions";
import { limitLabel, type Balance } from "./guardrail";
import type { CadenceData, Task } from "./model";
import { weekBalance } from "./stats";
import { fmtTime } from "./time";

/** One draggable row: an area with this week's balance, or the buffer (no area, no balance). */
export type PanelArea = {
  id: string; // the category id, or BUFFER_ID
  name: string;
  color: string;
  mins: number; // the length a drop or tap places
  balance: Balance | null; // null for the buffer
  limitText: string | null;
};

/** Areas in their own order, then the buffer last. */
export function panelAreas(data: CadenceData, week: WeekIndex, w: LibWords = LIB_EN): PanelArea[] {
  const rows: PanelArea[] = weekBalance(data, week, w).map(({ cat, balance }) => ({
    id: cat.id,
    name: cat.name || w.panel.untitled,
    color: cat.color,
    mins: cat.blockMins,
    balance,
    limitText: limitLabel(cat.limit, w),
  }));
  rows.push({
    id: BUFFER_ID,
    name: w.panel.buffer,
    color: BUFFER_COLOR,
    mins: BUFFER_MINS,
    balance: null,
    limitText: null,
  });
  return rows;
}

/** The calm notes under the areas ("Rest is 3 h short of its floor"), only the ones that apply. */
export const panelNotes = (data: CadenceData, week: WeekIndex, w: LibWords = LIB_EN): string[] =>
  weekBalance(data, week, w)
    .map((r) => r.note)
    .filter((n): n is string => !!n);

/** How many tasks are still open (the phone Tasks tab shows it). */
export const openCount = (tasks: readonly Task[]): number => tasks.filter((t) => !t.done).length;

// ---------------------------------------------------------------- S1.5 tasks in the panel

/** Under a task's name: where it is ("Tue 9am", "next week · Thu 2pm"), or "back from Tue". */
export function taskNote(task: Task, weeks: CadenceData["weeks"], w: LibWords = LIB_EN): string {
  const wk = task.blockId === undefined ? -1 : weeks.findIndex((list) => list.some((b) => b.id === task.blockId));
  if (wk >= 0) {
    const b = weeks[wk].find((x) => x.id === task.blockId)!;
    return `${wk === 1 ? `${w.panel.nextWeek} · ` : ""}${w.days[b.day]} ${fmtTime(b.start, w.lang)}`;
  }
  return task.returnedFrom !== undefined ? w.panel.backFrom(w.days[task.returnedFrom]) : "";
}

/**
 * The colour dots on a task that sits in a block: one per area of that block, in its order
 * (the buffer's grey for a buffer). Empty when the task isn't in a block.
 */
export function taskDots(task: Task, data: Pick<CadenceData, "weeks" | "cats">): string[] {
  if (task.blockId === undefined) return [];
  const b = data.weeks[0].find((x) => x.id === task.blockId) ?? data.weeks[1].find((x) => x.id === task.blockId);
  if (!b) return [];
  if (b.buffer) return [BUFFER_COLOR];
  return b.catIds.map((id) => data.cats.find((c) => c.id === id)?.color).filter((c): c is string => !!c);
}
