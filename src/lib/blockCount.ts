// Visual B (JP, 2026-11-07): each area's week drawn in the blocks you drag, with a calm warning
// when it's under what it needs, an outlined ink tag, never red. Past what an "at most" or
// "between" allows is red (JP, 2026-11-08: "make it red when it goes over"), with "!" and stripes
// so it never relies on colour alone. Past an "at least" is good news: more squares in the area's
// colour and "2h above" (JP: "it should still show us how much above it went"). The goal is time, not blocks (JP, 2026-11-08: "remove the blocks as a
// target"): the squares stay as the picture, the words say the time, "3h to go". Three states
// (JP, 2026-11-08, option C): an empty square is not placed, a striped one placed, a solid one done.
import type { Limit } from "./guardrail";
import { fmtDur } from "./time";
import { LIB_EN, type LibWords } from "./words";

export type CountState = "toGo" | "reached" | "above" | "room" | "atLimit" | "inRange" | "over";
/** calm: nothing to do · done: reached / in range · under: needs more · over: past what it allows */
export type CountTone = "calm" | "done" | "under" | "over";

export type BlockCount = {
  /** squares for the goal: the top of the limit in blocks, rounded up */
  squares: number;
  /** of those, how many the area needs ("at least", or "between"'s low end); 0 for "at most" */
  needed: number;
  /** planned, in blocks; a fraction fills part of a square */
  filled: number;
  /** of what's planned, how much is ticked done, in blocks (never more than `filled`) */
  done: number;
  /** squares past the top ("at most", "between"), drawn striped in red */
  extra: number;
  /** squares past an "at least" goal, in the area's colour */
  above: number;
  state: CountState;
  tone: CountTone;
  /** what the words say, in minutes: still to go, above the goal, room left, or over */
  mins: number;
  /** too many squares to draw (more than MAX_SQUARES): a thin bar instead, same words */
  bar: boolean;
};

export const MAX_SQUARES = 16;

export function blockCount(limit: Limit, plannedMins: number, blockMins: number, doneMins = 0): BlockCount {
  const b = Math.max(30, blockMins || 0);
  const p = Math.max(0, plannedMins);
  const filled = p / b;
  const done = Math.min(p, Math.max(0, doneMins)) / b;
  const toSquares = (mins: number) => Math.max(0, Math.ceil(mins / b - 1e-9)); // tolerant of float dust, never -0
  const make = (
    squares: number,
    needed: number,
    extra: number,
    state: CountState,
    tone: CountTone,
    mins: number,
    above = 0,
  ) => ({
    squares,
    needed,
    filled,
    done,
    extra,
    above,
    state,
    tone,
    mins,
    bar: squares + extra + above > MAX_SQUARES,
  });

  if (limit.kind === "floor") {
    const squares = toSquares(limit.min);
    if (p < limit.min) return make(squares, squares, 0, "toGo", "under", limit.min - p);
    const past = p - limit.min;
    return past > 0
      ? make(squares, squares, 0, "above", "done", past, Math.ceil(past / b - 1e-9))
      : make(squares, squares, 0, "reached", "done", 0);
  }

  const squares = toSquares(limit.max);
  const needed = limit.kind === "range" ? toSquares(limit.min) : 0;
  if (p > limit.max) {
    // the striped squares count whole blocks past the top; the words say the time
    const over = p - limit.max;
    return make(squares, needed, Math.max(1, Math.ceil(over / b - 1e-9)), "over", "over", over);
  }
  if (limit.kind === "range") {
    return p < limit.min
      ? make(squares, needed, 0, "toGo", "under", limit.min - p)
      : make(squares, needed, 0, "inRange", "done", 0);
  }
  const room = limit.max - p;
  return room === 0 ? make(squares, 0, 0, "atLimit", "calm", 0) : make(squares, 0, 0, "room", "calm", room);
}

/**
 * The words under an area, in the chip's own time format: "3h to go", "1.5h to go", "0.5h to go",
 * "2h above", "8h left", "at the limit", "1h over", "reached", "in range" (FR « encore 3 h », « reste 1 h 30 »,
 * « 30 min de trop »). Never the "½" sign, which shrinks to dots in the small mono type.
 */
export function countStatus(c: BlockCount, w: LibWords = LIB_EN): string {
  switch (c.state) {
    case "toGo":
      return w.count.toGo(fmtDur(c.mins, w.lang));
    case "room":
      return w.count.room(fmtDur(c.mins, w.lang));
    case "over":
      return w.count.over(fmtDur(c.mins, w.lang));
    case "above":
      return w.count.above(fmtDur(c.mins, w.lang));
    case "atLimit":
      return w.count.atLimit;
    case "reached":
      return w.count.reached;
    default:
      return w.count.inRange;
  }
}
