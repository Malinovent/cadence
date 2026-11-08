// S1.10 Neutral stats: describe, don't judge. "Rest was lighter than your floor last week",
// never "You missed rest". One calm sentence per area about a finished week, from ticked time
// (the same source as balanced weeks).
import { addDays, mondayOf, tickedMins } from "./balancedWeeks";
import { balance, type Balance } from "./guardrail";
import { fmtDur } from "./time";
import type { Category, HistoryEntry } from "./model";
import { DESCRIBE_EN, type DescribeWords } from "./words";

export type { DescribeWords };

export type WeekLine = { catId: string; name: string; color: string; balance: Balance; text: string };

/** Describe one area's ticked time against its guardrail, without judging it. */
export function describeArea(cat: Category, tickedMinutes: number, w: DescribeWords = DESCRIBE_EN): string {
  const name = cat.name.trim() || "?";
  const b = balance(cat.limit, tickedMinutes);
  const h = (mins: number) => fmtDur(mins, w.lang); // "2h30", like the rest of the app
  const d = h(b.plannedMins);
  const l = cat.limit;
  if (b.plannedMins === 0 && l.kind !== "ceiling") return w.noTicks(name);
  if (l.kind === "floor") return b.state === "met" ? w.floorMet(name, d, h(l.min)) : w.floorShort(name, d, h(l.min));
  if (l.kind === "ceiling")
    return b.state === "over" ? w.ceilingOver(name, h(b.overMins), d, h(l.max)) : w.ceilingWithin(name, d, h(l.max));
  if (b.state === "inRange") return w.rangeIn(name, d, h(l.min), h(l.max));
  if (b.state === "short") return w.rangeShort(name, d, h(l.min), h(l.max));
  return w.rangeOver(name, h(b.overMins), d, h(l.max));
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
    return {
      catId: c.id,
      name: c.name,
      color: c.color,
      balance: balance(c.limit, mins),
      text: describeArea(c, mins, w),
    };
  });
}
