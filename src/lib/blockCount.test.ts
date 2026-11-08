import { describe, expect, it } from "vitest";
import { blockCount, countStatus, MAX_SQUARES } from "./blockCount";
import { LIB_FR } from "./words.fr";

const h = (n: number) => Math.round(n * 60);
const atLeast = (n: number) => ({ kind: "floor" as const, min: h(n) });
const atMost = (n: number) => ({ kind: "ceiling" as const, max: h(n) });
const between = (lo: number, hi: number) => ({ kind: "range" as const, min: h(lo), max: h(hi) });
const say = (l: Parameters<typeof blockCount>[0], planned: number, block: number) =>
  countStatus(blockCount(l, h(planned), h(block)));

describe("an area's week: squares in blocks, words in time", () => {
  it("at least: time to go, a warning until it's reached", () => {
    const c = blockCount(atLeast(10), h(7), h(1));
    expect(c).toMatchObject({ squares: 10, needed: 10, filled: 7, state: "toGo", tone: "under", mins: h(3) });
    expect(say(atLeast(10), 7, 1)).toBe("3h to go");
    expect(say(atLeast(10), 9, 1)).toBe("1h to go");
    expect(blockCount(atLeast(10), h(10), h(1))).toMatchObject({ state: "reached", tone: "done" });
    expect(say(atLeast(10), 10, 1)).toBe("reached");
  });
  it("at least: past the goal says how far above, with a square per block past it (JP)", () => {
    expect(blockCount(atLeast(10), h(12), h(1))).toMatchObject({
      squares: 10,
      above: 2,
      extra: 0,
      state: "above",
      tone: "done",
      mins: h(2),
    });
    expect(say(atLeast(10), 12, 1)).toBe("2h above");
    expect(say(atLeast(4), 4.5, 2)).toBe("0.5h above");
    expect(blockCount(atLeast(4), h(4.5), h(2)).above).toBe(1);
    expect(countStatus(blockCount(atLeast(4), h(5), h(1)), LIB_FR)).toBe("1 h de plus");
  });
  it("says exactly the time left, whatever the block length (JP: blocks aren't the target)", () => {
    expect(say(atLeast(4), 2.5, 1)).toBe("1.5h to go");
    expect(say(atLeast(4), 3.5, 1)).toBe("0.5h to go");
    expect(say(atLeast(4), 3.5, 2)).toBe("0.5h to go");
    expect(say(atLeast(4), 3, 1)).toBe("1h to go");
    expect(say(atLeast(4), 3, 0.5)).toBe("1h to go");
  });
  it("at most: room left is calm; past it is the stronger warning", () => {
    expect(blockCount(atMost(40), h(32), h(4))).toMatchObject({
      squares: 10,
      needed: 0,
      state: "room",
      tone: "calm",
      mins: h(8),
    });
    expect(say(atMost(40), 32, 4)).toBe("8h left");
    expect(say(atMost(40), 39, 4)).toBe("1h left");
    expect(say(atMost(40), 40, 4)).toBe("at the limit");
    const over = blockCount(atMost(40), h(44), h(4));
    expect(over).toMatchObject({ state: "over", tone: "over", extra: 1, mins: h(4) });
    expect(say(atMost(40), 44, 4)).toBe("4h over");
    expect(say(atMost(40), 41, 4)).toBe("1h over");
    expect(say(atMost(40), 40.5, 4)).toBe("0.5h over");
  });
  it("still draws whole striped squares past the top", () => {
    expect(blockCount(atMost(40), h(41), h(4)).extra).toBe(1);
    expect(blockCount(atMost(40), h(49), h(4)).extra).toBe(3);
  });
  it("between: needs its low end, then counts fully, then past its top", () => {
    expect(blockCount(between(4, 8), h(2), h(2))).toMatchObject({
      squares: 4,
      needed: 2,
      state: "toGo",
      tone: "under",
      mins: h(2),
    });
    expect(say(between(4, 8), 2, 2)).toBe("2h to go");
    expect(say(between(4, 8), 6, 2)).toBe("in range");
    expect(blockCount(between(4, 8), h(10), h(2))).toMatchObject({ state: "over", extra: 1, mins: h(2) });
  });
  it("knows how much of what's placed is done, never more than placed (JP: three states)", () => {
    expect(blockCount(atLeast(4), h(3), h(1), h(1))).toMatchObject({ filled: 3, done: 1 });
    expect(blockCount(atLeast(4), h(3), h(1)).done).toBe(0);
    expect(blockCount(atLeast(4), h(2), h(1), h(5)).done).toBe(2);
    expect(blockCount(atLeast(4), h(3), h(2), h(1)).done).toBe(0.5);
  });
  it("draws a bar instead when there would be too many squares", () => {
    expect(blockCount(atMost(40), h(10), h(0.5)).bar).toBe(true); // 80 squares
    expect(blockCount(atLeast(8), h(1), h(0.5)).bar).toBe(false); // 16
    expect(MAX_SQUARES).toBe(16);
  });
  it("handles a goal of nothing", () => {
    expect(blockCount(atLeast(0), 0, h(1))).toMatchObject({ squares: 0, state: "reached" });
    expect(blockCount(atMost(0), h(1), h(1))).toMatchObject({ state: "over", mins: h(1) });
  });
  it("speaks French with the app's French durations", () => {
    const fr = (l: Parameters<typeof blockCount>[0], p: number, b: number) =>
      countStatus(blockCount(l, h(p), h(b)), LIB_FR);
    expect(fr(atLeast(10), 7, 1)).toBe("encore 3 h");
    expect(fr(atLeast(4), 2.5, 1)).toBe("encore 1,5 h");
    expect(fr(atLeast(4), 3.5, 1)).toBe("encore 0,5 h");
    expect(fr(atMost(40), 41, 4)).toBe("1 h de trop");
    expect(fr(atMost(40), 34, 4)).toBe("reste 6 h");
    expect(fr(atMost(40), 40, 4)).toBe("à la limite");
    expect(fr(between(4, 8), 6, 2)).toBe("entre les deux");
  });
});
