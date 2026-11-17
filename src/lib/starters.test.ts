import { describe, expect, it } from "vitest";
import { DAY_END, DAY_START, DEFAULT_CATEGORIES, legacyDefaultCategories, STEP } from "./constants";
import { balance } from "./guardrail";
import { defaultData, normalizeData, type CadenceData, type Task } from "./model";
import { addedNote, applyStarter, matchArea, missingAreas, STARTERS } from "./starters";

const ids = () => {
  let n = 0;
  return { uid: () => `id${++n}` };
};

describe("starter weeks", () => {
  it("are three, each with floors for rest and people and a work ceiling", () => {
    expect(STARTERS).toHaveLength(3);
    for (const s of STARTERS) {
      const kind = (k: string) => s.areas.find((a) => a.key === k)?.limit.kind;
      expect([kind("work"), kind("rest"), kind("people")]).toEqual(["ceiling", "floor", "floor"]);
    }
  });

  it("are valid: on the grid, on half-hours, no overlaps, a buffer every day", () => {
    for (const s of STARTERS) {
      for (const b of s.blocks) {
        expect(b.start).toBeGreaterThanOrEqual(DAY_START);
        expect(b.start + b.mins).toBeLessThanOrEqual(DAY_END);
        expect(b.start % STEP).toBe(0);
        expect(b.mins % STEP).toBe(0);
      }
      for (let day = 0; day < 7; day++) {
        const today = s.blocks.filter((b) => b.day === day).sort((a, b) => a.start - b.start);
        for (let i = 1; i < today.length; i++)
          expect(today[i].start).toBeGreaterThanOrEqual(today[i - 1].start + today[i - 1].mins);
        expect(today.filter((b) => b.area === null)).toHaveLength(1);
      }
    }
  });

  it("are under-filled: work under its ceiling, every floor close but with room left", () => {
    for (const s of STARTERS) {
      for (const a of s.areas) {
        const planned = s.blocks.filter((b) => b.area === a.key).reduce((t, b) => t + b.mins, 0);
        const st = balance(a.limit, planned).state;
        if (a.limit.kind === "ceiling") expect(st).toBe("within");
        else {
          expect(st).toBe("short"); // room to add your own
          expect(planned).toBeGreaterThanOrEqual(a.limit.min * 0.6);
        }
      }
    }
  });

  it("survive a save and load unchanged once applied", () => {
    const d = applyStarter(defaultData(), 0, STARTERS[1].id, ids());
    expect(normalizeData(JSON.parse(JSON.stringify(d))).data).toEqual(d);
  });
});

