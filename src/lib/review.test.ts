import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./balancedWeeks";
import { defaultData, type Block, type CadenceData } from "./model";
import { hasReview, lastWeekLines, weekReview } from "./review";

const blk = (id: string, catIds: string[], mins: number, done: boolean, extra: Partial<Block> = {}): Block => ({
  id,
  day: 0,
  start: 540,
  mins,
  label: "",
  desc: "",
  done,
  catIds,
  ...extra,
});
// two areas: Rest at least 2 h, Work at most 4 h
const data = (week: Block[]): CadenceData => {
  const d = defaultData();
  return {
    ...d,
    cats: [
      { ...d.cats[0], id: "rest", name: "Rest", limit: { kind: "floor", min: 120 } },
      { ...d.cats[1], id: "work", name: "Work", limit: { kind: "ceiling", max: 240 } },
    ],
    weeks: [week, []],
  };
};

describe("the week in review", () => {
  it("is balanced when every area kept its time, from ticked blocks only", () => {
    const r = weekReview(
      data([blk("a", ["rest"], 120, true), blk("b", ["work"], 180, true), blk("c", ["rest"], 60, false)]),
      DEFAULT_RULES,
    );
    expect(r).toMatchObject({ balanced: true, ticked: 2, total: 3 });
    expect(r.lines.map((l) => [l.name, l.kept])).toEqual([
      ["Rest", true],
      ["Work", true],
    ]);
    expect(r.lines[0]).toMatchObject({ hours: "2", limit: "At least 2 h", text: "Rest reached at least 2 h (2 h)." });
  });
  it("isn't when an area fell short or went over; planned but unticked doesn't count", () => {
    const short = weekReview(data([blk("a", ["rest"], 120, false), blk("b", ["work"], 60, true)]), DEFAULT_RULES);
    expect(short.balanced).toBe(false);
    expect(short.lines[0].kept).toBe(false);
    const over = weekReview(data([blk("a", ["rest"], 120, true), blk("b", ["work"], 300, true)]), DEFAULT_RULES);
    expect(over.balanced).toBe(false);
  });
  it("counts a block for two areas fully to each, and leaves buffers out", () => {
    const r = weekReview(
      data([blk("a", ["rest", "work"], 120, true), blk("buf", [], 30, false, { buffer: true })]),
      DEFAULT_RULES,
    );
    expect(r).toMatchObject({ balanced: true, ticked: 1, total: 1 });
  });
  it("gives Stats the same rows for last week, from history", () => {
    const d = data([]);
    const now = new Date(2026, 10, 11); // a Wednesday
    const lastWeek = new Date(2026, 10, 3, 10).getTime(); // last Tuesday
    const rows = lastWeekLines(
      d.cats,
      [
        { id: "x", catId: "rest", mins: 90, date: lastWeek },
        { id: "y", catId: "rest", mins: 60, date: now.getTime() }, // this week: not counted
      ],
      now,
      DEFAULT_RULES,
    );
    expect(rows.map((r) => [r.name, r.hours, r.limit, r.kept])).toEqual([
      ["Rest", "1.5", "At least 2 h", false],
      ["Work", "0", "At most 4 h", true],
    ]);
  });
  it("has nothing to show for an empty week", () => {
    expect(hasReview(weekReview(data([]), DEFAULT_RULES))).toBe(false);
  });
});
