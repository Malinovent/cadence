import { describe, expect, it } from "vitest";
import { moveBlock, placeBlock } from "./actions";
import { DEFAULT_CATEGORIES, ROW_H } from "./constants";
import {
  autoscrollSpeed,
  blockBox,
  dropPreview,
  edgeAt,
  exceedsSlop,
  ghostOffset,
  gripInside,
  gripSpan,
  gripZones,
  hitTest,
  resizeDeltaSlots,
  resolveDrop,
  slotCount,
  slotStartAt,
  slotStartNear,
  withAlpha,
  type ColRect,
  type Rect,
} from "./gesture";
import { defaultData, type Block, type CadenceData } from "./model";

const blk = (id: string, day: number, start: number, mins: number, catIds = ["work"]): Block => ({
  id,
  catIds,
  day,
  start,
  mins,
  label: "",
  desc: "",
  done: false,
});
const rect = (left: number, top: number, w: number, h: number): Rect => ({ left, top, right: left + w, bottom: top + h });

describe("exceedsSlop", () => {
  it("is false inside the slop and true at or beyond it", () => {
    expect(exceedsSlop(0, 0, 8)).toBe(false);
    expect(exceedsSlop(5, 5, 8)).toBe(false); // ~7.07px
    expect(exceedsSlop(0, -8, 8)).toBe(true);
    expect(exceedsSlop(3, 3, 4)).toBe(true); // ~4.24px
    expect(exceedsSlop(2, 3, 4)).toBe(false); // ~3.6px
  });
});

describe("slotStartAt", () => {
  it("has 32 half-hour rows between 7:00 and 23:00", () => {
    expect(slotCount()).toBe(32);
  });
  it("maps y to the slot row under it for the desktop row height", () => {
    expect(slotStartAt(0, ROW_H)).toBe(420);
    expect(slotStartAt(25.9, ROW_H)).toBe(420);
    expect(slotStartAt(26, ROW_H)).toBe(450);
    expect(slotStartAt(26 * 10 + 3, ROW_H)).toBe(420 + 300);
  });
  it("takes the row height as a parameter (phone rows are 40px)", () => {
    expect(slotStartAt(39, 40)).toBe(420);
    expect(slotStartAt(40, 40)).toBe(450);
    expect(slotStartAt(40 * 4, 40)).toBe(540);
  });
  it("clamps above the first and below the last row", () => {
    expect(slotStartAt(-50, ROW_H)).toBe(420);
    expect(slotStartAt(99999, ROW_H)).toBe(1350);
    expect(slotStartAt(99999, 40)).toBe(1350);
  });
});

describe("slotStartNear", () => {
  it("rounds to the nearest row boundary instead of flooring", () => {
    expect(slotStartNear(0, 26)).toBe(420);
    expect(slotStartNear(12.9, 26)).toBe(420);
    expect(slotStartNear(13, 26)).toBe(450);
    expect(slotStartNear(38, 26)).toBe(450);
    expect(slotStartNear(40, 26)).toBe(480);
    expect(slotStartNear(19, 40)).toBe(420);
    expect(slotStartNear(21, 40)).toBe(450);
  });
  it("clamps to the day", () => {
    expect(slotStartNear(-200, 26)).toBe(420);
    expect(slotStartNear(-12, 26)).toBe(420);
    expect(slotStartNear(99999, 26)).toBe(1350);
  });
});

describe("blockBox", () => {
  it("positions a block in its column, 4px shorter than its rows", () => {
    expect(blockBox(420, 30, 26)).toEqual({ top: 0, height: 22 });
    expect(blockBox(480, 120, 26)).toEqual({ top: 52, height: 100 });
    expect(blockBox(480, 120, 40)).toEqual({ top: 80, height: 156 });
  });
});

