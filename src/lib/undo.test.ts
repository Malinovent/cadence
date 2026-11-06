import { describe, expect, it } from "vitest";
import { advanceWeek, placeBlock } from "./actions";
import { defaultData } from "./model";
import { applyStarter, STARTERS } from "./starters";
import { replaceAll } from "./actions";
import { undoAvailable } from "./undo";

describe("undo after a week is replaced", () => {
  const start = placeBlock(defaultData(), 0, "work", 0, 540, undefined, { uid: () => "mine" });

  it("is offered until anything else changes", () => {
    const after = applyStarter(start, 0, STARTERS[0].id);
    const offer = { before: start, after, text: "" };
    expect(undoAvailable(offer, after)).toBe(true);
    expect(undoAvailable(offer, placeBlock(after, 1, "work", 0, 540))).toBe(false);
    expect(undoAvailable(null, after)).toBe(false);
  });
  it("brings back the week and takes away the areas a starter added", () => {
    const after = applyStarter(start, 0, STARTERS[0].id);
    expect(after.cats.length).toBeGreaterThan(start.cats.length);
    expect(replaceAll(after, start)).toEqual(start);
  });
  it("brings back a week rolled forward", () => {
    const rolled = advanceWeek(start);
    expect(rolled.weeks[0]).toEqual([]);
    expect(replaceAll(rolled, start).weeks[0].map((b) => b.id)).toEqual(["mine"]);
  });
});
