import { describe, expect, it } from "vitest";
import {
  addCat,
  addTag,
  addTask,
  advanceWeek,
  applyTemplate,
  deleteTemplate,
  moveBlock,
  placeBlock,
  removeBlock,
  removeCat,
  removeTag,
  removeTask,
  replaceAll,
  resetStats,
  resize,
  saveTemplate,
  toggleDone,
  toggleTask,
  updateBlock,
  updateCat,
} from "./actions";
import { PALETTE } from "./constants";
import { defaultData, type Block, type CadenceData } from "./model";

// frozen inputs make any mutation throw
const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

const blk = (id: string, over: Partial<Block> = {}): Block => ({
  id,
  catIds: ["work"],
  day: 0,
  start: 540,
  mins: 60,
  label: "",
  desc: "",
  done: false,
  ...over,
});

const base = (over: Partial<CadenceData> = {}): CadenceData =>
  deepFreeze({
    ...defaultData(),
    weeks: [
      [blk("a"), blk("b", { day: 1, catIds: ["exercise", "learn"], mins: 120 })],
      [blk("c", { day: 2 })],
    ],
    ...over,
  });

const ids = (() => {
  let n = 0;
  return { uid: () => `id${++n}` };
})();
const seq = () => {
  let n = 0;
  return () => `n${++n}`;
};

describe("placeBlock", () => {
  it("places with the category's block length in the given week", () => {
    const d = base();
    const out = placeBlock(d, 1, "exercise", 3, 600, undefined, { uid: () => "new" });
    expect(out.weeks[1]).toContainEqual(blk("new", { catIds: ["exercise"], day: 3, start: 600, mins: 120 }));
    expect(out.weeks[0]).toBe(d.weeks[0]);
  });
  it("uses an explicit duration and shrinks to fit", () => {
    const out = placeBlock(base(), 0, "work", 0, 480, 120, ids);
    expect(out.weeks[0][2]).toMatchObject({ start: 480, mins: 60 });
  });
  it("is a no-op when the day is full or the category is unknown", () => {
    const full = base({ weeks: [[blk("x", { start: 420, mins: 960 })], []] });
    expect(placeBlock(full, 0, "work", 0, 600, undefined, ids)).toBe(full);
    const d = base();
    expect(placeBlock(d, 0, "ghost", 0, 600, undefined, ids)).toBe(d);
  });
});

describe("moveBlock", () => {
  it("moves within the active week, ignoring itself", () => {
    const out = moveBlock(base(), 0, "a", 0, 570);
    expect(out.weeks[0][0]).toEqual(blk("a", { start: 570 }));
    expect(moveBlock(base(), 0, "a", 4, 900).weeks[0][0]).toMatchObject({ day: 4, start: 900, mins: 60 });
  });
  it("is a no-op for an unknown id, a full day or an unchanged spot", () => {
    const d = base({ weeks: [[blk("a"), blk("x", { day: 3, start: 420, mins: 960 })], []] });
    expect(moveBlock(d, 0, "nope", 0, 600)).toBe(d);
    expect(moveBlock(d, 0, "a", 3, 600)).toBe(d);
    expect(moveBlock(d, 0, "a", 0, 540)).toBe(d);
    expect(moveBlock(d, 1, "a", 0, 600)).toBe(d); // other week
  });
});

describe("resize", () => {
  it("resizes through resizeBlock and skips unchanged results", () => {
    const d = base();
    expect(resize(d, 0, "a", "bottom", 540, 60, 2).weeks[0][0]).toMatchObject({ start: 540, mins: 120 });
    expect(resize(d, 0, "a", "top", 540, 60, -1).weeks[0][0]).toMatchObject({ start: 510, mins: 90 });
    expect(resize(d, 0, "a", "bottom", 540, 60, 0)).toBe(d);
    expect(resize(d, 0, "nope", "bottom", 540, 60, 1)).toBe(d);
  });
});

describe("tags", () => {
  it("adds a tag once, in either week", () => {
    const d = base();
    const out = addTag(d, "c", "play");
    expect(out.weeks[1][0].catIds).toEqual(["work", "play"]);
    expect(out.weeks[0]).toEqual(d.weeks[0]);
    expect(addTag(d, "a", "work")).toBe(d);
  });
  it("removes a tag but never the last one", () => {
    const d = base();
    expect(removeTag(d, "b", "exercise").weeks[0][1].catIds).toEqual(["learn"]);
    expect(removeTag(d, "a", "work")).toBe(d);
    expect(removeTag(d, "b", "play")).toBe(d);
  });
});

