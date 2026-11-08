// The week in review (JP, 2026-11-08): when Week 1 rolls forward, a short summary of how it went,
// from its ticked blocks, judged by the same rules as balanced weeks (Settings → Balanced weeks).
// Neutral words (S1.10's describeArea); a balanced week gets a fanfare. Pure rules only.
import { addDays, limitKept, mondayOf, tickedMins, weekBalanced, type BalanceRules } from "./balancedWeeks";
import { describeArea } from "./describe";
import { fmtH, limitLabel } from "./guardrail";
import { LIB_EN, type LibWords } from "./words";
import type { CadenceData, Category, HistoryEntry } from "./model";

// a short row for the eye (JP: "it's verbose"): name, hours ticked, the target; the sentence is for screen readers
export type ReviewLine = {
  catId: string;
  name: string;
  color: string;
  kept: boolean;
  hours: string; // "4" (decimal comma in French)
  limit: string; // "At least 4 h"
  text: string; // "Rest reached at least 4 h (4 h)."
  icon?: string;
};
export type WeekReview = {
  balanced: boolean; // every area kept its weekly time
  ticked: number; // blocks ticked (buffers have no tick)
  total: number; // blocks that could be ticked
  lines: ReviewLine[]; // one per area, in area order
};

/** One area's row: its ticked hours, its target, whether it kept it, and the sentence for screen readers. */
export function areaLine(c: Category, mins: number, rules: BalanceRules, w: LibWords = LIB_EN): ReviewLine {
  return {
    catId: c.id,
    name: c.name,
    color: c.color,
    kept: limitKept(c.limit, mins, rules),
    hours: hoursText(mins, w),
    limit: limitLabel(c.limit, w),
    text: describeArea(c, mins, w.describe),
    ...(c.icon ? { icon: c.icon } : {}),
  };
}

/** "14", "1.5" / "1,5": hours without a trailing zero. */
export const hoursText = (mins: number, w: LibWords = LIB_EN): string =>
  w.lang === "fr" ? fmtH(mins).replace(".", ",") : fmtH(mins);

/** Stats → Last week (the calendar week before this one), one row per area (JP: "less verbose"). */
export function lastWeekLines(
  cats: readonly Category[],
  history: readonly HistoryEntry[],
  now: Date,
  rules: BalanceRules,
  w: LibWords = LIB_EN,
): ReviewLine[] {
  const ticked = tickedMins(history, addDays(mondayOf(now), -7));
  return cats.map((c) => areaLine(c, ticked.get(c.id) ?? 0, rules, w));
}

/** How Week 1 went, from its ticked blocks (a block for several areas counts fully to each). */
export function weekReview(data: CadenceData, rules: BalanceRules, w: LibWords = LIB_EN): WeekReview {
  const blocks = data.weeks[0].filter((b) => !b.buffer);
  const mins = new Map<string, number>();
  for (const b of blocks) if (b.done) for (const c of b.catIds) mins.set(c, (mins.get(c) ?? 0) + b.mins);
  return {
    balanced: data.cats.length > 0 && weekBalanced(data.cats, mins, rules),
    ticked: blocks.filter((b) => b.done).length,
    total: blocks.length,
    lines: data.cats.map((c) => areaLine(c, mins.get(c.id) ?? 0, rules, w)),
  };
}

/** Nothing planned and nothing ticked: no summary, the roll just happens. */
export const hasReview = (r: WeekReview): boolean => r.total > 0;
