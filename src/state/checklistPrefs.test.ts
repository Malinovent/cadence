import { describe, expect, it } from "vitest";
import { DEFAULT_CHECKLIST, parseChecklist, restartChecklist, type ChecklistPrefs } from "./checklistPrefs";

describe("the checklist's saved state", () => {
  it("reads what was saved, and anything broken as a fresh start", () => {
    const saved = { shown: true, dismissed: false, collapsed: true, done: { place: true, tick: true } };
    expect(parseChecklist(JSON.stringify(saved))).toEqual(saved);
    expect(parseChecklist(null)).toEqual(DEFAULT_CHECKLIST);
    expect(parseChecklist("{not json")).toEqual(DEFAULT_CHECKLIST);
    expect(parseChecklist(JSON.stringify({ shown: "yes", done: { place: 1, nope: true } }))).toEqual(DEFAULT_CHECKLIST);
  });
  it("a replay brings it back open, at 0 of 5", () => {
    const finished: ChecklistPrefs = {
      shown: true,
      dismissed: true,
      collapsed: true,
      done: { place: true, tick: true, area: true },
    };
    expect(restartChecklist(finished)).toEqual({ shown: true, dismissed: false, collapsed: false, done: {} });
  });
});
