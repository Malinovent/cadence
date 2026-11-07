import { describe, expect, it } from "vitest";
import { placeBlock, saveTemplate, toggleDone, updateCat } from "./actions";
import { checkDone, coachPosition, countIn, doneCount, guideArea, nextGuide, outOfView, tickTarget } from "./guide";
import { defaultData, type CadenceData } from "./model";
import { addTask, attachTask } from "./tasks";

const ids = () => {
  let n = 0;
  return { uid: () => `b${++n}` };
};
const withBlock = (d: CadenceData = defaultData()) =>
  placeBlock(d, 0, "exercise", 0, 540, undefined, { uid: () => "b1" });

describe("the guided first block", () => {
  it("uses the first area", () => {
    expect(guideArea(defaultData())).toBe("exercise");
    expect(guideArea({ ...defaultData(), cats: [] })).toBeNull();
  });
  it("moves on once a block of that area lands in the week", () => {
    const d = defaultData();
    const g = { step: "drag" as const, catId: "exercise", week: 0 as const, before: countIn(d, 0, "exercise") };
    expect(nextGuide(g, d, {})).toBe(g);
    expect(nextGuide(g, placeBlock(d, 0, "work", 0, 540), {})).toBe(g); // another area doesn't count
    expect(nextGuide(g, withBlock(d), {})).toEqual({ step: "placed", catId: "exercise", week: 0 });
  });
  it("points the tick at the newest open block of that area", () => {
    let d = defaultData();
    const u = ids();
    d = placeBlock(d, 0, "work", 0, 540, undefined, u);
    d = placeBlock(d, 0, "exercise", 1, 540, undefined, u);
    d = placeBlock(d, 0, "exercise", 2, 540, undefined, u);
    expect(tickTarget(d, 0, "exercise")?.id).toBe("b3");
    expect(tickTarget(d, 0)?.id).toBe("b1");
    expect(tickTarget(defaultData(), 0)).toBeNull();
  });
  it("ends the tick step when that block is ticked, or gone", () => {
    const d = withBlock();
    const g = { step: "tick" as const, blockId: "b1" };
    expect(nextGuide(g, d, {})).toBe(g);
    expect(nextGuide(g, toggleDone(d, 0, "b1"), {})).toBeNull();
    expect(nextGuide(g, defaultData(), {})).toBeNull();
  });
});

describe("the getting-started checklist", () => {
  it("ticks items from what the person did", () => {
    expect(doneCount(checkDone(defaultData(), {}))).toBe(0);
    const placed = withBlock();
    expect(checkDone(placed, {})).toEqual({ place: true });
    expect(checkDone(toggleDone(placed, 0, "b1"), {})).toMatchObject({ place: true, tick: true });
    expect(checkDone(updateCat(placed, "work", { name: "Job" }), {})).toMatchObject({ area: true });
    const task = attachTask(addTask(placed, "Stretch", { uid: () => "t" }), "t", "b1");
    expect(checkDone(task, {})).toMatchObject({ task: true });
    expect(checkDone(saveTemplate(placed, 0, "Mine"), {})).toMatchObject({ template: true });
  });
  it("keeps what was done, even after it's undone", () => {
    expect(checkDone(defaultData(), { tick: true, template: true })).toEqual({ tick: true, template: true });
  });
  it("untouched default areas in French aren't 'made your own'", () => {
    expect(checkDone(defaultData("fr"), {}).area).toBeUndefined();
  });
  it("ends the area, task and template steps once each is done", () => {
    const d = defaultData();
    expect(nextGuide({ step: "area" }, d, {})).toEqual({ step: "area" });
    expect(nextGuide({ step: "area" }, d, { area: true })).toBeNull();
    expect(nextGuide({ step: "task" }, d, { task: true })).toBeNull();
    expect(nextGuide({ step: "template" }, d, { template: true })).toBeNull();
    const placed = { step: "placed" as const, catId: "exercise", week: 0 as const };
    expect(nextGuide(placed, d, { place: true })).toBe(placed); // waits for "Next"
  });
});

describe("where the hint sits", () => {
  const vp = { w: 1000, h: 800 };
  const bubble = { w: 300, h: 120 };
  it("under its target, kept on screen", () => {
    expect(coachPosition({ left: 20, top: 100, width: 260, height: 40 }, bubble, vp)).toEqual({ left: 20, top: 152 });
    expect(coachPosition({ left: 900, top: 100, width: 80, height: 40 }, bubble, vp).left).toBe(688);
  });
  it("above it when there's no room below (the phone tray)", () => {
    expect(coachPosition({ left: 20, top: 700, width: 160, height: 40 }, bubble, vp)).toEqual({ left: 20, top: 568 });
  });
  it("low and centred without a target", () => {
    expect(coachPosition(null, bubble, vp)).toEqual({ left: 350, top: 584 });
  });
  it("scrolls only for a target off screen or under the phone tray", () => {
    const at = (top: number) => ({ left: 0, top, width: 40, height: 40 });
    expect(outOfView(at(100), 800)).toBe(false);
    expect(outOfView(at(-10), 800)).toBe(true);
    expect(outOfView(at(520), 540)).toBe(true); // tucked under a tray that starts at 540
  });
});