describe("resizeDeltaSlots", () => {
  it("rounds the distance to whole rows", () => {
    expect(resizeDeltaSlots(100, 100, 26)).toBe(0);
    expect(resizeDeltaSlots(100, 112, 26)).toBe(0);
    expect(resizeDeltaSlots(100, 113, 26)).toBe(1);
    expect(resizeDeltaSlots(100, 100 + 26 * 3, 26)).toBe(3);
    expect(resizeDeltaSlots(100, 40, 40)).toBe(-1); // -1.5 rounds toward +inf
    expect(resizeDeltaSlots(100, 39, 40)).toBe(-2);
    expect(resizeDeltaSlots(100, 79, 40)).toBe(-1);
  });
  it("never returns -0", () => {
    expect(Object.is(resizeDeltaSlots(100, 95, 26), 0)).toBe(true);
  });
});

describe("autoscrollSpeed", () => {
  it("is zero away from the edges", () => {
    expect(autoscrollSpeed(60, 800)).toBe(0);
    expect(autoscrollSpeed(400, 800)).toBe(0);
    expect(autoscrollSpeed(740, 800)).toBe(0);
  });
  it("scrolls up near the top, proportional to depth", () => {
    expect(autoscrollSpeed(30, 800)).toBe(-8);
    expect(autoscrollSpeed(0, 800)).toBe(-16);
    expect(Object.is(autoscrollSpeed(59, 800), 0)).toBe(true); // 1px deep rounds to 0, never -0
  });
  it("scrolls down near the bottom, proportional to depth", () => {
    expect(autoscrollSpeed(770, 800)).toBe(8);
    expect(autoscrollSpeed(800, 800)).toBe(16);
  });
  it("caps at the max when the pointer is beyond the viewport", () => {
    expect(autoscrollSpeed(-200, 800)).toBe(-16);
    expect(autoscrollSpeed(1200, 800)).toBe(16);
  });
  it("is zero for a degenerate viewport", () => {
    expect(autoscrollSpeed(10, 0)).toBe(0);
  });
});

describe("touch resize grips", () => {
  it("reach 22px into tall blocks", () => {
    expect(gripInside(100)).toBe(22);
    expect(gripInside(156)).toBe(22);
    expect(gripInside(88)).toBe(22);
  });
  it("shrink on short blocks so the middle 40% stays free", () => {
    for (const h of [22, 36, 48, 60, 72]) {
      const inside = gripInside(h);
      expect(inside).toBeLessThanOrEqual(22);
      expect(h - 2 * inside).toBeGreaterThanOrEqual(h * 0.4 - 1e-9);
    }
    expect(gripInside(22)).toBeCloseTo(6.6);
    expect(gripInside(48)).toBeCloseTo(14.4);
    expect(gripInside(0)).toBe(0);
  });
  it("edgeAt picks the top or bottom grip, or the free middle", () => {
    // 120px-wide block: the grip span is x 30..90
    expect(edgeAt(60, 0, 120, 100)).toBe("top");
    expect(edgeAt(60, 21.9, 120, 100)).toBe("top");
    expect(edgeAt(60, 22, 120, 100)).toBe(null);
    expect(edgeAt(60, 50, 120, 100)).toBe(null);
    expect(edgeAt(60, 78.1, 120, 100)).toBe("bottom");
    expect(edgeAt(60, 100, 120, 100)).toBe("bottom");
    // 30-min block on 26px rows: only ~6.6px at each end
    expect(edgeAt(60, 6, 120, 22)).toBe("top");
    expect(edgeAt(60, 11, 120, 22)).toBe(null);
    expect(edgeAt(60, 16, 120, 22)).toBe("bottom");
  });
  it("edgeAt leaves the left (name) and right (done toggle) of the edges free", () => {
    expect(edgeAt(10, 5, 120, 100)).toBe(null); // name, top-left
    expect(edgeAt(29, 5, 120, 100)).toBe(null);
    expect(edgeAt(30, 5, 120, 100)).toBe("top");
    expect(edgeAt(90, 5, 120, 100)).toBe("top");
    expect(edgeAt(100, 5, 120, 100)).toBe(null); // done toggle, top-right
    expect(edgeAt(110, 95, 120, 100)).toBe(null);
  });
  it("gripSpan is the centred middle half, at least 44px, never wider than the block", () => {
    expect(gripSpan(300)).toEqual({ left: 75, width: 150 });
    expect(gripSpan(120)).toEqual({ left: 30, width: 60 });
    expect(gripSpan(88)).toEqual({ left: 22, width: 44 });
    expect(gripSpan(84)).toEqual({ left: 20, width: 44 }); // half would be 42
    expect(gripSpan(40)).toEqual({ left: 0, width: 40 });
    expect(gripSpan(0)).toEqual({ left: 0, width: 0 });
  });
  it("gripZones keeps 22px outside the block, clamped to the column", () => {
    expect(gripZones(100, 48, 832)).toEqual({ inside: gripInside(48), outsideTop: 22, outsideBottom: 22 });
    expect(gripZones(0, 48, 832).outsideTop).toBe(0);
    expect(gripZones(10, 48, 832).outsideTop).toBe(10);
    expect(gripZones(832 - 48 - 4, 48, 832).outsideBottom).toBe(4);
    expect(gripZones(784, 48, 832).outsideBottom).toBe(0);
  });
});