describe("applying a starter", () => {
  const starter = STARTERS[0];

  it("adds the missing areas and gives the ones the person has the starter's guardrail", () => {
    // the old defaults (Work at least 20 h): the work-heavy week must not show Work "10h above"
    const d = { ...defaultData(), cats: legacyDefaultCategories("en") };
    expect(missingAreas(d.cats, starter).map((a) => a.name)).toEqual(["Rest", "People"]);
    const out = applyStarter(d, 0, starter.id, ids());
    const byName = (n: string) => out.cats.find((c) => c.name === n)!;
    expect(byName("Work")).toEqual({ ...d.cats[1], limit: { kind: "ceiling", max: 2400 }, targetMins: 0 });
    expect(byName("Exercise").limit).toEqual({ kind: "floor", min: 150 });
    expect(out.cats.slice(2, 4)).toEqual(d.cats.slice(2, 4)); // Learn and Play: not in the starter, untouched
    const added = out.cats.slice(4);
    expect(added.map((c) => [c.name, c.limit])).toEqual([
      ["Rest", { kind: "floor", min: 480 }],
      ["People", { kind: "floor", min: 240 }],
    ]);
    expect(new Set(out.cats.map((c) => c.color)).size).toBe(out.cats.length); // new colours
    expect(added.map((c) => c.color)).toEqual(["#9B4DCA", "#0CA678"]); // calm, never the raspberry
  });

  it("the default areas already hold every starter area", () => {
    for (const st of STARTERS) expect(missingAreas(defaultData().cats, st)).toEqual([]);
    const out = applyStarter(defaultData(), 0, STARTERS[1].id, ids());
    expect(out.cats.map((c) => c.id)).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(out.cats.find((c) => c.id === "people")!.limit).toEqual({ kind: "floor", min: 840 });
  });

  it("matches areas by name, ignoring case and spaces", () => {
    const old = legacyDefaultCategories();
    const cats = [...old, { ...old[3], id: "r", name: "  rest " }];
    expect(matchArea(cats, starter.areas[1])?.id).toBe("r");
    const out = applyStarter({ ...defaultData(), cats }, 0, starter.id, ids());
    expect(out.cats.filter((c) => c.name.trim().toLowerCase() === "rest")).toHaveLength(1);
    expect(out.weeks[0].some((b) => b.catIds[0] === "r")).toBe(true);
  });

  it("replaces the week, buffers included; the other week and tasks' blocks follow the usual rules", () => {
    const task: Task = { id: "t", name: "t", catId: null, done: false, order: 0, createdAt: 0, blockId: "old" };
    const d: CadenceData = {
      ...defaultData(),
      weeks: [[{ id: "old", catIds: ["work"], day: 0, start: 540, mins: 60, label: "", desc: "", done: false }], []],
      tasks: [task],
    };
    const out = applyStarter(d, 0, starter.id, ids());
    expect(out.weeks[0]).toHaveLength(starter.blocks.length);
    expect(out.weeks[0].filter((b) => b.buffer)).toHaveLength(7);
    expect(out.weeks[1]).toBe(d.weeks[1]);
    expect(out.tasks[0]).toEqual({
      id: "t",
      name: "t",
      catId: null,
      done: false,
      order: 0,
      createdAt: 0,
      returnedFrom: 0,
    });
    const work = out.cats.find((c) => c.name === "Work")!;
    expect(out.weeks[0].filter((b) => b.catIds.includes(work.id))).toHaveLength(10);
  });

  it("a second starter reuses the areas the first added", () => {
    const once = applyStarter({ ...defaultData(), cats: legacyDefaultCategories() }, 0, STARTERS[0].id, ids());
    const twice = applyStarter(once, 1, STARTERS[2].id, { uid: () => `x${Math.random()}` });
    expect(twice.cats.map((c) => [c.id, c.name, c.color])).toEqual(once.cats.map((c) => [c.id, c.name, c.color]));
    expect(twice.cats.find((c) => c.name === "Rest")!.limit).toEqual({ kind: "floor", min: 840 }); // the second one's
    expect(missingAreas(once.cats, STARTERS[2])).toEqual([]);
  });

  it("does nothing for an unknown starter", () => {
    const d = defaultData();
    expect(applyStarter(d, 0, "nope")).toBe(d);
  });

  it("says what it adds", () => {
    expect(addedNote([])).toBeNull();
    expect(addedNote(["Rest"])).toBe("Adds Rest to your areas.");
    expect(addedNote(["Rest", "People"])).toBe("Adds Rest and People to your areas.");
    expect(addedNote(["Work", "Rest", "People"])).toBe("Adds Work, Rest and People to your areas.");
  });

  it("in French: names the areas it adds and its labels in French, and matches French names", () => {
    const fr = applyStarter({ ...defaultData("fr"), cats: legacyDefaultCategories("fr") }, 0, STARTERS[0].id, { ...ids(), lang: "fr" });
    expect(fr.cats.slice(4).map((c) => c.name)).toEqual(["Repos", "Proches"]);
    expect(fr.cats.filter((c) => c.name === "Travail")).toHaveLength(1); // matched, not added
    expect(fr.weeks[0].some((b) => b.label === "Décompresser")).toBe(true);
    // a French name matches the English starter area too, and the other way round
    expect(missingAreas(fr.cats, STARTERS[2])).toEqual([]);
    expect(missingAreas(applyStarter(defaultData(), 0, STARTERS[0].id, ids()).cats, STARTERS[0])).toEqual([]);
  });

});
