import { describe, expect, it } from "vitest";
import { ROW_H } from "./constants";
import { fmtClock, fmtLeft, isNowBlock, minutesLeft, msToNextMinute, nowLineTop, nowPoint } from "./now";

// Wednesday 2026-11-18, 10:22:30 local time
const wed = new Date(2026, 10, 18, 10, 22, 30);
const p = nowPoint(wed);

describe("nowPoint", () => {
  it("maps the date to Mon=0 and minutes", () => {
    expect(p.day).toBe(2);
    expect(p.mins).toBeCloseTo(622.5);
    expect(nowPoint(new Date(2026, 10, 22, 0, 0)).day).toBe(6); // Sunday
  });
});

describe("isNowBlock", () => {
  const deep = { day: 2, start: 540, mins: 120 }; // 9:00-11:00
  it("is true inside the block on week 1 only", () => {
    expect(isNowBlock(deep, 0, p)).toBe(true);
    expect(isNowBlock(deep, 1, p)).toBe(false);
    expect(isNowBlock({ ...deep, day: 3 }, 0, p)).toBe(false);
  });
  it("includes the start and excludes the end", () => {
    expect(isNowBlock({ day: 2, start: 600, mins: 22 }, 0, { day: 2, mins: 622 })).toBe(false);
    expect(isNowBlock({ day: 2, start: 622, mins: 30 }, 0, { day: 2, mins: 622 })).toBe(true);
  });
});

describe("minutesLeft / fmtLeft", () => {
  it("rounds up to whole minutes, at least 1", () => {
    expect(minutesLeft({ start: 540, mins: 120 }, p)).toBe(38);
    expect(minutesLeft({ start: 540, mins: 120 }, { day: 2, mins: 659.9 })).toBe(1);
  });
  it("formats like the brief", () => {
    expect(fmtLeft(38)).toBe("38m left");
    expect(fmtLeft(60)).toBe("1h left");
    expect(fmtLeft(85)).toBe("1.4h left");
    expect(fmtLeft(65)).toBe("1.1h left");
  });
});

describe("nowLineTop", () => {
  it("places the line by rows from the grid start", () => {
    expect(nowLineTop(0, { day: 2, mins: 7 * 60 }, ROW_H)).toBe(0);
    expect(nowLineTop(0, { day: 2, mins: 10 * 60 + 15 }, 40)).toBe(260);
  });
  it("hides outside the grid's hours and on week 2", () => {
    expect(nowLineTop(0, { day: 2, mins: 6 * 60 }, ROW_H)).toBeNull();
    expect(nowLineTop(0, { day: 2, mins: 23 * 60 }, ROW_H)).toBeNull();
    expect(nowLineTop(1, p, ROW_H)).toBeNull();
  });
});

describe("fmtClock / msToNextMinute", () => {
  it("uses the grid's time format, to the minute", () => {
    expect(fmtClock(p)).toBe("10:22am");
    expect(fmtClock({ day: 0, mins: 13 * 60 + 5.9 })).toBe("1:05pm");
  });
  it("counts to the next minute", () => expect(msToNextMinute(wed)).toBe(30_000));
});
