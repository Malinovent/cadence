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

/** "7 h 15", "6 h", "45 min" (the brief's wording for task time). */
export const fmtHM = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
};

/** "7 h 15 of tasks · 6 h planned this week", or null when no open task has an estimate. Shown in grey, never red. */
export const tasksLine = (taskMins: number, plannedMins: number, week: WeekIndex): string | null =>
  taskMins > 0 ? `${fmtHM(taskMins)} of tasks · ${fmtHM(plannedMins)} planned ${week === 0 ? "this" : "next"} week` : null;

/** Under a task's name: its estimate, where it is ("Tue 9am", "next week · Thu 2pm"), or "back from Tue". */
export function taskNote(task: Task, weeks: CadenceData["weeks"]): string {
  const parts: string[] = [];
  if (task.estMins) parts.push(fmtHM(task.estMins));
  const w = task.blockId === undefined ? -1 : weeks.findIndex((list) => list.some((b) => b.id === task.blockId));
  if (w >= 0) {
    const b = weeks[w].find((x) => x.id === task.blockId)!;
    parts.push(`${w === 1 ? "next week · " : ""}${DAY_SHORT[b.day]} ${fmtTime(b.start)}`);
  } else if (task.returnedFrom !== undefined) parts.push(`back from ${DAY_SHORT[task.returnedFrom]}`);
  return parts.join(" · ");
}
