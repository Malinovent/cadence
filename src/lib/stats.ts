// Derived numbers for the sidebar and the stats view (pure).
import type { CadenceData, Category } from "./model";
import type { WeekIndex } from "./actions";
import { balance, balanceNote, type Balance } from "./guardrail";

export type StatsRange = "month" | "quarter" | "year";
export const RANGE_DAYS: Record<StatsRange, number> = { month: 30, quarter: 90, year: 365 };

export type QuotaStatus = { cat: Category; placedMins: number; doneMins: number; met: boolean };

// A block tagged with multiple categories counts its FULL duration toward each.
export const quotaStatus = (data: CadenceData, week: WeekIndex): QuotaStatus[] => {
  const blocks = data.weeks[week];
  return data.cats.map((c) => {
    const placed = blocks.filter((p) => p.catIds.includes(c.id));
    const placedMins = placed.reduce((s, p) => s + p.mins, 0);
    const doneMins = placed.filter((p) => p.done).reduce((s, p) => s + p.mins, 0);
    return { cat: c, placedMins, doneMins, met: placedMins >= c.targetMins };
  });
};

export type AreaBalance = { cat: Category; balance: Balance; note: string | null };

/** S1.2: this week's guardrail balance per area, from planned minutes. Each week stands alone. */
export const weekBalance = (data: CadenceData, week: WeekIndex): AreaBalance[] => {
  const blocks = data.weeks[week];
  return data.cats.map((cat) => {
    const planned = blocks.filter((p) => p.catIds.includes(cat.id)).reduce((s, p) => s + p.mins, 0);
    const b = balance(cat.limit, planned);
    return { cat, balance: b, note: balanceNote(cat.name, b) };
  });
};

// buffers have no tick, so they don't count as sessions
export const completion = (data: CadenceData, week: WeekIndex): { done: number; total: number; pct: number } => {
  const blocks = data.weeks[week].filter((p) => !p.buffer);
  const done = blocks.filter((p) => p.done).length;
  return { done, total: blocks.length, pct: blocks.length ? Math.round((done / blocks.length) * 100) : 0 };
};

export type CatStats = { cat: Category; sessions: number; hours: string };

// hours is a one-decimal string, as legacy displays it
export const statsByCat = (data: CadenceData, range: StatsRange, now: number): CatStats[] => {
  const cutoff = now - RANGE_DAYS[range] * 86400000;
  return data.cats.map((c) => {
    const entries = data.history.filter((e) => e.catId === c.id && e.date >= cutoff);
    const totalMins = entries.reduce((s, e) => s + e.mins, 0);
    return { cat: c, sessions: entries.length, hours: (totalMins / 60).toFixed(1) };
  });
};

export const maxHours = (stats: CatStats[]): number => Math.max(1, ...stats.map((s) => parseFloat(s.hours)));

// categories editor inputs (hours) -> stored minutes
export const hoursToTargetMins = (h: number): number => Math.round(h * 60);
export const hoursToBlockMins = (h: number): number => Math.max(30, Math.round(h * 2) * 30);
