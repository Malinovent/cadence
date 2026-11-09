import { describe, expect, it } from "vitest";
import { ROW_H, ROW_H_PHONE } from "./constants";
import { blockBox } from "./gesture";
import { blockText, daysWithBlocks, defaultDay, narrowTick, swipeDay, tallerThan } from "./dayview";

describe("defaultDay", () => {
  it("is today's weekday (Mon = 0) on week 1", () => {
    expect(defaultDay(0, new Date(2026, 10, 2))).toBe(0); // Monday
    expect(defaultDay(0, new Date(2026, 10, 3))).toBe(1); // Tuesday
    expect(defaultDay(0, new Date(2026, 10, 8))).toBe(6); // Sunday
  });
  it("is Monday on week 2", () => {
    expect(defaultDay(1, new Date(2026, 10, 5))).toBe(0);
    expect(defaultDay(1, new Date(2026, 10, 8))).toBe(0);
  });
});

describe("swipeDay", () => {
  it("swipe left goes to the next day, right to the previous", () => {
    expect(swipeDay(2, -60, 0, false)).toBe(3);
    expect(swipeDay(2, 60, 10, false)).toBe(1);
  });
  it("needs more than 50px of horizontal travel", () => {
    expect(swipeDay(2, -50, 0, false)).toBeNull();
    expect(swipeDay(2, -51, 0, false)).toBe(3);
  });
  it("needs |dx| > 1.5 * |dy|", () => {
    expect(swipeDay(2, -90, 60, false)).toBeNull(); // exactly 1.5x
    expect(swipeDay(2, -91, 60, false)).toBe(3);
    expect(swipeDay(2, 80, -100, false)).toBeNull();
  });
  it("does not wrap past Mon or Sun", () => {
    expect(swipeDay(0, 80, 0, false)).toBeNull();
    expect(swipeDay(6, -80, 0, false)).toBeNull();
    expect(swipeDay(6, 80, 0, false)).toBe(5);
  });
  it("is ignored while the engine dragged or resized", () => {
    expect(swipeDay(2, -200, 0, true)).toBeNull();
  });
});

describe("tallerThan / blockText", () => {
  it("is exactly the legacy px comparison at 26px rows", () => {
    for (let h = 0; h < 200; h++) {
      for (const t of [44, 46, 74, 78]) expect(tallerThan(h, ROW_H, t)).toBe(h > t);
    }
  });
  it("shows the same text at the same duration on phone rows", () => {
    for (let mins = 30; mins <= 480; mins += 30) {
      for (const hasDesc of [false, true]) {
        const desk = blockText(blockBox(540, mins, ROW_H).height, ROW_H, hasDesc);
        const phone = blockText(blockBox(540, mins, ROW_H_PHONE).height, ROW_H_PHONE, hasDesc);
        expect(phone).toEqual(desk);
      }
    }
  });
  it("matches the legacy durations: desc from 1h, time from 1h (from 2h with a desc), 2 desc lines from 2h", () => {
    const at = (mins: number, hasDesc: boolean) => blockText(blockBox(540, mins, ROW_H_PHONE).height, ROW_H_PHONE, hasDesc);
    expect(at(30, true)).toEqual({ desc: false, time: false, descLines: 1 });
    expect(at(60, true)).toEqual({ desc: true, time: false, descLines: 1 });
    expect(at(90, true)).toEqual({ desc: true, time: false, descLines: 1 });
    expect(at(120, true)).toEqual({ desc: true, time: true, descLines: 2 });
    expect(at(60, false).time).toBe(true);
    expect(at(30, false).time).toBe(false);
  });
});

describe("narrowTick", () => {
  // the phone's week: 24px rows, slim blocks with their icons two across
  const at = (mins: number, areas: number) => narrowTick(blockBox(540, mins, 24).height, 24, areas);
  it("shows the tick from an hour under one icon, or two side by side", () => {
    expect(at(30, 1)).toBe(false);
    expect(at(30, 2)).toBe(false);
    expect(at(60, 1)).toBe(true);
    expect(at(60, 2)).toBe(true);
  });
  it("needs an hour and a half once the icons take a second line", () => {
    expect(at(60, 3)).toBe(false);
    expect(at(60, 4)).toBe(false);
    expect(at(90, 3)).toBe(true);
    expect(at(90, 4)).toBe(true);
  });
  it("only when the icons, the gap and the 18px tick fit inside the block", () => {
    for (const rowH of [24, ROW_H]) {
      for (let mins = 30; mins <= 240; mins += 30) {
        for (let areas = 1; areas <= 6; areas++) {
          const { height } = blockBox(540, mins, rowH);
          const lines = Math.ceil(areas / 2);
          const icons = areas === 1 ? 13 : lines * 11 + (lines - 1) * 2;
          if (narrowTick(height, rowH, areas)) expect(2 + icons + 4 + 18 + 2).toBeLessThanOrEqual(height);
        }
      }
    }
  });
});

describe("daysWithBlocks", () => {
  it("flags the days that have blocks", () => {
    expect(daysWithBlocks([{ day: 1 }, { day: 1 }, { day: 6 }])).toEqual([false, true, false, false, false, false, true]);
    expect(daysWithBlocks([])).toEqual(Array(7).fill(false));
  });
});
