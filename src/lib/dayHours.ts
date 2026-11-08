// The hours the calendar shows (JP, 2026-11-07). Chosen per device in Settings → Your day; 7:00 to
// 23:00 unless changed. Blocks outside them still show: the calendar grows by the hour to hold them,
// so nothing is ever hidden or moved. Pure rules only.
import { DAY_END, DAY_START } from "./constants";
import type { Block } from "./model";
import type { Bounds } from "./placement";

const HOUR = 60;
/** A block can sit anywhere in a day, midnight to midnight. */
export const WHOLE_DAY: Bounds = [0, 24 * HOUR];
export const DEFAULT_HOURS: Bounds = [DAY_START, DAY_END];
/** The calendar always shows at least four hours. */
export const MIN_SPAN = 4 * HOUR;

/** Where the day can start: midnight to 20:00, by the hour. */
export const startChoices = (): number[] => Array.from({ length: 21 }, (_, h) => h * HOUR);

/** Where it can end: at least four hours after the start, up to midnight. */
export function endChoices(start: number): number[] {
  const out: number[] = [];
  for (let t = start + MIN_SPAN; t <= WHOLE_DAY[1]; t += HOUR) out.push(t);
  return out;
}

const isHours = (v: unknown): v is [number, number] =>
  Array.isArray(v) &&
  v.length === 2 &&
  v.every((x) => Number.isInteger(x) && x % HOUR === 0) &&
  v[0] >= WHOLE_DAY[0] &&
  v[1] <= WHOLE_DAY[1] &&
  v[1] - v[0] >= MIN_SPAN;

/** The saved choice, or the default for anything missing or odd. */
export function parseDayHours(raw: string | null): Bounds {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    return isHours(v) ? [v[0], v[1]] : DEFAULT_HOURS;
  } catch {
    return DEFAULT_HOURS;
  }
}

/** A new start; the end moves later when it would leave less than four hours. */
export const withStart = (h: Bounds, start: number): Bounds => [start, Math.max(h[1], start + MIN_SPAN)];

/** A new end, kept at least four hours after the start. */
export const withEnd = (h: Bounds, end: number): Bounds => [h[0], Math.max(end, h[0] + MIN_SPAN)];

/** What the calendar shows: the chosen hours, widened by the hour to hold every block of both weeks. */
export function gridBounds(hours: Bounds, weeks: readonly (readonly Pick<Block, "start" | "mins">[])[]): Bounds {
  let [start, end] = hours;
  for (const w of weeks)
    for (const b of w) {
      start = Math.min(start, Math.floor(b.start / HOUR) * HOUR);
      end = Math.max(end, Math.ceil((b.start + b.mins) / HOUR) * HOUR);
    }
  return [Math.max(WHOLE_DAY[0], start), Math.min(WHOLE_DAY[1], end)];
}
