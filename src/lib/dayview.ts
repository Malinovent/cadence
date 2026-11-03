// Pure helpers for the phone one-day view (SPEC "Phase 3 design" -> "Phone layout")
// and for block text that must scale with the grid's row height.
import type { WeekIndex } from "./actions";
import { DAYS, ROW_H } from "./constants";
import { BLOCK_GAP } from "./gesture";

export const SWIPE_MIN_DX = 50; // px of horizontal travel for a swipe
export const SWIPE_RATIO = 1.5; // |dx| must beat |dy| by this factor

const LAST_DAY = DAYS.length - 1;

// day index (Mon = 0) shown first: today on Week 1, Monday on Week 2
export const defaultDay = (week: WeekIndex, now: Date): number => (week === 0 ? (now.getDay() + 6) % 7 : 0);

// the day a horizontal swipe on the grid body lands on, or null when it is not a swipe.
// Swipe left (dx < 0) = next day, right = previous; no wrap past Mon/Sun.
// `busy`: the interaction engine dragged or resized during the gesture.
export const swipeDay = (day: number, dx: number, dy: number, busy: boolean): number | null => {
  if (busy) return null;
  const ax = Math.abs(dx);
  if (ax <= SWIPE_MIN_DX || ax <= SWIPE_RATIO * Math.abs(dy)) return null;
  const next = dx < 0 ? day + 1 : day - 1;
  return next < 0 || next > LAST_DAY ? null : next;
};

// A block's text thresholds were tuned in px on 26px rows. Compare in rows instead, so a
// block shows the same text at the same duration whatever the row height. At ROW_H this is
// exactly `height > legacyPx`.
export const tallerThan = (height: number, rowH: number, legacyPx: number): boolean =>
  (height + BLOCK_GAP) / rowH > (legacyPx + BLOCK_GAP) / ROW_H;

// which optional lines a (non-editing) block has room for
export const blockText = (
  height: number,
  rowH: number,
  hasDesc: boolean,
): { desc: boolean; time: boolean; descLines: 1 | 2 } => ({
  desc: hasDesc && tallerThan(height, rowH, 44),
  time: tallerThan(height, rowH, hasDesc ? 74 : 46),
  descLines: tallerThan(height, rowH, 78) ? 2 : 1,
});

// per day (Mon = 0): does the week have any block on it (day strip dots)
export const daysWithBlocks = (blocks: readonly { day: number }[]): boolean[] =>
  DAYS.map((_, i) => blocks.some((b) => b.day === i));
