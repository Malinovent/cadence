import { describe, expect, it } from "vitest";
import { applyDayTemplate, applyTemplate, saveDayTemplate } from "./actions";
import { defaultData, normalizeData, type Block, type CadenceData } from "./model";
import { miniBounds, previewChange } from "./templatePreview";
import { applyStarter, STARTERS } from "./starters";

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

const seq = () => {
  let n = 0;
  return () => `n${++n}`;
};

const base = (): CadenceData =>
  deepFreeze({
    ...defaultData(),
    weeks: [
      [
        blk("a", { day: 2, done: true }),
        blk("b", { day: 2, start: 720, catIds: ["exercise", "learn"], mins: 90 }),
        blk("c", { day: 4 }),
        { ...blk("buf", { day: 2, start: 900, mins: 30, catIds: [] }), buffer: true as const },
      ],
      [],
    ],
  });

describe("saveDayTemplate", () => {
  it("keeps one day's blocks on day 0, flagged as a day, without ticks or ids", () => {
    const out = saveDayTemplate(base(), 0, 2, "Office day", { uid: () => "t1" });
    const t = out.templates[0];
    expect(t).toMatchObject({ id: "t1", name: "Office day", day: true });
    expect(t.blocks).toHaveLength(3);
    expect(t.blocks.every((b) => b.day === 0)).toBe(true);
    expect(t.blocks.some((b) => "done" in b || "id" in b)).toBe(false);
    expect(t.blocks.find((b) => b.buffer)).toBeTruthy();
  });
  it("names it Day N when no name is given", () => {
    const out = saveDayTemplate(base(), 0, 2, "  ");
    expect(out.templates[0].name).toBe("Day 1");
  });
});

describe("applyDayTemplate", () => {
  const withTpl = () => deepFreeze(saveDayTemplate(base(), 0, 2, "Office", { uid: () => "t1" }));
  it("replaces only that day's blocks, fresh and not ticked", () => {
    const out = applyDayTemplate(withTpl(), 0, "t1", 4, { uid: seq() });
    const thu = out.weeks[0].filter((b) => b.day === 4);
    expect(thu).toHaveLength(3);
    expect(thu.every((b) => !b.done && b.id.startsWith("n"))).toBe(true);
    // Wednesday is untouched
    expect(out.weeks[0].filter((b) => b.day === 2).map((b) => b.id)).toEqual(["a", "b", "buf"]);
    expect(out.weeks[0].some((b) => b.id === "c")).toBe(false);
  });
  it("drops tags of areas deleted since, and blocks left with none", () => {
    const d = withTpl();
    const gone = deepFreeze({ ...d, cats: d.cats.filter((c) => c.id !== "work" && c.id !== "exercise") });
    const out = applyDayTemplate(gone, 1, "t1", 0, { uid: seq() });
    const mon = out.weeks[1].filter((b) => b.day === 0);
    expect(mon.map((b) => b.catIds)).toEqual([["learn"], []]);
  });
  it("does nothing for an unknown template or day", () => {
    const d = withTpl();
    expect(applyDayTemplate(d, 0, "nope", 1)).toBe(d);
    expect(applyDayTemplate(d, 0, "t1", 7)).toBe(d);
  });
});

describe("normalizeData and day templates", () => {
  it("keeps the day flag and puts the blocks on day 0", () => {
    const raw = {
      templates: [
        { id: "t", name: "D", day: true, blocks: [{ catIds: ["work"], day: 3, start: 540, mins: 60, label: "" }] },
        { id: "w", name: "W", blocks: [{ catIds: ["work"], day: 3, start: 540, mins: 60, label: "" }] },
      ],
    };
    const { data } = normalizeData(raw);
    expect(data.templates[0]).toMatchObject({ day: true });
    expect(data.templates[0].blocks[0].day).toBe(0);
    expect("day" in data.templates[1]).toBe(false);
    expect(data.templates[1].blocks[0].day).toBe(3);
  });
});

describe("previewChange", () => {
  it("a week template: its blocks, hours per area, what it replaces", () => {
    const d = base();
    const tpl = deepFreeze({
      ...d,
      templates: [{ id: "w", name: "W", blocks: [{ ...blk("x", { day: 1, mins: 120 }) }] }],
    });
    const after = applyTemplate(tpl, 0, "w", { uid: seq() });
    const p = previewChange(tpl, after, 0);
    expect(p.blocks).toHaveLength(1);
    expect(p.rows).toEqual([expect.objectContaining({ catId: "work", mins: 120 })]);
    expect(p.replaces).toBe(4);
    expect(p.added).toEqual([]);
  });
  it("a day: only that day, a block for two areas counting to each", () => {
    const d = base();
    const p = previewChange(d, d, 0, 2);
    expect(p.replaces).toBe(3);
    expect(p.rows.map((r) => [r.catId, r.mins])).toEqual([
      ["exercise", 90],
      ["work", 60],
      ["learn", 90],
    ]);
  });
  it("a starter: the areas it adds", () => {
    const d = base();
    const after = applyStarter(d, 0, STARTERS[0].id, { uid: seq() });
    expect(previewChange(d, after, 0).added.length).toBeGreaterThan(0);
  });
});

describe("miniBounds", () => {
  it("widens the hours to whole hours holding every block", () => {
    expect(miniBounds([{ start: 390, mins: 30 }], [420, 1380])).toEqual([360, 1380]);
    expect(miniBounds([], [420, 1380])).toEqual([420, 1380]);
  });
});
