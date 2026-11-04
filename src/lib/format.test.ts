import { describe, expect, it } from "vitest";
import { droppedLine, importSummaryLine } from "./format";

describe("importSummaryLine", () => {
  it("uses plurals", () => {
    expect(importSummaryLine({ categories: 4, blocks: 12, templates: 2, sessions: 37, streaks: 3, tasks: 0 })).toBe(
      "4 categories · 12 blocks across both weeks · 2 templates · 37 logged sessions · 3 streaks.",
    );
  });

  it("uses singulars for one", () => {
    expect(importSummaryLine({ categories: 1, blocks: 1, templates: 1, sessions: 1, streaks: 1, tasks: 0 })).toBe(
      "1 category · 1 block across both weeks · 1 template · 1 logged session · 1 streak.",
    );
  });

  it("uses plurals for zero", () => {
    expect(importSummaryLine({ categories: 0, blocks: 0, templates: 0, sessions: 0, streaks: 0, tasks: 0 })).toBe(
      "0 categories · 0 blocks across both weeks · 0 templates · 0 logged sessions · 0 streaks.",
    );
  });

  it("appends tasks only when there are any", () => {
    const s = { categories: 4, blocks: 12, templates: 2, sessions: 37, streaks: 3 };
    expect(importSummaryLine({ ...s, tasks: 1 })).toBe(
      "4 categories · 12 blocks across both weeks · 2 templates · 37 logged sessions · 3 streaks · 1 task.",
    );
    expect(importSummaryLine({ ...s, tasks: 5 })).toBe(
      "4 categories · 12 blocks across both weeks · 2 templates · 37 logged sessions · 3 streaks · 5 tasks.",
    );
  });
});

describe("droppedLine", () => {
  it("is null when nothing was dropped", () => {
    expect(droppedLine(0)).toBeNull();
  });
  it("is singular for one", () => {
    expect(droppedLine(1)).toBe("Skipped 1 entry that didn't look right.");
  });
  it("is plural for several", () => {
    expect(droppedLine(2)).toBe("Skipped 2 entries that didn't look right.");
  });
});
