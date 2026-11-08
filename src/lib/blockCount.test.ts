import { describe, expect, it } from "vitest";
import { blockCount, countStatus, MAX_SQUARES } from "./blockCount";
import { LIB_FR } from "./words.fr";

const h = (n: number) => Math.round(n * 60);
const atLeast = (n: number) => ({ kind: "floor" as const, min: h(n) });
const atMost = (n: number) => ({ kind: "ceiling" as const, max: h(n) });
const between = (lo: number, hi: number) => ({ kind: "range" as const, min: h(lo), max: h(hi) });
const say = (l: Parameters<typeof blockCount>[0], planned: number, block: number) =>
  countStatus(blockCount(l, h(planned), h(block)));

describe("counting a week in blocks", () => {
  it("at least: blocks to go, a warning until it's reached", () => {
    const c = blockCount(atLeast(10), h(7), h(1));
    expect(c).toMatchObject({ squares: 10, needed: 10, filled: 7, state: "toGo", tone: "under", blocks: 3 });
    expect(say(atLeast(10), 7, 1)).toBe("3 more blocks");
    expect(say(atLeast(10), 9, 1)).toBe("1 more block");
    expect(blockCount(atLeast(10), h(10), h(1))).toMatchObject({ state: "reached", tone: "done" });
    expect(say(atLeast(10), 12, 1)).toBe("reached");
  });
  it("rounds what's left up to the nearest half block, written so it reads at a glance", () => {
    expect(say(atLeast(4), 2.5, 1)).toBe("1.5 more blocks");
    expect(say(atLeast(4), 3.5, 1)).toBe("0.5 more blocks");
    expect(say(atLeast(4), 3.5, 2)).toBe("0.5 more blocks"); // 30 min of a 2 h block rounds up
    expect(say(atLeast(4), 3, 1)).toBe("1 more block");
  });
  it("at most: room left is calm; past it is the stronger warning", () => {
    expect(blockCount(atMost(40), h(32), h(4))).toMatchObject({
      squares: 10,
      needed: 0,
      state: "room",
      tone: "calm",
      blocks: 2,
    });
    expect(say(atMost(40), 32, 4)).toBe("2 blocks left");
    expect(say(atMost(40), 40, 4)).toBe("at the limit");
    expect(say(atMost(40), 39, 4)).toBe("at the limit"); // less than half a block of room
    const over = blockCount(atMost(40), h(44), h(4));
    expect(over).toMatchObject({ state: "over", tone: "over", extra: 1, blocks: 1 });
    expect(say(atMost(40), 44, 4)).toBe("1 block over");
    expect(say(atMost(40), 41, 4)).toBe("0.5 blocks over"); // never "0 over"
    expect(say(atMost(40), 46, 4)).toBe("1.5 blocks over");
    expect(say(atMost(40), 34, 4)).toBe("1.5 blocks left");
  });
  it("between: needs its low end, then counts fully, then past its top", () => {
    expect(blockCount(between(4, 8), h(2), h(2))).toMatchObject({
      squares: 4,
      needed: 2,
      state: "toGo",
      tone: "under",
      blocks: 1,
    });
    expect(say(between(4, 8), 6, 2)).toBe("in range");
    expect(blockCount(between(4, 8), h(10), h(2))).toMatchObject({ state: "over", extra: 1, blocks: 1 });
  });
  it("draws a bar instead when there would be too many squares", () => {
    expect(blockCount(atMost(40), h(10), h(0.5)).bar).toBe(true); // 80 squares
    expect(blockCount(atLeast(8), h(1), h(0.5)).bar).toBe(false); // 16
    expect(MAX_SQUARES).toBe(16);
  });
  it("handles a goal of nothing", () => {
    expect(blockCount(atLeast(0), 0, h(1))).toMatchObject({ squares: 0, state: "reached" });
    expect(blockCount(atMost(0), h(1), h(1))).toMatchObject({ state: "over", blocks: 1 });
  });
  it("writes halves and plurals in both languages, never with the ½ sign", () => {
    const fr = (l: Parameters<typeof blockCount>[0], p: number, b: number) =>
      countStatus(blockCount(l, h(p), h(b)), LIB_FR);
    expect(fr(atLeast(10), 7, 1)).toBe("encore 3 blocs");
    expect(fr(atLeast(4), 2.5, 1)).toBe("encore 1,5 bloc");
    expect(fr(atLeast(4), 3.5, 1)).toBe("encore 0,5 bloc");
    expect(fr(atMost(40), 41, 4)).toBe("0,5 bloc de trop");
    expect(fr(atMost(40), 34, 4)).toBe("reste 1,5 bloc");
    expect(fr(atMost(40), 32, 4)).toBe("reste 2 blocs");
    expect(fr(atMost(40), 44, 4)).toBe("1 bloc de trop");
    expect(fr(between(4, 8), 6, 2)).toBe("entre les deux");
  });
});