describe("hitTest", () => {
  // grid visible area 0..800 x 100..932; time column 0..64; 7 columns of 100px from x=64
  const clip = rect(0, 100, 800, 832);
  const cols: ColRect[] = Array.from({ length: 7 }, (_, d) => ({ day: d, rect: rect(64 + d * 100, 100, 100, 832) }));
  const blocks = [{ id: "a", rect: rect(67, 100 + 52, 94, 100) }];

  it("finds the column and slot under the point", () => {
    expect(hitTest(64 + 250, 100 + 26 * 4 + 1, clip, cols, [], 26)).toEqual({ day: 2, start: 540, blockId: null });
  });
  it("reports the block under the point", () => {
    expect(hitTest(100, 100 + 60, clip, cols, blocks, 26)).toEqual({ day: 0, start: 480, blockId: "a" });
  });
  it("misses the time column, the area outside the grid and clipped columns", () => {
    expect(hitTest(30, 300, clip, cols, blocks, 26)).toBeNull();
    expect(hitTest(300, 50, clip, cols, blocks, 26)).toBeNull();
    // column 6 spans 664..764 but suppose the grid is scrolled so only 0..700 is visible
    expect(hitTest(720, 300, rect(0, 100, 700, 832), cols, blocks, 26)).toBeNull();
  });
  it("with a grab offset, snaps the moved block top edge to the nearest row", () => {
    // grabbed 60px below its top; pointer at column y 60 + 26*4 + 14 -> top at 26*4 + 14 -> row 5 (round)
    expect(hitTest(100, 100 + 60 + 26 * 4 + 14, clip, cols, [], 26, 60)).toEqual({ day: 0, start: 420 + 5 * 30, blockId: null });
    // ... + 12 rounds down to row 4; without the offset the row under the pointer (floor) is used
    expect(hitTest(100, 100 + 60 + 26 * 4 + 12, clip, cols, [], 26, 60)?.start).toBe(420 + 4 * 30);
    expect(hitTest(100, 100 + 60 + 26 * 4 + 12, clip, cols, [], 26)?.start).toBe(420 + 6 * 30);
    // a top edge above the column clamps to the first row
    expect(hitTest(100, 120, clip, cols, [], 26, 60)?.start).toBe(420);
  });
  it("works with a single day column and 40px rows", () => {
    const one: ColRect[] = [{ day: 4, rect: rect(52, 0, 300, 1280) }];
    expect(hitTest(100, 81, rect(0, 0, 360, 1280), one, [], 40)).toEqual({ day: 4, start: 480, blockId: null });
  });
});

