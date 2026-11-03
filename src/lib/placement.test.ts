import { describe, expect, it } from "vitest";
import type { Block } from "./model";
import { freeGaps, resizeBlock, resolvePlacement } from "./placement";

const B = [420, 1380] as const;
const p = (id: string, day: number, start: number, mins: number) => ({ id, day, start, mins });
const blk = (id: string, day: number, start: number, mins: number): Block => ({
  id,
  catIds: ["work"],
  day,
  start,
  mins,
  label: "",
  desc: "",
  done: false,
});

describe("freeGaps", () => {
  it("returns the whole day when empty", () => {
    expect(freeGaps([], 420, 1380)).toEqual([{ s: 420, e: 1380 }]);
  });
  it("finds gaps between sorted intervals", () => {
    expect(freeGaps([{ s: 480, e: 540 }, { s: 600, e: 660 }], 420, 1380)).toEqual([
      { s: 420, e: 480 },
      { s: 540, e: 600 },
      { s: 660, e: 1380 },
    ]);
  });
  it("handles overlaps and a fully covered day", () => {
    expect(freeGaps([{ s: 420, e: 700 }, { s: 600, e: 650 }, { s: 700, e: 1380 }], 420, 1380)).toEqual([]);
  });
});

describe("resolvePlacement", () => {
  it("places at the desired start on an empty day", () => {
    expect(resolvePlacement([], 0, 600, 60, null, B, 30)).toEqual({ start: 600, mins: 60 });
  });
  it("snaps to the previous block's end", () => {
    expect(resolvePlacement([p("a", 0, 540, 60)], 0, 620, 60, null, B, 30)).toEqual({ start: 600, mins: 60 });
  });
  it("snaps so the end meets the next block's start", () => {
    expect(resolvePlacement([p("a", 0, 720, 60)], 0, 640, 60, null, B, 30)).toEqual({ start: 660, mins: 60 });
  });
  it("shrinks to fit a smaller gap", () => {
    const others = [p("a", 0, 540, 60), p("b", 0, 660, 60)];
    expect(resolvePlacement(others, 0, 600, 120, null, B, 30)).toEqual({ start: 600, mins: 60 });
  });
  it("jumps to the nearest gap when the desired start is occupied", () => {
    const others = [p("a", 0, 420, 180), p("b", 0, 660, 540), p("c", 0, 1260, 120)];
    expect(resolvePlacement(others, 0, 1100, 60, null, B, 30)).toEqual({ start: 1200, mins: 60 });
    expect(resolvePlacement(others, 0, 700, 60, null, B, 30)).toEqual({ start: 600, mins: 60 });
  });
  it("clamps to the end of the day", () => {
    expect(resolvePlacement([], 0, 1370, 120, null, B, 30)).toEqual({ start: 1350, mins: 30 });
    expect(resolvePlacement([], 0, 300, 60, null, B, 30)).toEqual({ start: 420, mins: 60 });
  });
  it("returns null when the day is full or no gap holds one step", () => {
    expect(resolvePlacement([p("a", 0, 420, 960)], 0, 600, 60, null, B, 30)).toBeNull();
    expect(resolvePlacement([p("a", 0, 420, 180), p("b", 0, 620, 760)], 0, 600, 60, null, B, 30)).toBeNull();
  });
  it("ignores other days", () => {
    expect(resolvePlacement([p("a", 1, 420, 960)], 0, 600, 60, null, B, 30)).toEqual({ start: 600, mins: 60 });
  });
  it("ignores the moving block itself with ignoreId", () => {
    const blocks = [p("a", 0, 600, 60)];
    expect(resolvePlacement(blocks, 0, 630, 60, "a", B, 30)).toEqual({ start: 630, mins: 60 });
    // without it the block collides with itself; equidistant gaps resolve to the earlier gap's start
    expect(resolvePlacement(blocks, 0, 630, 60, null, B, 30)).toEqual({ start: 420, mins: 60 });
  });
  it("defaults bounds and step to the day grid", () => {
    expect(resolvePlacement([], 0, 1370, 120, null)).toEqual({ start: 1350, mins: 30 });
  });
});

describe("resizeBlock", () => {
  const find = (bs: Block[], id: string) => bs.find((b) => b.id === id)!;

  it("grows the bottom edge up to the next block", () => {
    const bs = [blk("a", 0, 600, 60), blk("b", 0, 720, 60)];
    expect(find(resizeBlock(bs, "a", "bottom", 600, 60, 3, B, 30), "a")).toMatchObject({ start: 600, mins: 120 });
    expect(find(resizeBlock(bs, "a", "bottom", 600, 60, 1, B, 30), "a")).toMatchObject({ start: 600, mins: 90 });
  });
  it("keeps at least one step on the bottom edge", () => {
    const bs = [blk("a", 0, 600, 60)];
    expect(find(resizeBlock(bs, "a", "bottom", 600, 60, -5, B, 30), "a").mins).toBe(30);
  });
  it("clamps the bottom edge to the day end and ignores other days", () => {
    const bs = [blk("a", 0, 1320, 30), blk("x", 1, 1350, 30)];
    expect(find(resizeBlock(bs, "a", "bottom", 1320, 30, 4, B, 30), "a").mins).toBe(60);
  });
  it("grows the top edge down to the previous block's end", () => {
    const bs = [blk("c", 0, 480, 60), blk("a", 0, 600, 60)];
    expect(find(resizeBlock(bs, "a", "top", 600, 60, -4, B, 30), "a")).toMatchObject({ start: 540, mins: 120 });
    expect(find(resizeBlock(bs, "a", "top", 600, 60, -1, B, 30), "a")).toMatchObject({ start: 570, mins: 90 });
  });
  it("keeps at least one step on the top edge", () => {
    const bs = [blk("a", 0, 600, 60)];
    expect(find(resizeBlock(bs, "a", "top", 600, 60, 5, B, 30), "a")).toMatchObject({ start: 630, mins: 30 });
  });
  it("clamps the top edge to the day start", () => {
    const bs = [blk("a", 0, 450, 60)];
    expect(find(resizeBlock(bs, "a", "top", 450, 60, -3, B, 30), "a")).toMatchObject({ start: 420, mins: 90 });
  });
  it("measures from the original geometry, not the current one", () => {
    // mid-drag the block is already 90 long; delta is relative to the drag start
    const bs = [blk("a", 0, 600, 90)];
    expect(find(resizeBlock(bs, "a", "bottom", 600, 60, 2, B, 30), "a").mins).toBe(120);
  });
  it("returns a new array without mutating, or the same array for an unknown id", () => {
    const bs = [blk("a", 0, 600, 60)];
    const out = resizeBlock(bs, "a", "bottom", 600, 60, 1, B, 30);
    expect(out).not.toBe(bs);
    expect(bs[0].mins).toBe(60);
    expect(resizeBlock(bs, "nope", "bottom", 600, 60, 1, B, 30)).toBe(bs);
  });
});
