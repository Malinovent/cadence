import { describe, expect, it } from "vitest";
import { fmtDur, fmtHours, fmtTime } from "./time";

describe("fmtTime", () => {
  it("formats like the legacy app", () => {
    expect(fmtTime(0)).toBe("12am");
    expect(fmtTime(420)).toBe("7am");
    expect(fmtTime(450)).toBe("7:30am");
    expect(fmtTime(720)).toBe("12pm");
    expect(fmtTime(750)).toBe("12:30pm");
    expect(fmtTime(810)).toBe("1:30pm");
    expect(fmtTime(1380)).toBe("11pm");
    expect(fmtTime(545)).toBe("9:05am");
  });
});

describe("fmtDur", () => {
  it("formats like the legacy app", () => {
    // hours, no unit (JP, 2026-11-08: "I prefer 1.5 instead of 1h30", "get rid of the h")
    expect(fmtDur(150)).toBe("2.5");
    expect(fmtDur(120)).toBe("2");
    expect(fmtDur(45)).toBe("0.75");
    expect(fmtDur(30)).toBe("0.5");
    expect(fmtDur(0)).toBe("0");
    expect(fmtDur(0, "fr")).toBe("0");
    expect(fmtDur(90, "fr")).toBe("1,5");
    expect(fmtDur(1200)).toBe("20");
  });
  it("keeps the unit for sentences read away from the screen", () => {
    expect(fmtHours(150)).toBe("2.5h");
    expect(fmtHours(90, "fr")).toBe("1,5 h");
  });
});