describe("updateBlock / removeBlock", () => {
  it("patches a block", () => {
    const out = updateBlock(base(), "c", { label: "Read", desc: "ch. 3" });
    expect(out.weeks[1][0]).toEqual(blk("c", { day: 2, label: "Read", desc: "ch. 3" }));
    const d = base();
    expect(updateBlock(d, "nope", { label: "x" })).toBe(d);
  });
  it("removes a block and its history", () => {
    const d = base({
      history: [
        { id: "a", catId: "work", mins: 60, date: 1 },
        { id: "z", catId: "work", mins: 30, date: 2 },
      ],
    });
    const out = removeBlock(d, "a");
    expect(out.weeks[0].map((b) => b.id)).toEqual(["b"]);
    expect(out.history).toEqual([{ id: "z", catId: "work", mins: 30, date: 2 }]);
    expect(removeBlock(d, "nope")).toBe(d);
  });
});

describe("toggleDone", () => {
  it("logs one entry per tag with the full duration and one timestamp", () => {
    const d = base({ history: [{ id: "old", catId: "work", mins: 30, date: 5 }] });
    const out = toggleDone(d, 0, "b", { now: () => 1000 });
    expect(out.weeks[0][1].done).toBe(true);
    expect(out.history).toEqual([
      { id: "old", catId: "work", mins: 30, date: 5 },
      { id: "b", catId: "exercise", mins: 120, date: 1000 },
      { id: "b", catId: "learn", mins: 120, date: 1000 },
    ]);
    const back = toggleDone(out, 0, "b");
    expect(back.weeks[0][1].done).toBe(false);
    expect(back.history).toEqual([{ id: "old", catId: "work", mins: 30, date: 5 }]);
  });
  it("only looks in the given week", () => {
    const d = base();
    expect(toggleDone(d, 1, "a")).toBe(d);
  });
});

describe("templates", () => {
  it("saves the week with a default name when blank", () => {
    const d = base();
    const out = saveTemplate(d, 0, "  ", { uid: () => "t1" });
    expect(out.templates).toEqual([
      {
        id: "t1",
        name: "Template 1",
        blocks: [
          { catIds: ["work"], day: 0, start: 540, mins: 60, label: "", desc: "" },
          { catIds: ["exercise", "learn"], day: 1, start: 540, mins: 120, label: "", desc: "" },
        ],
      },
    ]);
    expect(saveTemplate(out, 1, " Busy ", { uid: () => "t2" }).templates[1].name).toBe("Busy");
    expect(saveTemplate(out, 1, undefined, { uid: () => "t2" }).templates[1].name).toBe("Template 2");
  });
  it("applies a template with fresh ids, not done, replacing the week", () => {
    const withTpl = saveTemplate(base(), 0, "T", { uid: () => "t1" });
    const out = applyTemplate(toggleDone(withTpl, 0, "a"), 1, "t1", { uid: seq() });
    expect(out.weeks[1]).toEqual([
      blk("n1"),
      blk("n2", { day: 1, catIds: ["exercise", "learn"], mins: 120 }),
    ]);
    expect(out.weeks[1][0].catIds).not.toBe(withTpl.templates[0].blocks[0].catIds);
    expect(applyTemplate(withTpl, 1, "nope")).toBe(withTpl);
  });
  it("strips tags of categories deleted after the save and drops untagged blocks", () => {
    const d = deepFreeze(
      base({
        templates: [
          {
            id: "t1",
            name: "T",
            blocks: [
              { catIds: ["work", "learn"], day: 0, start: 540, mins: 60, label: "", desc: "" },
              { catIds: ["learn"], day: 1, start: 540, mins: 60, label: "x", desc: "" },
              { catIds: ["play"], day: 2, start: 600, mins: 30, label: "", desc: "" },
            ],
          },
        ],
      }),
    );
    const noLearn = deepFreeze({ ...d, cats: d.cats.filter((c) => c.id !== "learn") });
    const out = applyTemplate(noLearn, 0, "t1", { uid: seq() });
    expect(out.weeks[0]).toEqual([blk("n1"), blk("n2", { day: 2, start: 600, mins: 30, catIds: ["play"] })]);
  });
  it("deletes a template", () => {
    const withTpl = deepFreeze(saveTemplate(base(), 0, "T", { uid: () => "t1" }));
    expect(deleteTemplate(withTpl, "t1").templates).toEqual([]);
    expect(deleteTemplate(withTpl, "nope")).toBe(withTpl);
  });
});

describe("advanceWeek", () => {
  it("updates streaks from week 1 done minutes and shifts the weeks", () => {
    const d = base({
      cats: [
        { id: "work", name: "Work", color: "#000", targetMins: 120, blockMins: 60 },
        { id: "learn", name: "Learn", color: "#111", targetMins: 60, blockMins: 60 },
        { id: "play", name: "Play", color: "#222", targetMins: 60, blockMins: 60 },
      ],
      weeks: [
        [
          blk("a", { done: true }),
          blk("b", { day: 1, done: true, catIds: ["work", "learn"] }),
          blk("p", { day: 2, catIds: ["play"] }),
        ],
        [blk("c", { day: 2 })],
      ],
      streaks: { work: { count: 2, lastWeek: 7 }, play: { count: 4 }, gone: { count: 9 } },
    });
    const out = advanceWeek(d);
    expect(out.streaks).toEqual({ work: { count: 3 }, learn: { count: 1 }, play: { count: 0 }, gone: { count: 9 } });
    expect(out.weeks).toEqual([[blk("c", { day: 2 })], []]);
    expect(out.weeks[0]).toBe(d.weeks[1]);
    expect(out.history).toBe(d.history);
  });
});

