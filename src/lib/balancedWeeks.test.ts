import { describe, expect, it } from "vitest";
import {
  clampRules,
  DEFAULT_RULES,
  dayKey,
  limitKept,
  mondayOf,
  season,
  seasonMondays,
  seasonStart,
  tickedMins,
  weekBalanced,
} from "./balancedWeeks";
import type { Category, HistoryEntry } from "./model";

const h = (n: number) => n * 60;
const cat = (id: string, limit: Category["limit"]): Category => ({ id, name: id, color: "#000", targetMins: 0, blockMins: 60, limit });
const rest = cat("rest", { kind: "floor", min: h(10) });
const work = cat("work", { kind: "ceiling", max: h(40) });
const proj = cat("proj", { kind: "range", min: h(4), max: h(8) });
const cats = [rest, work, proj];
const at = (y: number, mo: number, d: number, hh = 12) => new Date(y, mo - 1, d, hh).getTime();
const tick = (catId: string, mins: number, date: number): HistoryEntry => ({ id: `${catId}${date}`, catId, mins, date });

describe("calendar", () => {
  it("finds the Monday, local time", () => {
    expect(dayKey(mondayOf(new Date(2026, 10, 22, 23, 59)))).toBe("2026-11-16"); // Sunday night
    expect(dayKey(mondayOf(new Date(2026, 10, 23, 0, 1)))).toBe("2026-11-23"); // Monday just after midnight
  });
  it("uses weather seasons", () => {
    expect(dayKey(seasonStart(new Date(2026, 10, 4)))).toBe("2026-09-01");
    expect(dayKey(seasonStart(new Date(2026, 11, 20)))).toBe("2026-12-01");
    expect(dayKey(seasonStart(new Date(2027, 1, 10)))).toBe("2026-12-01");
    expect(dayKey(seasonStart(new Date(2027, 2, 1)))).toBe("2027-03-01");
    expect(dayKey(seasonStart(new Date(2027, 7, 31)))).toBe("2027-06-01");
  });
  it("lists the season's Mondays, a week belonging to the season its Monday is in", () => {
    const ms = seasonMondays(new Date(2026, 11, 20)).map(dayKey); // winter began Tue Dec 1
    expect(ms).toEqual(["2026-12-07", "2026-12-14"]);
  });
});

describe("judging a week", () => {
  it("sums ticked minutes in the week only", () => {
    const m = mondayOf(new Date(2026, 10, 18));
    const t = tickedMins([tick("rest", 60, at(2026, 11, 16, 0)), tick("rest", 30, at(2026, 11, 22, 23)), tick("rest", 99, at(2026, 11, 23, 0))], m);
    expect(t.get("rest")).toBe(90);
  });
  it("keeps floors at 80% and ceilings up to 10% over by default", () => {
    expect(limitKept(rest.limit, h(8), DEFAULT_RULES)).toBe(true);
    expect(limitKept(rest.limit, h(7.5), DEFAULT_RULES)).toBe(false);
    expect(limitKept(work.limit, h(44), DEFAULT_RULES)).toBe(true);
    expect(limitKept(work.limit, h(44.5), DEFAULT_RULES)).toBe(false);
    expect(limitKept(proj.limit, h(3.2), DEFAULT_RULES)).toBe(true);
    expect(limitKept(proj.limit, h(9), DEFAULT_RULES)).toBe(false);
    expect(limitKept({ kind: "floor", min: 0 }, 0, DEFAULT_RULES)).toBe(true);
  });
  it("follows changed rules", () => {
    const strict = { floorPct: 100, ceilingOverPct: 0 };
    expect(limitKept(rest.limit, h(9.5), strict)).toBe(false);
    expect(limitKept(work.limit, h(40.5), strict)).toBe(false);
  });
  it("needs every area kept", () => {
    const ok = new Map([["rest", h(9)], ["work", h(30)], ["proj", h(5)]]);
    expect(weekBalanced(cats, ok, DEFAULT_RULES)).toBe(true);
    expect(weekBalanced(cats, new Map([...ok, ["proj", 0]]), DEFAULT_RULES)).toBe(false);
  });
  it("clamps rules", () => {
    expect(clampRules({ floorPct: 150, ceilingOverPct: -5 })).toEqual({ floorPct: 100, ceilingOverPct: 0 });
    expect(clampRules({ floorPct: NaN })).toEqual(DEFAULT_RULES);
  });
});

describe("season", () => {
  const simple = [cat("rest", { kind: "floor", min: h(2) })];
  // weeks of fall 2026 starting Mon Oct 5, 12, 19, 26, Nov 2
  const good = (y: number, mo: number, d: number) => tick("rest", h(2), at(y, mo, d));
  const now = new Date(2026, 10, 4, 15); // Wed Nov 4

  it("counts all balanced weeks, marks grace one in four, leaves this week open", () => {
    const history = [good(2026, 10, 6), good(2026, 10, 20), good(2026, 10, 27)]; // Oct 12 week empty
    const s = season(simple, history, now);
    expect(s.start).toBe("2026-09-01");
    expect(s.weeks).toEqual([
      { monday: "2026-10-05", mark: "balanced" },
      { monday: "2026-10-12", mark: "grace" },
      { monday: "2026-10-19", mark: "balanced" },
      { monday: "2026-10-26", mark: "balanced" },
      { monday: "2026-11-02", mark: "current" },
    ]);
    expect(s.balancedCount).toBe(3);
  });
  it("allows one grace week in any four, never lowering the count", () => {
    const history = [good(2026, 9, 8), good(2026, 10, 20)]; // weeks of Sep 14, 21, 28, Oct 5, 12 empty
    const marks = season(simple, history, now).weeks.map((w) => w.mark);
    expect(marks).toEqual(["balanced", "grace", "unbalanced", "unbalanced", "unbalanced", "grace", "balanced", "unbalanced", "current"]);
    expect(season(simple, history, now).balancedCount).toBe(2);
  });
  it("counts this week once it's already balanced", () => {
    const s = season(simple, [good(2026, 11, 3)], now);
    expect(s.weeks).toEqual([{ monday: "2026-11-02", mark: "balanced" }]);
    expect(s.balancedCount).toBe(1);
  });
  it("starts at the first tick, and shows just this week for a new user", () => {
    expect(season(simple, [], now).weeks).toEqual([{ monday: "2026-11-02", mark: "current" }]);
    expect(season(simple, [good(2026, 10, 27)], now).weeks.map((w) => w.monday)).toEqual(["2026-10-26", "2026-11-02"]);
  });
  it("starts fresh each season", () => {
    const s = season(simple, [good(2026, 11, 24)], new Date(2026, 11, 9)); // winter: Mondays Dec 7
    expect(s.weeks).toEqual([{ monday: "2026-12-07", mark: "current" }]);
    expect(s.balancedCount).toBe(0);
  });
});
