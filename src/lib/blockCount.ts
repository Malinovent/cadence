// Visual B (JP, 2026-11-07): each area's week counted in the blocks you drag, "3 more blocks",
// with a calm warning when it's under what it needs or over what it allows. Never red: the
// warnings are ink, an outlined tag for "under" and a solid one for "over", so they read without
// colour and never look like another area.
import type { Limit } from "./guardrail";
import { LIB_EN, type LibWords } from "./words";

export type CountState = "toGo" | "reached" | "room" | "atLimit" | "inRange" | "over";
/** calm: nothing to do · done: reached / in range · under: needs more · over: past what it allows */
export type CountTone = "calm" | "done" | "under" | "over";

export type BlockCount = {
  /** squares for the goal: the top of the limit in blocks, rounded up */
  squares: number;
  /** of those, how many the area needs ("at least", or "between"'s low end); 0 for "at most" */
  needed: number;
  /** planned, in blocks; a fraction fills part of a square */
  filled: number;
  /** squares past the top ("at most", "between"), drawn striped */
  extra: number;
  state: CountState;
  tone: CountTone;
  /** the number in the words, to the nearest half: blocks to go, room left, or over */
  blocks: number;
  /** too many squares to draw (more than MAX_SQUARES): a thin bar instead, same words */
  bar: boolean;
};

export const MAX_SQUARES = 16;

const halfUp = (n: number) => Math.ceil(n * 2 - 1e-9) / 2;
const halfDown = (n: number) => Math.floor(n * 2 + 1e-9) / 2;

export function blockCount(limit: Limit, plannedMins: number, blockMins: number): BlockCount {
  const b = Math.max(30, blockMins || 0);
  const p = Math.max(0, plannedMins);
  const filled = p / b;
  const toSquares = (mins: number) => Math.max(0, Math.ceil(mins / b - 1e-9)); // tolerant of float dust, never -0
  const make = (
    squares: number,
    needed: number,
    extra: number,
    state: CountState,
    tone: CountTone,
    blocks: number,
  ) => ({
    squares,
    needed,
    filled,
    extra,
    state,
    tone,
    blocks,
    bar: squares + extra > MAX_SQUARES,
  });

  if (limit.kind === "floor") {
    const squares = toSquares(limit.min);
    return p >= limit.min
      ? make(squares, squares, 0, "reached", "done", 0)
      : make(squares, squares, 0, "toGo", "under", halfUp((limit.min - p) / b));
  }

  const squares = toSquares(limit.max);
  const needed = limit.kind === "range" ? toSquares(limit.min) : 0;
  if (p > limit.max) {
    const over = (p - limit.max) / b;
    return make(
      squares,
      needed,
      Math.max(1, Math.ceil(over - 1e-9)),
      "over",
      "over",
      Math.max(0.5, Math.round(over * 2) / 2),
    );
  }
  if (limit.kind === "range") {
    return p < limit.min
      ? make(squares, needed, 0, "toGo", "under", halfUp((limit.min - p) / b))
      : make(squares, needed, 0, "inRange", "done", 0);
  }
  const room = halfDown((limit.max - p) / b);
  return room === 0 ? make(squares, 0, 0, "atLimit", "calm", 0) : make(squares, 0, 0, "room", "calm", room);
}

/** "3", "1½", "½" */
export const fmtBlocks = (n: number): string => {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  return half ? `${whole || ""}½` : String(whole);
};

/** The words under an area: "3 more blocks", "2 blocks left", "at the limit", "1 block over", "reached", "in range". */
export function countStatus(c: BlockCount, w: LibWords = LIB_EN): string {
  const n = fmtBlocks(c.blocks);
  const plural = w.count.plural(c.blocks);
  switch (c.state) {
    case "toGo":
      return w.count.toGo(n, plural);
    case "room":
      return w.count.room(n, plural);
    case "over":
      return w.count.over(n, plural);
    case "atLimit":
      return w.count.atLimit;
    case "reached":
      return w.count.reached;
    default:
      return w.count.inRange;
  }
}