describe("resetStats", () => {
  it("clears history, streaks and done flags", () => {
    const d = base({
      weeks: [[blk("a", { done: true })], [blk("c", { done: true })]],
      history: [{ id: "a", catId: "work", mins: 60, date: 1 }],
      streaks: { work: { count: 2 } },
    });
    const out = resetStats(d);
    expect(out.history).toEqual([]);
    expect(out.streaks).toEqual({});
    expect(out.weeks).toEqual([[blk("a")], [blk("c")]]);
  });
});

describe("categories", () => {
  it("updates a category", () => {
    const d = base();
    expect(updateCat(d, "work", { name: "Job", targetMins: 600 }).cats[1]).toEqual({
      id: "work",
      name: "Job",
      color: "#3C6FE8",
      targetMins: 600,
      blockMins: 240,
    });
    expect(updateCat(d, "nope", { name: "x" })).toBe(d);
  });
  it("adds a category with the next palette colour", () => {
    const out = addCat(base(), { uid: () => "k" });
    expect(out.cats[4]).toEqual({ id: "k", name: "New", color: PALETTE[4], targetMins: 60, blockMins: 60 });
    const cats = Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, name: "", color: "", targetMins: 0, blockMins: 30 }));
    expect(addCat(base({ cats }), { uid: () => "k" }).cats[7].color).toBe(PALETTE[0]);
  });
  it("removes a category, stripping tags, dropping untagged blocks and its history", () => {
    const d = base({
      history: [
        { id: "a", catId: "work", mins: 60, date: 1 },
        { id: "b", catId: "learn", mins: 120, date: 1 },
      ],
      templates: [{ id: "t", name: "T", blocks: [{ catIds: ["work"], day: 0, start: 540, mins: 60, label: "", desc: "" }] }],
      streaks: { work: { count: 1 } },
    });
    const noWork = removeCat(d, "work");
    expect(noWork.cats.map((c) => c.id)).toEqual(["exercise", "learn", "play"]);
    expect(noWork.weeks).toEqual([[blk("b", { day: 1, catIds: ["exercise", "learn"], mins: 120 })], []]);
    expect(noWork.history).toEqual([{ id: "b", catId: "learn", mins: 120, date: 1 }]);
    // legacy leaves templates and streaks alone
    expect(noWork.templates).toBe(d.templates);
    expect(noWork.streaks).toBe(d.streaks);

    const noLearn = removeCat(d, "learn");
    expect(noLearn.weeks[0][1].catIds).toEqual(["exercise"]);
    expect(noLearn.weeks[1]).toBe(d.weeks[1]);
    expect(removeCat(d, "nope")).toBe(d);
  });
});

describe("tasks", () => {
  const task = (id: string, over: Partial<CadenceData["tasks"][number]> = {}) => ({ id, name: id, done: false, createdAt: 1, ...over });
  const deps = { uid: () => "new", now: () => 1234 };

  it("adds a trimmed task at the end", () => {
    const d = base({ tasks: [task("t1", { done: true })] });
    const out = addTask(d, "  Buy milk  ", deps);
    expect(out.tasks).toEqual([task("t1", { done: true }), { id: "new", name: "Buy milk", done: false, createdAt: 1234 }]);
    expect(out.weeks).toBe(d.weeks);
  });
  it("ignores a blank name", () => {
    const d = base();
    expect(addTask(d, "", deps)).toBe(d);
    expect(addTask(d, "   \t ", deps)).toBe(d);
  });
  it("toggles a task in place, leaving the order alone", () => {
    const d = base({ tasks: [task("t1"), task("t2"), task("t3")] });
    const out = toggleTask(d, "t2");
    expect(out.tasks).toEqual([task("t1"), task("t2", { done: true }), task("t3")]);
    expect(out.tasks[0]).toBe(d.tasks[0]);
    expect(toggleTask(out, "t2").tasks).toEqual(d.tasks);
    expect(toggleTask(d, "nope")).toBe(d);
  });
  it("removes a task", () => {
    const d = base({ tasks: [task("t1"), task("t2")] });
    expect(removeTask(d, "t1").tasks).toEqual([task("t2")]);
    expect(removeTask(d, "nope")).toBe(d);
  });
});

describe("replaceAll", () => {
  it("returns the replacement", () => {
    const next = defaultData();
    expect(replaceAll(base(), next)).toBe(next);
  });
});
