import { describe, expect, it } from "vitest";
import { placeBlock, moveBlock, resize } from "./actions";
import { DEFAULT_HOURS, endChoices, gridBounds, parseDayHours, startChoices, withEnd, withStart } from "./dayHours";
import { dropPreview } from "./gesture";
import { defaultData, normalizeData } from "./model";
import { nowLineTop } from "./now";
import { canAddAt, pickPlacement } from "./slotMenu";

const h = (n: number) => n * 60;
const early = [h(5), h(24)] as const;

describe("the hours the calendar shows", () => {
  it("are 7:00 to 23:00 unless chosen, and anything odd reads as the default", () => {
    expect(parseDayHours(null)).toEqual(DEFAULT_HOURS);
    expect(parseDayHours(JSON.stringify([h(5), h(24)]))).toEqual([h(5), h(24)]);
    expect(parseDayHours(JSON.stringify([h(9), h(11)]))).toEqual(DEFAULT_HOURS); // under four hours
    expect(parseDayHours(JSON.stringify([h(5) + 30, h(20)]))).toEqual(DEFAULT_HOURS); // not on the hour
    expect(parseDayHours(JSON.stringify([-60, h(20)]))).toEqual(DEFAULT_HOURS);
    expect(parseDayHours("{nope")).toEqual(DEFAULT_HOURS);
  });
  it("offer starts from midnight to 20:00, and ends at least four hours later", () => {
    expect(startChoices()[0]).toBe(0);
    expect(startChoices().at(-1)).toBe(h(20));
    expect(endChoices(h(20))).toEqual([h(24)]);
    expect(endChoices(h(7))[0]).toBe(h(11));
    expect(withStart([h(7), h(23)], h(20))).toEqual([h(20), h(24)]); // the end makes room
    expect(withStart([h(7), h(23)], h(5))).toEqual([h(5), h(23)]);
    expect(withEnd([h(7), h(23)], h(9))).toEqual([h(7), h(11)]);
  });
  it("grow by the hour to hold every block of both weeks: nothing is hidden", () => {
    const b = (start: number, mins: number) => ({ start, mins });
    expect(gridBounds([h(9), h(17)], [[b(h(10), 60)], []])).toEqual([h(9), h(17)]);
    expect(gridBounds([h(9), h(17)], [[b(h(7) + 30, 60)], [b(h(20), 90)]])).toEqual([h(7), h(22)]);
    expect(gridBounds(DEFAULT_HOURS, [[], []])).toEqual(DEFAULT_HOURS);
  });
});

describe("blocks outside 7:00–23:00", () => {
  const uid = () => "n";
  it("can be placed, moved and resized within the chosen hours", () => {
    const d = placeBlock(defaultData(), 0, "work", 0, h(5), 60, { uid, bounds: early });
    expect(d.weeks[0][0]).toMatchObject({ start: h(5), mins: 60 });
    const moved = moveBlock(d, 0, "n", 1, h(23), { bounds: early });
    expect(moved.weeks[0][0]).toMatchObject({ day: 1, start: h(23), mins: 60 });
    const longer = resize(moved, 0, "n", "top", h(23), 60, -2, { bounds: early });
    expect(longer.weeks[0][0]).toMatchObject({ start: h(22), mins: 120 });
  });
  it("still keep to 7:00–23:00 when no hours are given, as before", () => {
    const d = placeBlock(defaultData(), 0, "work", 0, h(5), 60, { uid });
    expect(d.weeks[0][0].start).toBe(h(7));
  });
  it("survive a reload: only a block past midnight is dropped", () => {
    const blk = (id: string, start: number, mins: number) => ({
      id,
      day: 0,
      start,
      mins,
      label: "",
      desc: "",
      done: false,
      catIds: ["work"],
    });
    const { data, dropped } = normalizeData({
      ...defaultData(),
      weeks: [[blk("dawn", h(5), 60), blk("late", h(23), 60), blk("past", h(23) + 30, 60)], []],
    });
    expect(data.weeks[0].map((x) => x.id)).toEqual(["dawn", "late"]);
    expect(dropped).toBe(1);
  });
  it("preview, the add window and the now line follow the hours too", () => {
    const blocks = defaultData().weeks[0];
    expect(
      dropPreview(blocks, defaultData().cats, { kind: "place", catId: "work", day: 0, start: h(5) }, early),
    ).toMatchObject({
      start: h(5),
    });
    expect(pickPlacement(blocks, defaultData().cats, { day: 0, start: h(5) }, "work", early)?.start).toBe(h(5));
    expect(canAddAt(blocks, 0, h(5), early)).toBe(true);
    expect(nowLineTop(0, { day: 0, mins: h(6) }, 20, early)).toBe(40);
    expect(nowLineTop(0, { day: 0, mins: h(6) }, 20)).toBeNull(); // before 7:00 by default
  });
});
