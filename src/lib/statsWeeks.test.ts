import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./balancedWeeks";
import type { Category, HistoryEntry } from "./model";
import {
  areaLines,
  areaTrends,
  gapText,
  monthStarts,
  rowBar,
  shiftWeek,
  weekGap,
  weekRows,
  weekSpan,
} from "./statsWeeks";
import { LIB_FR } from "./words.fr";

const h = (n: number) => Math.round(n * 60);
const cat = (id: string, limit: Category["limit"]): Category =>
  ({ id, name: id, color: "#000", limit, blockMins: 60 }) as Category;
const exercise = cat("exercise", { kind: "floor", min: h(4) });
const work = cat("work", { kind: "ceiling", max: h(40) });
const play = cat("play", { kind: "range", min: h(2), max: h(5) });
// Wednesday 11 November 2026: this week starts Monday 9, last week Monday 2
const now = new Date(2026, 10, 11, 10);
let n = 0;
const tick = (y: number, mo: number, d: number, catId: string, mins: number): HistoryEntry => ({
  id: `b${n++}`,
  catId,
  mins,
  date: new Date(y, mo, d, 18).getTime(),
});

describe("which weeks Stats can show", () => {
  it("runs from the week of the first tick to this week", () => {
    expect(weekSpan([tick(2026, 9, 14, "work", 60)], now)).toEqual({ first: "2026-10-12", last: "2026-11-09" });
  });
  it("always reaches back to last week, even before any tick", () => {
    expect(weekSpan([], now)).toEqual({ first: "2026-11-02", last: "2026-11-09" });
  });
  it("steps a week at a time from any day's key", () => {
    expect(shiftWeek("2026-11-09", -1)).toBe("2026-11-02");
    expect(shiftWeek("2026-11-04", 1)).toBe("2026-11-09");
    expect(shiftWeek("2026-03-02", 4)).toBe("2026-03-30"); // across the spring clock change
  });
});

describe("what a week missed by", () => {
  it("says nothing when the target was kept, by the balanced-weeks rules", () => {
    expect(weekGap(exercise.limit, h(4), DEFAULT_RULES, false)).toBeNull();
    expect(weekGap(exercise.limit, h(3.5), DEFAULT_RULES, false)).toBeNull(); // 80% is enough
    expect(weekGap(work.limit, h(43), DEFAULT_RULES, false)).toBeNull(); // within 10% over
  });
  it("short of an at least, past an at most, exactly", () => {
    expect(weekGap(exercise.limit, h(3), DEFAULT_RULES, false)).toEqual({ kind: "short", mins: h(1) });
    expect(weekGap(work.limit, h(46), DEFAULT_RULES, false)).toEqual({ kind: "over", mins: h(6) });
    expect(weekGap(play.limit, h(1), DEFAULT_RULES, false)).toEqual({ kind: "short", mins: h(1) });
    expect(weekGap(play.limit, h(6), DEFAULT_RULES, false)).toEqual({ kind: "over", mins: h(1) });
  });
  it("this week is still open: what's left is still to go, not short", () => {
    expect(weekGap(exercise.limit, h(1), DEFAULT_RULES, true)).toEqual({ kind: "toGo", mins: h(3) });
  });
  it("in words, in the chip's format, in both languages", () => {
    expect(gapText({ kind: "short", mins: h(1.5) })).toBe("1.5 short");
    expect(gapText({ kind: "over", mins: 30 })).toBe("0.5 over");
    expect(gapText({ kind: "toGo", mins: h(3) })).toBe("3 to go");
    expect(gapText({ kind: "short", mins: h(1) }, LIB_FR)).toBe("il manque 1");
    expect(gapText({ kind: "over", mins: h(2) }, LIB_FR)).toBe("2 de trop");
  });
});

describe("a week's rows", () => {
  it("adds up each area's ticked time in that week only", () => {
    const history = [
      tick(2026, 10, 3, "exercise", 120),
      tick(2026, 10, 5, "exercise", 60),
      tick(2026, 10, 10, "exercise", 60), // this week
      tick(2026, 10, 4, "work", h(38)),
    ];
    const rows = weekRows([exercise, work], history, "2026-11-02", DEFAULT_RULES, false);
    expect(rows.map((r) => [r.cat.id, r.mins, r.kept, r.gap])).toEqual([
      ["exercise", h(3), false, { kind: "short", mins: h(1) }],
      ["work", h(38), true, null],
    ]);
  });
});

