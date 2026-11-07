import { describe, expect, it } from "vitest";
import { DAY_END, DAY_START, DEFAULT_CATEGORIES, STEP } from "./constants";
import { balance } from "./guardrail";
import { defaultData, normalizeData, type CadenceData, type Task } from "./model";
import { addedNote, applyStarter, matchArea, missingAreas, STARTERS, starterPreview } from "./starters";

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

  it("adds only the missing areas, with the starter's guardrail, and keeps the person's own", () => {
    const d = defaultData();
    expect(missingAreas(d.cats, starter).map((a) => a.name)).toEqual(["Rest", "People"]);
    const out = applyStarter(d, 0, starter.id, ids());
    expect(out.cats.slice(0, 4)).toEqual(d.cats); // Work keeps its 20 h floor
    const added = out.cats.slice(4);
    expect(added.map((c) => [c.name, c.limit])).toEqual([
      ["Rest", { kind: "floor", min: 480 }],
      ["People", { kind: "floor", min: 240 }],
    ]);
    expect(new Set(out.cats.map((c) => c.color)).size).toBe(out.cats.length); // new colours
    expect(added.map((c) => c.color)).toEqual(["#9B4DCA", "#0CA678"]); // calm, never the raspberry
  });

  it("matches areas by name, ignoring case and spaces", () => {
    const cats = [...DEFAULT_CATEGORIES, { ...DEFAULT_CATEGORIES[3], id: "r", name: "  rest " }];
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
    const once = applyStarter(defaultData(), 0, STARTERS[0].id, ids());
    const twice = applyStarter(once, 1, STARTERS[2].id, { uid: () => `x${Math.random()}` });
    expect(twice.cats).toEqual(once.cats);
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
    const fr = applyStarter(defaultData("fr"), 0, STARTERS[0].id, { ...ids(), lang: "fr" });
    expect(fr.cats.slice(4).map((c) => c.name)).toEqual(["Repos", "Proches"]);
    expect(fr.cats.filter((c) => c.name === "Travail")).toHaveLength(1); // matched, not added
    expect(fr.weeks[0].some((b) => b.label === "Décompresser")).toBe(true);
    // a French name matches the English starter area too, and the other way round
    expect(missingAreas(fr.cats, STARTERS[2])).toEqual([]);
    expect(missingAreas(applyStarter(defaultData(), 0, STARTERS[0].id, ids()).cats, STARTERS[0])).toEqual([]);
  });

  it("previews what a starter leaves: the person's own Work keeps its limit, added areas get theirs", () => {
    const rows = starterPreview(STARTERS[0], defaultData().cats);
    const work = rows.find((r) => r.key === "work")!;
    expect(work).toMatchObject({ name: "Work", limit: { kind: "floor", min: 1200 }, mins: 1800, added: false });
    expect(rows.find((r) => r.key === "rest")).toMatchObject({ name: "Rest", color: "#9B4DCA", added: true });
    const fr = starterPreview(STARTERS[0], defaultData("fr").cats, "fr");
    expect(fr.map((r) => r.name)).toEqual(["Travail", "Repos", "Proches", "Exercice"]);
  });
});
