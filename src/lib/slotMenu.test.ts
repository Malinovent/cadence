import { describe, expect, it } from "vitest";
import { placeBlock } from "./actions";
import { BUFFER_ID, BUFFER_MINS, DEFAULT_CATEGORIES } from "./constants";
import { defaultData, type Block } from "./model";
import { canAddAt, menuPosition, pickMins, pickPlacement, slotOptions } from "./slotMenu";

const cats = DEFAULT_CATEGORIES;
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

describe("slot menu", () => {
  it("uses the chosen length, else the area's or the buffer's usual one", () => {
    const work = cats.find((c) => c.id === "work")!;
    expect(pickMins(cats, "work", null)).toBe(work.blockMins);
    expect(pickMins(cats, "work", 90)).toBe(90);
    expect(pickMins(cats, BUFFER_ID, null)).toBe(BUFFER_MINS);
    expect(pickMins(cats, "nope", null)).toBeUndefined();
  });

  it("places exactly what placeBlock would", () => {
    const blocks = [blk("x", 1, 540, 60), blk("y", 1, 690, 60)]; // gap 600..690
    const p = pickPlacement(blocks, cats, { day: 1, start: 600 }, "learn", 120);
    const data = { ...defaultData(), weeks: [blocks, []] as [Block[], Block[]] };
    const made = placeBlock(data, 0, "learn", 1, 600, 120, { uid: () => "new" }).weeks[0].find((b) => b.id === "new")!;
    expect(p).toEqual({ start: made.start, mins: made.mins });
    expect(p).toEqual({ start: 600, mins: 90 }); // shrunk to fit
  });

  it("stays quiet on a full day", () => {
    const full = [blk("f", 0, 420, 960)];
    expect(canAddAt(full, 0, 600)).toBe(false);
    expect(canAddAt([], 0, 600)).toBe(true);
    expect(pickPlacement(full, cats, { day: 0, start: 600 }, "work", null)).toBeNull();
  });

  it("offers the areas in order, then the buffer", () => {
    expect(slotOptions(cats).map((o) => o.id)).toEqual([...cats.map((c) => c.id), BUFFER_ID]);
  });

  it("opens beside the tap, flipping left and staying inside the viewport", () => {
    const size = { w: 220, h: 300 };
    const vp = { w: 1000, h: 700 };
    expect(menuPosition({ x: 300, y: 200 }, size, vp)).toEqual({ left: 312, top: 184 });
    expect(menuPosition({ x: 900, y: 200 }, size, vp)).toEqual({ left: 668, top: 184 });
    expect(menuPosition({ x: 300, y: 650 }, size, vp).top).toBe(392);
    expect(menuPosition({ x: 100, y: 5 }, { w: 980, h: 300 }, vp)).toEqual({ left: 8, top: 8 });
  });
});
