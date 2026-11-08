// Stats, week by week (JP, 2026-11-08: "everything except 4"): any week's rows with a bar and what
// it missed by, the last 12 weeks per area, and the months under the season's squares. Weeks are
// real calendar weeks of ticked time, as for balanced weeks (a block counts in the week it's ticked).
import { addDays, dayKey, limitKept, mondayOf, tickedMins, type BalanceRules } from "./balancedWeeks";
import type { Limit } from "./guardrail";
import type { Category, HistoryEntry } from "./model";
import { fmtDur } from "./time";
import { LIB_EN, type LibWords } from "./words";

/** Local noon of a "2026-11-02" key: safe from daylight-saving edges. */
export const fromKey = (key: string): Date => new Date(`${key}T12:00:00`);

/** The week `n` weeks after (or before) the week of `key`, as a Monday key. */
export const shiftWeek = (key: string, n: number): string => dayKey(addDays(mondayOf(fromKey(key)), n * 7));

/** The weeks Stats can show: from the week of the first tick (at the latest last week) to this week. */
export function weekSpan(history: readonly HistoryEntry[], now: Date): { first: string; last: string } {
  const thisMonday = mondayOf(now);
  const lastWeek = addDays(thisMonday, -7);
  const firstTick = history.length ? mondayOf(new Date(Math.min(...history.map((e) => e.date)))) : lastWeek;
  return { first: dayKey(firstTick < lastWeek ? firstTick : lastWeek), last: dayKey(thisMonday) };
}

/** What a week missed by: short of the low end, past the top, or (this week, still open) still to go. */
export type Gap = { kind: "short" | "over" | "toGo"; mins: number };

export function weekGap(l: Limit, mins: number, rules: BalanceRules, open: boolean): Gap | null {
  if (limitKept(l, mins, rules)) return null;
  if (l.kind !== "floor" && mins > l.max) return { kind: "over", mins: mins - l.max };
  if (l.kind !== "ceiling" && mins < l.min) return { kind: open ? "toGo" : "short", mins: l.min - mins };
  return null;
}

/** "1h short", "30m over", "2h to go" (FR « il manque 1 h », « 30 min de trop », « encore 2 h »). */
export function gapText(g: Gap, w: LibWords = LIB_EN): string {
  const d = fmtDur(g.mins, w.lang);
  return g.kind === "over" ? w.count.over(d) : g.kind === "toGo" ? w.count.toGo(d) : w.count.short(d);
}

export type WeekRow = { cat: Category; mins: number; kept: boolean; gap: Gap | null };

/** One row per area for the week starting on `monday`; `open` for this week, still going. */
export function weekRows(
  cats: readonly Category[],
  history: readonly HistoryEntry[],
  monday: string,
  rules: BalanceRules,
  open: boolean,
): WeekRow[] {
  const ticked = tickedMins(history, mondayOf(fromKey(monday)));
  return cats.map((cat) => {
    const mins = ticked.get(cat.id) ?? 0;
    return { cat, mins, kept: limitKept(cat.limit, mins, rules), gap: weekGap(cat.limit, mins, rules, open) };
  });
}

/**
 * A row's bar, as fractions of its track: the fill, the striped part past an "at most" or
 * "between" top, and the target marks (one, or two for "between"). The track runs a little past
 * the larger of the target and the time, so a mark never sits on the very end.
 */
export function rowBar(l: Limit, mins: number): { fill: number; over: number; marks: number[] } {
  const top = l.kind === "floor" ? l.min : l.max;
  const full = Math.max(top, mins, 30) * 1.15;
  const cap = l.kind === "floor" ? Infinity : l.max;
  return {
    fill: Math.min(mins, cap) / full,
    over: mins > cap ? (mins - cap) / full : 0,
    marks: l.kind === "range" ? [l.min / full, l.max / full] : [top / full],
  };
}

export type TrendWeek = { monday: string; mins: number; kept: boolean; counted: boolean };
export type AreaTrend = {
  cat: Category;
  /** oldest first; a week before the first tick ever isn't counted */
  weeks: TrendWeek[];
  kept: number;
  counted: number;
  /** the hours the columns are drawn against: the largest week, or a little past the target */
  scale: number;
};

/** The last `n` finished weeks per area (not this one), oldest first. */
export function areaTrends(
  cats: readonly Category[],
  history: readonly HistoryEntry[],
  now: Date,
  rules: BalanceRules,
  n = 12,
): AreaTrend[] {
  const thisMonday = mondayOf(now);
  const firstTick = history.length ? mondayOf(new Date(Math.min(...history.map((e) => e.date)))) : null;
  const mondays = Array.from({ length: n }, (_, i) => addDays(thisMonday, -7 * (n - i)));
  const ticked = mondays.map((m) => tickedMins(history, m));
  return cats.map((cat) => {
    const weeks = mondays.map((m, i) => {
      const mins = ticked[i].get(cat.id) ?? 0;
      const counted = firstTick !== null && m >= firstTick;
      return { monday: dayKey(m), mins, counted, kept: counted && limitKept(cat.limit, mins, rules) };
    });
    const top = cat.limit.kind === "floor" ? cat.limit.min : cat.limit.max;
    return {
      cat,
      weeks,
      kept: weeks.filter((w) => w.kept).length,
      counted: weeks.filter((w) => w.counted).length,
      scale: Math.max(top * 1.25, ...weeks.map((w) => w.mins), 60),
    };
  });
}

/** Under the season's squares: the index of each square that starts a month (the first always does). */
export function monthStarts(mondays: readonly string[]): number[] {
  return mondays.flatMap((k, i) =>
    i === 0 || fromKey(k).getMonth() !== fromKey(mondays[i - 1]).getMonth() ? [i] : [],
  );
}
