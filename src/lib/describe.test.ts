import { describe, expect, it } from "vitest";
import { describeArea, describeLastWeek } from "./describe";
import type { Category, HistoryEntry } from "./model";

const h = (n: number) => n * 60;
const cat = (id: string, name: string, limit: Category["limit"]): Category => ({ id, name, color: "#000", targetMins: 0, blockMins: 60, limit });
const rest = cat("rest", "Rest", { kind: "floor", min: h(8) });
const work = cat("work", "Work", { kind: "ceiling", max: h(40) });
const proj = cat("proj", "Project", { kind: "range", min: h(4), max: h(8) });

describe("neutral week descriptions", () => {
  it("describes floors, ceilings and ranges without judging", () => {
    expect(describeArea(rest, h(5))).toBe("Rest was lighter than your floor (5 of 8 h).");
    expect(describeArea(rest, h(9))).toBe("Rest reached your floor (9 of 8 h).");
    expect(describeArea(rest, 0)).toBe("No Rest blocks were ticked.");
    expect(describeArea(work, h(32))).toBe("Work stayed under your ceiling (32 of 40 h).");
    expect(describeArea(work, 0)).toBe("Work stayed under your ceiling (0 of 40 h).");
    expect(describeArea(work, h(43))).toBe("Work went 3 h past your ceiling (43 of 40 h).");
    expect(describeArea(proj, h(5))).toBe("Project landed in your range (5 h, 4–8 h).");
    expect(describeArea(proj, h(2))).toBe("Project was lighter than your range (2 h, 4–8 h).");
    expect(describeArea(proj, h(9))).toBe("Project went 1 h past your range (9 of 8 h).");
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
    expect(lines.map((l) => l.text)).toEqual(["Rest was lighter than your floor (5 of 8 h).", "Work stayed under your ceiling (0 of 40 h)."]);
  });
});
