// Balanced weeks instead of daily streaks (sprint 1, S1.3).
//
// JP's choices (2026-11-04): a week is judged on TICKED time only, and the number shown is ALL
// balanced weeks this season (it never goes down). A grace week only changes how its square looks.
//
// Ticked time comes from `history` (one entry per area each time a block is ticked, with the
// tick time), grouped into real calendar weeks, Monday to Sunday, in local time. So nothing new
// is stored, nothing extra is synced, and it works whether or not the week is rolled forward.
import type { Limit } from "./guardrail";
import type { Category, HistoryEntry } from "./model";

/** User-changeable rules; the brief's defaults: floors 80% met, ceilings passed by at most 10%. */
export type BalanceRules = { floorPct: number; ceilingOverPct: number };
export const DEFAULT_RULES: BalanceRules = { floorPct: 80, ceilingOverPct: 10 };

export const clampRules = (r: Partial<BalanceRules>): BalanceRules => ({
  floorPct: clamp(Number(r.floorPct), 0, 100, DEFAULT_RULES.floorPct),
  ceilingOverPct: clamp(Number(r.ceilingOverPct), 0, 100, DEFAULT_RULES.ceilingOverPct),
});
const clamp = (n: number, lo: number, hi: number, dflt: number) =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;

// ---------------------------------------------------------------- calendar

/** Local midnight of the Monday of the week holding `d`. */
export const mondayOf = (d: Date): Date => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
};

/** "2026-11-16" for a local date. */
export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Local midnight of the first day of the season holding `d`. Seasons follow the weather:
 * winter Dec–Feb, spring Mar–May, summer Jun–Aug, fall Sep–Nov.
 */
export const seasonStart = (d: Date): Date => {
  const m = d.getMonth(); // 0 = Jan
  const startMonth = m === 11 ? 11 : m < 2 ? -1 : m - (m - 2) % 3; // Dec, Mar, Jun, Sep
  return new Date(d.getFullYear(), startMonth, 1); // month -1 = December of the year before
};

/** The Mondays of the season's weeks, from the first Monday on or after the season's first day up to this week. */
export function seasonMondays(now: Date): Date[] {
  const start = seasonStart(now);
  let m = mondayOf(start);
  if (m < start) m = addDays(m, 7); // a week belongs to the season its Monday is in
  const last = mondayOf(now);
  const out: Date[] = [];
  for (; m <= last; m = addDays(m, 7)) out.push(m);
  return out;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// ---------------------------------------------------------------- judging a week

/** Ticked minutes per area in the week starting on `monday`. */
export function tickedMins(history: readonly HistoryEntry[], monday: Date): Map<string, number> {
  const from = monday.getTime();
  const to = addDays(monday, 7).getTime();
  const out = new Map<string, number>();
  for (const e of history) if (e.date >= from && e.date < to) out.set(e.catId, (out.get(e.catId) ?? 0) + e.mins);
  return out;
}

/** One area's guardrail is kept: floors/range low end at least floorPct met, ceilings/range top passed by at most ceilingOverPct. */
export function limitKept(l: Limit, mins: number, rules: BalanceRules): boolean {
  const lowOk = (min: number) => mins >= (min * rules.floorPct) / 100;
  const highOk = (max: number) => mins <= max * (1 + rules.ceilingOverPct / 100);
  if (l.kind === "floor") return lowOk(l.min);
  if (l.kind === "ceiling") return highOk(l.max);
  return lowOk(l.min) && highOk(l.max);
}

export const weekBalanced = (cats: readonly Category[], ticked: Map<string, number>, rules: BalanceRules): boolean =>
  cats.every((c) => limitKept(c.limit, ticked.get(c.id) ?? 0, rules));

// ---------------------------------------------------------------- the season

export type WeekMark = "balanced" | "grace" | "unbalanced" | "current";
export type SeasonWeek = { monday: string; mark: WeekMark };
export type Season = { start: string; weeks: SeasonWeek[]; balancedCount: number };

/**
 * This season's weeks, oldest first. Finished weeks are judged; this week is "current" (still
 * open) unless it's already balanced. An unbalanced week is drawn as a grace week when no other
 * grace week is among the three before it ("one grace week per four"). Weeks before the first
 * tick ever are left out, so a new user doesn't start the season with empty squares.
 */
export function season(cats: readonly Category[], history: readonly HistoryEntry[], now: Date, rules: BalanceRules = DEFAULT_RULES): Season {
  const first = history.length ? Math.min(...history.map((e) => e.date)) : null;
  const thisMonday = mondayOf(now).getTime();
  const mondays = seasonMondays(now).filter((m) => m.getTime() === thisMonday || (first !== null && addDays(m, 7).getTime() > first));
  const weeks: SeasonWeek[] = [];
  for (const m of mondays) {
    const balanced = weekBalanced(cats, tickedMins(history, m), rules);
    let mark: WeekMark;
    if (balanced) mark = "balanced";
    else if (m.getTime() === thisMonday) mark = "current";
    else mark = weeks.slice(-3).some((w) => w.mark === "grace") ? "unbalanced" : "grace";
    weeks.push({ monday: dayKey(m), mark });
  }
  return { start: dayKey(seasonStart(now)), weeks, balancedCount: weeks.filter((w) => w.mark === "balanced").length };
}
