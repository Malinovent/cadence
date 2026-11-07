import { describe, expect, it } from "vitest";
import { addCat, addTag, placeBlock, removeCat, saveTemplate, toggleDone, updateCat } from "./actions";
import { BUFFER_ID } from "./constants";
import {
  coachPosition,
  countIn,
  earned,
  feedbackFor,
  guideArea,
  nextGuide,
  nextItem,
  outOfView,
  progress,
  tickTarget,
} from "./guide";
import { defaultData, type CadenceData } from "./model";
import { relabelDefaults } from "./onboarding";
import { applyStarter, STARTERS } from "./starters";
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
  // what someone already using the app has: blocks, a tick, their own areas, a task in a block, a template
  const busy = (): CadenceData => {
    let d = toggleDone(withBlock(), 0, "b1");
    d = updateCat(d, "work", { name: "Job" });
    d = attachTask(addTask(d, "Stretch", { uid: () => "t" }), "t", "b1");
    return saveTemplate(d, 0, "Mine", { uid: () => "tpl" });
  };
  it("counts what's done from now on, not what the weeks already hold (a replay starts at 0)", () => {
    const d = busy();
    expect(progress(d, d)).toEqual({});
    expect(progress(d, { ...d, weeks: [[...d.weeks[0]], [...d.weeks[1]]] })).toEqual({});
  });
  it("a block of an area placed, or a buffer filled; a buffer alone isn't", () => {
    const d = defaultData();
    expect(progress(d, withBlock(d))).toEqual({ place: true });
    const buffer = placeBlock(d, 0, BUFFER_ID, 0, 540, undefined, { uid: () => "f" });
    expect(progress(d, buffer)).toEqual({});
    expect(progress(buffer, addTag(buffer, "f", "work"))).toEqual({ place: true });
  });
  it("an open block ticked; not one that comes back already ticked", () => {
    const d = withBlock();
    expect(progress(d, toggleDone(d, 0, "b1"))).toEqual({ tick: true });
    expect(progress(defaultData(), toggleDone(d, 0, "b1"))).toEqual({ place: true }); // Undo bringing it back
  });
  it("an area made one's own; not a starter's areas or their Undo, nor a language switch", () => {
    const d = withBlock();
    expect(progress(d, updateCat(d, "work", { name: "Job" }))).toEqual({ area: true });
    expect(progress(d, addCat(d, { uid: () => "new" }))).toEqual({ area: true });
    expect(progress(d, removeCat(d, "learn"))).toEqual({ area: true });
    let n = 0;
    const starter = applyStarter(d, 0, STARTERS[1].id, { uid: () => `s${++n}` });
    expect(starter.cats.length).toBeGreaterThan(d.cats.length); // it added areas
    expect(progress(d, starter).area).toBeUndefined();
    expect(progress(starter, d).area).toBeUndefined();
    expect(progress(defaultData(), relabelDefaults(defaultData(), "fr"))).toEqual({});
  });
  it("a task put into a block; not one that comes back with its block", () => {
    const d = addTask(withBlock(), "Stretch", { uid: () => "t" });
    expect(progress(d, attachTask(d, "t", "b1"))).toEqual({ task: true });
    const noBlock = addTask(defaultData(), "Stretch", { uid: () => "t" });
    expect(progress(noBlock, attachTask(d, "t", "b1"))).toEqual({ place: true });
  });
  it("a template saved", () => {
    const d = withBlock();
    expect(progress(d, saveTemplate(d, 0, "Mine", { uid: () => "tpl" }))).toEqual({ template: true });
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

describe("feedback when a step is done", () => {
  it("names only what's new, in checklist order", () => {
    expect(earned({ place: true }, { template: true, place: true, tick: true })).toEqual(["tick", "template"]);
    expect(earned({ place: true }, { place: true })).toEqual([]);
  });
  it("points Next at the first open item", () => {
    expect(nextItem({})).toBe("place");
    expect(nextItem({ place: true, tick: true })).toBe("area");
    expect(nextItem({ place: true, tick: true, area: true, task: true, template: true })).toBeNull();
  });
  it("a toast when the board can't be seen; the board itself when it can; the finale at five", () => {
    const some = { place: true, tick: true } as const;
    expect(feedbackFor(some, false, null)).toBe("toast");
    expect(feedbackFor(some, true, null)).toBe("board");
    expect(feedbackFor({ place: true }, false, { step: "drag", catId: "work", week: 0, before: 0 })).toBe("board");
    expect(feedbackFor(some, false, { step: "area" })).toBe("toast"); // "Show me" on another page
    const all = { place: true, tick: true, area: true, task: true, template: true } as const;
    expect(feedbackFor(all, true, null)).toBe("finale");
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
