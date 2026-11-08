import { fmtDur } from "./time";
import { LIB_EN, type LibWords } from "./words";
// Guardrail quotas (sprint 1, S1.2): each area has a floor, a ceiling or a range of weekly time.
// The balance counts PLANNED minutes in the week (a block tagged with several areas counts fully
// to each), as the old targets did. Shortfalls are described, never judged, and never carried over.

export type Limit =
  | { kind: "floor"; min: number } // at least
  | { kind: "ceiling"; max: number } // at most
  | { kind: "range"; min: number; max: number }; // anywhere in between
export type LimitKind = Limit["kind"];

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const mins = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

/**
 * A stored limit, or null when missing or malformed (the caller then falls back to a floor from
 * the legacy targetMins). A range given backwards is put the right way round.
 */
export function parseLimit(v: unknown): Limit | null {
  if (!isRec(v)) return null;
  if (v.kind === "floor") {
    const min = mins(v.min);
    return min === null ? null : { kind: "floor", min };
  }
  if (v.kind === "ceiling") {
    const max = mins(v.max);
    return max === null ? null : { kind: "ceiling", max };
  }
  if (v.kind === "range") {
    const a = mins(v.min);
    const b = mins(v.max);
    if (a === null || b === null) return null;
    return { kind: "range", min: Math.min(a, b), max: Math.max(a, b) };
  }
  return null;
}

/** Existing targets become floors (the brief: "Migrate existing quotas to floors"). */
export const floorFromTarget = (targetMins: number): Limit => ({
  kind: "floor",
  min: Math.max(0, Math.round(targetMins) || 0),
});

/**
 * The legacy `targetMins` kept beside the limit, so an older copy of the app (another device not
 * yet updated) still reads a sensible target: the floor or the range's low end; 0 for a ceiling.
 */
export const legacyTarget = (l: Limit): number => (l.kind === "ceiling" ? 0 : l.min);

/** Switch kind keeping the numbers that still make sense. */
export function changeKind(l: Limit, kind: LimitKind, blockMins = 60): Limit {
  if (kind === l.kind) return l;
  const lo = l.kind === "ceiling" ? Math.max(0, l.max - blockMins) : l.min;
  const hi = l.kind === "floor" ? l.min + 2 * blockMins : l.max;
  if (kind === "floor") return { kind, min: lo };
  if (kind === "ceiling") return { kind, max: hi };
  return { kind, min: Math.min(lo, hi), max: Math.max(lo, hi) };
}

// ---------------------------------------------------------------- the balance

export type BalanceState =
  | "short" // floor or range: less than the low end
  | "met" // floor reached
  | "inRange" // range: within
  | "within" // ceiling: at or under
  | "over"; // ceiling or range: past the high end

export type Balance = {
  limit: Limit;
  plannedMins: number;
  state: BalanceState;
  /** 0..1: partial credit toward the floor or range; ceilings always 1 (see overMins). */
  credit: number;
  /** minutes still to plan to reach the floor / range (0 when reached) */
  shortMins: number;
  /** minutes past the ceiling / range top (0 when not past) */
  overMins: number;
};

export function balance(limit: Limit, plannedMins: number): Balance {
  const p = Math.max(0, plannedMins);
  const base = { limit, plannedMins: p, shortMins: 0, overMins: 0 };
  if (limit.kind === "floor") {
    const short = Math.max(0, limit.min - p);
    return {
      ...base,
      state: short ? "short" : "met",
      credit: limit.min ? Math.min(1, p / limit.min) : 1,
      shortMins: short,
    };
  }
  if (limit.kind === "ceiling") {
    const over = Math.max(0, p - limit.max);
    return { ...base, state: over ? "over" : "within", credit: 1, overMins: over };
  }
  const short = Math.max(0, limit.min - p);
  const over = Math.max(0, p - limit.max);
  return {
    ...base,
    state: short ? "short" : over ? "over" : "inRange",
    credit: short && limit.min ? p / limit.min : 1,
    shortMins: short,
    overMins: over,
  };
}

// ---------------------------------------------------------------- wording

/** 450 -> "7.5", 600 -> "10", 0 -> "0" */
export const fmtH = (m: number): string => String(Math.round((m / 60) * 100) / 100);

/** "At least 10 h", "At most 40 h", "Between 4 and 8 h" */
export function limitLabel(l: Limit, w: LibWords = LIB_EN): string {
  const d = (mins: number) => fmtDur(mins, w.lang);
  if (l.kind === "floor") return w.limit.floor(d(l.min));
  if (l.kind === "ceiling") return w.limit.ceiling(d(l.max));
  return w.limit.range(d(l.min), d(l.max));
}
