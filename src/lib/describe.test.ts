import { describe, expect, it } from "vitest";
import { describeArea, describeLastWeek } from "./describe";
import type { Category, HistoryEntry } from "./model";

const h = (n: number) => n * 60;
const cat = (id: string, name: string, limit: Category["limit"]): Category => ({
  id,
  name,
  color: "#000",
  targetMins: 0,
  blockMins: 60,
  limit,
});
const rest = cat("rest", "Rest", { kind: "floor", min: h(8) });
const work = cat("work", "Work", { kind: "ceiling", max: h(40) });
const proj = cat("proj", "Project", { kind: "range", min: h(4), max: h(8) });

describe("neutral week descriptions", () => {
  it("describes floors, ceilings and ranges without judging", () => {
    expect(describeArea(rest, h(5))).toBe("Rest was under its 8 h (5 h).");
    expect(describeArea(rest, h(9))).toBe("Rest reached at least 8 h (9 h).");
    expect(describeArea(rest, 0)).toBe("No Rest blocks were ticked.");
    expect(describeArea(work, h(32))).toBe("Work stayed within its 40 h (32 h).");
    expect(describeArea(work, 0)).toBe("Work stayed within its 40 h (0 h).");
    expect(describeArea(work, h(43))).toBe("Work went 3 h over its 40 h (43 h).");
    expect(describeArea(proj, h(5))).toBe("Project landed between 4 and 8 h (5 h).");
    expect(describeArea(proj, h(2))).toBe("Project was under its 4 to 8 h (2 h).");
    expect(describeArea(proj, h(9))).toBe("Project went 1 h over its 8 h (9 h).");
  });
  it("never uses judging words", () => {
    const all = [0, 1, 5, 9, 43].flatMap((n) => [rest, work, proj].map((c) => describeArea(c, h(n))));
    for (const s of all) expect(s).not.toMatch(/miss|fail|only|behind|should|broke|bad/i);
  });
  it("reads last week's ticked time, Monday to Sunday", () => {
    const now = new Date(2026, 10, 4, 12); // Wed Nov 4; last week = Oct 26 – Nov 1
    const tick = (catId: string, mins: number, d: Date): HistoryEntry => ({ id: "b", catId, mins, date: d.getTime() });
    const history = [
      tick("rest", h(3), new Date(2026, 9, 26, 9)),
      tick("rest", h(2), new Date(2026, 10, 1, 22)),
      tick("rest", h(4), new Date(2026, 10, 2, 9)), // this week: not counted
      tick("rest", h(4), new Date(2026, 9, 25, 9)), // the week before: not counted
    ];
    const lines = describeLastWeek([rest, work], history, now);
    expect(lines.map((l) => l.text)).toEqual([
      "Rest was under its 8 h (5 h).",
      "Work stayed within its 40 h (0 h).",
    ]);
  });
});
