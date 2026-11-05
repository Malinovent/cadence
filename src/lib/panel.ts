// S1.4: one panel for areas and tasks. What the panel lists, in order, without any DOM.
import { BUFFER_COLOR, BUFFER_ID, BUFFER_MINS } from "./constants";
import type { WeekIndex } from "./actions";
import { limitLabel, type Balance } from "./guardrail";
import type { CadenceData, Task } from "./model";
import { weekBalance } from "./stats";
import { DAY_SHORT } from "./tasks";
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
export function panelAreas(data: CadenceData, week: WeekIndex): PanelArea[] {
  const rows: PanelArea[] = weekBalance(data, week).map(({ cat, balance }) => ({
    id: cat.id,
    name: cat.name || "Untitled",
    color: cat.color,
    mins: cat.blockMins,
    balance,
    limitText: limitLabel(cat.limit),
  }));
  rows.push({
    id: BUFFER_ID,
    name: "Buffer",
    color: BUFFER_COLOR,
    mins: BUFFER_MINS,
    balance: null,
    limitText: null,
  });
  return rows;
}

/** The calm notes under the areas ("Rest is 3 h short of its floor"), only the ones that apply. */
export const panelNotes = (data: CadenceData, week: WeekIndex): string[] =>
  weekBalance(data, week)
    .map((r) => r.note)
    .filter((n): n is string => !!n);

/** How many tasks are still open (the phone Tasks tab shows it). */
export const openCount = (tasks: readonly Task[]): number => tasks.filter((t) => !t.done).length;

// ---------------------------------------------------------------- S1.5 tasks in the panel

/** Under a task's name: where it is ("Tue 9am", "next week · Thu 2pm"), or "back from Tue". */
export function taskNote(task: Task, weeks: CadenceData["weeks"]): string {
  const w = task.blockId === undefined ? -1 : weeks.findIndex((list) => list.some((b) => b.id === task.blockId));
  if (w >= 0) {
    const b = weeks[w].find((x) => x.id === task.blockId)!;
    return `${w === 1 ? "next week · " : ""}${DAY_SHORT[b.day]} ${fmtTime(b.start)}`;
  }
  return task.returnedFrom !== undefined ? `back from ${DAY_SHORT[task.returnedFrom]}` : "";
}