describe("a row's bar", () => {
  it("at least: the fill and one mark, never on the very end", () => {
    const b = rowBar(exercise.limit, h(3));
    expect(b.marks).toHaveLength(1);
    expect(b.marks[0]).toBeCloseTo(1 / 1.15);
    expect(b.fill).toBeCloseTo(0.75 / 1.15);
    expect(b.over).toBe(0);
  });
  it("at most: past the top is striped", () => {
    const b = rowBar(work.limit, h(46));
    expect(b.fill + b.over).toBeCloseTo(1 / 1.15);
    expect(b.over).toBeCloseTo(6 / 46 / 1.15);
  });
  it("between: two marks", () => {
    expect(rowBar(play.limit, h(3)).marks).toHaveLength(2);
  });
});

describe("the last 12 weeks per area", () => {
  it("counts only weeks since the first tick, oldest first", () => {
    const history = [
      tick(2026, 9, 20, "exercise", h(4)), // week of Oct 19: kept
      tick(2026, 9, 28, "exercise", h(1)), // week of Oct 26: short
      tick(2026, 10, 3, "exercise", h(5)), // week of Nov 2: kept
      tick(2026, 10, 10, "exercise", h(9)), // this week: not in the trend
    ];
    const [t] = areaTrends([exercise], history, now, DEFAULT_RULES);
    expect(t.weeks).toHaveLength(12);
    expect(t.weeks[11]).toMatchObject({ monday: "2026-11-02", mins: h(5), kept: true, counted: true });
    expect(t.weeks[8]).toMatchObject({ monday: "2026-10-12", counted: false, kept: false });
    expect([t.kept, t.counted]).toEqual([2, 3]);
    expect(t.scale).toBe(h(5)); // the largest week, past the target's 5 h
  });
  it("draws against a little past the target when every week is small", () => {
    const [t] = areaTrends([exercise], [tick(2026, 10, 3, "exercise", 60)], now, DEFAULT_RULES);
    expect(t.scale).toBe(h(5));
  });
});

describe("months under the season's squares", () => {
  it("marks the first square and each square that starts a month", () => {
    expect(monthStarts(["2026-09-07", "2026-09-14", "2026-09-28", "2026-10-05", "2026-10-12", "2026-11-02"])).toEqual([
      0, 3, 5,
    ]);
  });
});

describe("trends: a line per area, and which way it is going", () => {
  // a tick on the Tuesday of the week `w` weeks before this one (this week starts Monday 9 November)
  const weeksAgo = (w: number, catId: string, mins: number) => ({
    id: `t${n++}`,
    catId,
    mins,
    date: new Date(2026, 10, 10 - 7 * w, 18).getTime(),
  });
  const steps = (catId: string, first: number[], then: number[]) => [
    ...first.map((mins, i) => weeksAgo(8 - i, catId, mins)),
    ...then.map((mins, i) => weeksAgo(4 - i, catId, mins)),
  ];
  it("draws each finished week since the first tick, oldest first, and leaves this week out", () => {
    const history = [
      ...steps("exercise", [h(3), h(3), h(3), h(3)], [h(4.5), h(4.5), h(4.5), h(4.5)]),
      weeksAgo(0, "exercise", h(9)),
    ];
    const [line] = areaLines([exercise], history, now, 12);
    expect(line.points).toEqual([h(3), h(3), h(3), h(3), h(4.5), h(4.5), h(4.5), h(4.5)]);
    expect(line).toMatchObject({ recent: h(4.5), direction: "up", change: h(1.5) });
    expect(line.scale).toBe(h(5)); // past the 4 h target
  });
  it("says down, and steady within half an hour a week, whatever the area's kind", () => {
    const down = areaLines([work], steps("work", [h(40), h(40), h(40), h(40)], [h(36), h(36), h(36), h(36)]), now, 26);
    expect(down[0]).toMatchObject({ direction: "down", change: h(4), recent: h(36) });
    const steady = areaLines(
      [work],
      steps("work", [h(38), h(38), h(38), h(38)], [h(38), h(38), h(38), h(38.25)]),
      now,
      26,
    );
    expect(steady[0]).toMatchObject({ direction: "steady", change: 0 });
  });
  it("needs 8 weeks before it compares, and draws what there is", () => {
    const [line] = areaLines([exercise], [weeksAgo(3, "exercise", h(2)), weeksAgo(1, "exercise", h(4))], now, 12);
    expect(line.points).toEqual([h(2), 0, h(4)]);
    expect(line).toMatchObject({ direction: null, recent: h(2) });
  });
  it("has nothing to draw before the first tick", () => {
    expect(areaLines([exercise], [], now, 52)[0].points).toEqual([]);
  });
  it("keeps to the range: 12 weeks, 6 months or a year", () => {
    const history = [weeksAgo(40, "exercise", h(1)), weeksAgo(1, "exercise", h(1))];
    expect(areaLines([exercise], history, now, 12)[0].points).toHaveLength(12);
    expect(areaLines([exercise], history, now, 52)[0].points).toHaveLength(40);
  });
});
