import { describe, expect, it } from "vitest";
import { fmtDur, fmtTime } from "./time";

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
    expect(fmtDur(150)).toBe("2h30");
    expect(fmtDur(120)).toBe("2h");
    expect(fmtDur(45)).toBe("45m");
    expect(fmtDur(30)).toBe("30m");
    expect(fmtDur(0)).toBe("0m");
    expect(fmtDur(1200)).toBe("20h");
  });
});
