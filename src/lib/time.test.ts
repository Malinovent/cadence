import { describe, expect, it } from "vitest";
import { fmtDur, fmtNum, fmtTime } from "./time";

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
    // decimal hours (JP, 2026-11-08: "I prefer 1.5 instead of 1h30")
    expect(fmtDur(150)).toBe("2.5h");
    expect(fmtDur(120)).toBe("2h");
    expect(fmtDur(45)).toBe("0.75h");
    expect(fmtDur(30)).toBe("0.5h");
    expect(fmtDur(0)).toBe("0h");
    expect(fmtDur(0, "fr")).toBe("0 h");
    expect(fmtDur(90, "fr")).toBe("1,5 h");
    expect(fmtDur(1200)).toBe("20h");
  });
});

describe("fmtNum", () => {
  it("is the bare number, only for the tags under an area (JP: \"9.5 to go\")", () => {
    expect(fmtNum(570)).toBe("9.5");
    expect(fmtNum(90, "fr")).toBe("1,5");
  });
});