describe("ghostOffset", () => {
  const r = { left: 200, top: 300, right: 290, bottom: 400 };
  it("a moved block keeps the point where it was grabbed", () => {
    expect(ghostOffset({ kind: "move", id: "b" }, 230, 360, r)).toEqual({ x: 30, y: 60 });
  });
  it("a tray ghost hangs 8px below-right of the pointer, wherever the item was grabbed", () => {
    expect(ghostOffset({ kind: "tray", catId: "work" }, 230, 360, r)).toEqual({ x: 8, y: 8 });
    expect(ghostOffset({ kind: "tray", catId: "work" }, 480, 310, r)).toEqual({ x: 8, y: 8 });
  });
});

describe("resolveDrop", () => {
  const hit = { day: 3, start: 600, blockId: null };
  it("tray on a slot places, tray on a block tags", () => {
    expect(resolveDrop({ kind: "tray", catId: "learn" }, hit)).toEqual({ kind: "place", catId: "learn", day: 3, start: 600 });
    expect(resolveDrop({ kind: "tray", catId: "learn" }, { ...hit, blockId: "b1" })).toEqual({
      kind: "tag",
      blockId: "b1",
      catId: "learn",
    });
  });
  it("a moving block ignores the block under the pointer", () => {
    expect(resolveDrop({ kind: "move", id: "b1" }, { ...hit, blockId: "b2" })).toEqual({ kind: "move", id: "b1", day: 3, start: 600 });
  });
});

describe("dropPreview", () => {
  const withBlocks = (blocks: Block[]): CadenceData => {
    const d = defaultData();
    return { ...d, weeks: [blocks, []] };
  };
  const cats = DEFAULT_CATEGORIES;

  it("matches placeBlock (snap and shrink)", () => {
    const blocks = [blk("x", 1, 540, 60), blk("y", 1, 690, 60)]; // gap 600..690
    const data = withBlocks(blocks);
    const preview = dropPreview(blocks, cats, { kind: "place", catId: "work", day: 1, start: 610 });
    const placed = placeBlock(data, 0, "work", 1, 610, undefined, { uid: () => "new" }).weeks[0].find((b) => b.id === "new");
    expect(preview).toEqual({ day: 1, start: placed!.start, mins: placed!.mins });
    expect(preview).toEqual({ day: 1, start: 600, mins: 90 });
  });
  it("matches moveBlock", () => {
    const blocks = [blk("x", 0, 540, 120), blk("y", 2, 600, 60)];
    const preview = dropPreview(blocks, cats, { kind: "move", id: "x", day: 2, start: 640 });
    const moved = moveBlock(withBlocks(blocks), 0, "x", 2, 640).weeks[0].find((b) => b.id === "x")!;
    expect(preview).toEqual({ day: moved.day, start: moved.start, mins: moved.mins });
  });
  it("is null for a full day, an unknown category or block, and tag drops", () => {
    const full = [blk("f", 0, 420, 960)];
    expect(dropPreview(full, cats, { kind: "place", catId: "work", day: 0, start: 600 })).toBeNull();
    expect(dropPreview([], cats, { kind: "place", catId: "nope", day: 0, start: 600 })).toBeNull();
    expect(dropPreview([], cats, { kind: "move", id: "nope", day: 0, start: 600 })).toBeNull();
    expect(dropPreview(full, cats, { kind: "tag", blockId: "f", catId: "learn" })).toBeNull();
  });
});

describe("withAlpha", () => {
  it("appends alpha to 6-digit hex and expands 3-digit hex", () => {
    expect(withAlpha("#E8643C", "1a")).toBe("#E8643C1a");
    expect(withAlpha("#abc", "40")).toBe("#aabbcc40");
  });
  it("leaves other colour strings alone", () => {
    expect(withAlpha("red", "1a")).toBe("red");
    expect(withAlpha("#12345678", "1a")).toBe("#12345678");
  });
});
