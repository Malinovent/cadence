// "Now" on the grid (sprint 1, "A tick on every block"): which block is happening right now,
// how long it has left, and where the current-time line goes. Week 0 is the current week.
import type { WeekIndex } from "./actions";
import { DAY_END, DAY_START, STEP } from "./constants";
import type { Block } from "./model";
import type { Bounds } from "./placement";
import { fmtTime } from "./time";
import { LIB_EN, type Lang, type LibWords } from "./words";

export type NowPoint = { day: number; mins: number }; // day: Mon = 0; mins from 00:00

export const nowPoint = (now: Date): NowPoint => ({
  day: (now.getDay() + 6) % 7,
  mins: now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
});

/** True when this block is under way: this week, today, start <= now < end. */
export const isNowBlock = (b: Pick<Block, "day" | "start" | "mins">, week: WeekIndex, p: NowPoint): boolean =>
  week === 0 && b.day === p.day && b.start <= p.mins && p.mins < b.start + b.mins;

/** Whole minutes left in a block under way, rounded up so the last minute reads "1 min". */
export const minutesLeft = (b: Pick<Block, "start" | "mins">, p: NowPoint): number =>
  Math.max(1, Math.ceil(b.start + b.mins - p.mins));

/**
 * The block under way: "38m left" under an hour (minutes keep their unit, or "38 left" would read
 * as hours), then hours with no unit like the rest of the app, to one decimal since it counts down
 * by the minute: "1.4 left", "2 left" (FR « encore 38 min », « encore 1,4 »).
 */
export const fmtLeft = (mins: number, w: LibWords = LIB_EN): string => {
  if (mins < 60) return w.now.left(w.lang === "fr" ? `${mins} min` : `${mins}m`);
  const h = String(Math.round((mins / 60) * 10) / 10);
  return w.now.left(w.lang === "fr" ? h.replace(".", ",") : h);
};

/** px from the top of the day column for the current-time line, or null outside the grid's hours or on week 2. */
export const nowLineTop = (
  week: WeekIndex,
  p: NowPoint,
  rowH: number,
  bounds: Bounds = [DAY_START, DAY_END],
): number | null => {
  if (week !== 0 || p.mins < bounds[0] || p.mins >= bounds[1]) return null;
  return ((p.mins - bounds[0]) / STEP) * rowH;
};

/** "10:22am" for the label beside the current-time line, in the grid's own time format (S1.9 makes it local). */
export const fmtClock = (p: NowPoint, lang: Lang = "en"): string => fmtTime(Math.floor(p.mins), lang);

/** ms until the next whole minute, so a clock ticking once a minute stays on the minute. */
export const msToNextMinute = (now: Date): number => 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
