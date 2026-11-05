// S1.10 Neutral stats: describe, don't judge. "Rest was lighter than your floor last week",
// never "You missed rest". One calm sentence per area about a finished week, from ticked time
// (the same source as balanced weeks).
import { addDays, mondayOf, tickedMins } from "./balancedWeeks";
import { balance, fmtH, type Balance } from "./guardrail";
import type { Category, HistoryEntry } from "./model";

export type WeekLine = { catId: string; name: string; color: string; balance: Balance; text: string };

/** The words, kept apart so they can be translated (S1.9). */
export type DescribeWords = {
  noTicks: (name: string) => string;
  floorMet: (name: string, done: string, min: string) => string;
  floorShort: (name: string, done: string, min: string) => string;
  ceilingWithin: (name: string, done: string, max: string) => string;
  ceilingOver: (name: string, over: string, done: string, max: string) => string;
  rangeIn: (name: string, done: string, min: string, max: string) => string;
  rangeShort: (name: string, done: string, min: string, max: string) => string;
  rangeOver: (name: string, over: string, done: string, max: string) => string;
};

export const DESCRIBE_EN: DescribeWords = {
  noTicks: (n) => `No ${n} blocks were ticked.`,
  floorMet: (n, d, min) => `${n} reached your floor (${d} of ${min} h).`,
  floorShort: (n, d, min) => `${n} was lighter than your floor (${d} of ${min} h).`,
  ceilingWithin: (n, d, max) => `${n} stayed under your ceiling (${d} of ${max} h).`,
  ceilingOver: (n, o, d, max) => `${n} went ${o} h past your ceiling (${d} of ${max} h).`,
  rangeIn: (n, d, min, max) => `${n} landed in your range (${d} h, ${min}–${max} h).`,
  rangeShort: (n, d, min, max) => `${n} was lighter than your range (${d} h, ${min}–${max} h).`,
  rangeOver: (n, o, d, max) => `${n} went ${o} h past your range (${d} of ${max} h).`,
};

/** Describe one area's ticked time against its guardrail, without judging it. */
export function describeArea(cat: Category, tickedMinutes: number, w: DescribeWords = DESCRIBE_EN): string {
  const name = cat.name.trim() || "?";
  const b = balance(cat.limit, tickedMinutes);
  const d = fmtH(b.plannedMins);
  const l = cat.limit;
  if (b.plannedMins === 0 && l.kind !== "ceiling") return w.noTicks(name);
  if (l.kind === "floor") return b.state === "met" ? w.floorMet(name, d, fmtH(l.min)) : w.floorShort(name, d, fmtH(l.min));
  if (l.kind === "ceiling")
    return b.state === "over" ? w.ceilingOver(name, fmtH(b.overMins), d, fmtH(l.max)) : w.ceilingWithin(name, d, fmtH(l.max));
  if (b.state === "inRange") return w.rangeIn(name, d, fmtH(l.min), fmtH(l.max));
  if (b.state === "short") return w.rangeShort(name, d, fmtH(l.min), fmtH(l.max));
  return w.rangeOver(name, fmtH(b.overMins), d, fmtH(l.max));
}

/** Last week (the calendar week before this one), one line per area, in area order. */
export function describeLastWeek(
  cats: readonly Category[],
  history: readonly HistoryEntry[],
  now: Date,
  w: DescribeWords = DESCRIBE_EN,
): WeekLine[] {
  const ticked = tickedMins(history, addDays(mondayOf(now), -7));
  return cats.map((c) => {
    const mins = ticked.get(c.id) ?? 0;
    return { catId: c.id, name: c.name, color: c.color, balance: balance(c.limit, mins), text: describeArea(c, mins, w) };
  });
}
