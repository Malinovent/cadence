import { describe, expect, it } from "vitest";
import { legacyNormalized, legacyRaw } from "./__fixtures__/legacy";
import { DEFAULT_CATEGORIES } from "./constants";
import { defaultData, migrateBlocks, migrateTemplates, normalizeData } from "./model";

const block = (over: Record<string, unknown> = {}) => ({
  id: "b",
  catIds: ["work"],
  day: 0,
  start: 540,
  mins: 60,
  label: "",
  desc: "",
  done: false,
  ...over,
});

describe("defaultData", () => {
  it("returns fresh defaults", () => {
    const d = defaultData();
    expect(d).toEqual({ schemaVersion: 1, cats: DEFAULT_CATEGORIES, weeks: [[], []], templates: [], history: [], streaks: {} });
    d.cats[0].name = "changed";
    expect(DEFAULT_CATEGORIES[0].name).toBe("Exercise");
  });
});

describe("migrations", () => {
  it("migrateBlocks turns catId into catIds, adds desc and drops untagged blocks", () => {
    const out = migrateBlocks([[{ id: "x", catId: "work" }, { id: "y" }], [{ id: "z", catIds: ["a"], desc: "d" }]]);
    expect(out[0]).toEqual([{ id: "x", catId: "work", catIds: ["work"], desc: "" }]);
    expect(out[1]).toEqual([{ id: "z", catIds: ["a"], desc: "d" }]);
    expect(migrateBlocks(null)).toEqual([[], []]);
  });
  it("migrateTemplates migrates each template's blocks", () => {
    const out = migrateTemplates([{ id: "t", name: "T", blocks: [{ catId: "work" }, {}] }, { id: "u" }]);
    expect(out).toEqual([
      { id: "t", name: "T", blocks: [{ catId: "work", catIds: ["work"], desc: "" }] },
      { id: "u", blocks: [] },
    ]);
  });
});

describe("normalizeData", () => {
  it("keeps legacy data intact with zero drops", () => {
    const { data, dropped } = normalizeData(legacyRaw);
    expect(dropped).toBe(0);
    expect(data).toEqual(legacyNormalized);
  });

  it("is idempotent on normalized data", () => {
    const once = normalizeData(legacyRaw).data;
    const twice = normalizeData(once);
    expect(twice.dropped).toBe(0);
    expect(twice.data).toEqual(once);
  });

  it("fills defaults for missing pieces and non-object input", () => {
    expect(normalizeData({})).toEqual({ data: defaultData(), dropped: 0 });
    expect(normalizeData(null)).toEqual({ data: defaultData(), dropped: 0 });
    expect(normalizeData({ cats: [] }).data.cats).toEqual([]);
  });

  it("pads and trims weeks to exactly two", () => {
    const one = normalizeData({ weeks: [[block()]] });
    expect(one.data.weeks).toEqual([[block()], []]);
    expect(one.dropped).toBe(0);
    const four = normalizeData({ weeks: [[], [], [block(), block({ id: "c" })], [block({ id: "d" })]] });
    expect(four.data.weeks).toEqual([[], []]);
    expect(four.dropped).toBe(3);
  });

  it("drops invalid blocks and counts them", () => {
    const { data, dropped } = normalizeData({
      weeks: [
        [
          block({ id: "ok" }),
          block({ day: 7 }),
          block({ day: 1.5 }),
          block({ day: "1" }),
          block({ start: "540" }),
          block({ start: NaN }),
          block({ mins: 15 }),
          block({ start: 400 }),
          block({ start: 1350, mins: 60 }),
          block({ catIds: ["ghost"] }),
          block({ catIds: [] }),
          "not a block",
        ],
        [block({ id: "strip", catIds: ["work", "ghost", 3, "work"], label: 5, desc: null, done: "yes" })],
      ],
    });
    expect(data.weeks[0].map((b) => b.id)).toEqual(["ok"]);
    expect(data.weeks[1]).toEqual([block({ id: "strip" })]);
    // 11 blocks dropped in week 1, plus 3 catIds stripped from the surviving block
    expect(dropped).toBe(14);
  });

  it("gives a block without an id a fresh one", () => {
    const { data, dropped } = normalizeData({ weeks: [[block({ id: undefined })], [block({ id: 12 })]] });
    expect(data.weeks[0][0].id).toMatch(/^[a-z0-9]+$/);
    expect(data.weeks[1][0].id).toBe("12");
    expect(dropped).toBe(0);
  });

  it("drops malformed categories and coerces numbers", () => {
    const { data, dropped } = normalizeData({
      cats: [
        { id: "work", name: "Work", color: "#3C6FE8", targetMins: 1200, blockMins: 240 },
        { id: "x" },
        "str",
        { id: "", name: "Empty", color: "#000" },
        { id: "y", name: "Y", color: 5 },
        { id: "work", name: "Dup", color: "#000" },
        { id: "z", name: "Z", color: "#000", targetMins: "90", blockMins: 10 },
        { id: "w", name: "W", color: "#000", targetMins: "abc" },
      ],
    });
    expect(data.cats).toEqual([
      { id: "work", name: "Work", color: "#3C6FE8", targetMins: 1200, blockMins: 240 },
      { id: "z", name: "Z", color: "#000", targetMins: 90, blockMins: 30 },
      { id: "w", name: "W", color: "#000", targetMins: 0, blockMins: 30 },
    ]);
    expect(dropped).toBe(5);
  });

  it("strips unknown categories from template blocks too", () => {
    const { data, dropped } = normalizeData({
      templates: [
        { id: "t", name: "T", blocks: [block({ catIds: ["ghost"] }), { catId: "work", day: 0, start: 600, mins: 60 }] },
        "junk",
        { name: 3, blocks: "nope" },
      ],
    });
    expect(data.templates[0]).toEqual({
      id: "t",
      name: "T",
      blocks: [{ catIds: ["work"], day: 0, start: 600, mins: 60, label: "", desc: "" }],
    });
    expect(data.templates[1].name).toBe("Template 2");
    expect(data.templates[1].id).toMatch(/^[a-z0-9]+$/);
    expect(data.templates[1].blocks).toEqual([]);
    // ghost block, "junk" template, the "nope" blocks value
    expect(dropped).toBe(3);
  });

  it("drops malformed history and streak entries", () => {
    const { data, dropped } = normalizeData({
      history: [
        { id: "a", catId: "work", mins: 60, date: 1 },
        { id: 7, catId: "work", mins: 30, date: 2 },
        { catId: 3, mins: 1, date: 1 },
        { catId: "work", mins: "60", date: 1 },
        { catId: "work", mins: 60 },
        null,
      ],
      streaks: { work: { count: 3, lastWeek: 2 }, play: { count: 0 }, bad: 5, bad2: { count: "2" } },
    });
    expect(data.history).toEqual([
      { id: "a", catId: "work", mins: 60, date: 1 },
      { id: "7", catId: "work", mins: 30, date: 2 },
    ]);
    expect(data.streaks).toEqual({ work: { count: 3, lastWeek: 2 }, play: { count: 0 } });
    expect(dropped).toBe(6);
  });

  it("counts a wrong-typed piece as one drop and uses its default", () => {
    const { data, dropped } = normalizeData({ cats: "nope", weeks: 5, templates: {}, history: "x", streaks: [] });
    expect(data).toEqual(defaultData());
    expect(dropped).toBe(5);
  });
});
