import { describe, expect, it } from "vitest";
import { BUFFER_COLOR, BUFFER_ID, BUFFER_MINS } from "./constants";
import { defaultData, type CadenceData, type Task } from "./model";
import { openCount, panelAreas, panelNotes, taskDots, taskNote } from "./panel";

const data = (): CadenceData => ({
  ...defaultData(),
  cats: [
    {
      id: "rest",
      name: "Rest",
      color: "#123456",
      targetMins: 600,
      blockMins: 60,
      limit: { kind: "floor", min: 600 },
    },
    {
      id: "work",
      name: "",
      color: "#654321",
      targetMins: 0,
      blockMins: 120,
      limit: { kind: "ceiling", max: 2400 },
    },
  ],
  weeks: [
    [
      {
        id: "b1",
        day: 0,
        start: 540,
        mins: 420,
        catIds: ["rest"],
        done: false,
        label: "",
        desc: "",
      },
    ],
    [],
  ],
});

describe("panel", () => {
  it("lists the areas in order with this week's balance, then the buffer", () => {
    const rows = panelAreas(data(), 0);
    expect(rows.map((r) => r.id)).toEqual(["rest", "work", BUFFER_ID]);
    expect(rows[0]).toMatchObject({
      name: "Rest",
      mins: 60,
      limitText: expect.any(String),
    });
    expect(rows[0].balance?.state).toBe("short");
    expect(rows[1].name).toBe("Untitled");
    expect(rows[2]).toMatchObject({
      name: "Buffer",
      mins: BUFFER_MINS,
      balance: null,
      limitText: null,
    });
  });
  it("judges the week asked for", () => {
    expect(panelAreas(data(), 1)[0].balance?.state).toBe("short");
    expect(panelNotes(data(), 0).length).toBe(1);
  });
  it("counts open tasks", () => {
    expect(
      openCount([
        { id: "a", name: "a", done: false, createdAt: 1, catId: null, order: 0 },
        { id: "b", name: "b", done: true, createdAt: 2, catId: null, order: 1 },
      ]),
    ).toBe(1);
    expect(openCount([])).toBe(0);
  });
});

describe("tasks in the panel (S1.5)", () => {
  const tk = (over: Partial<Task> = {}): Task => ({
    id: "t",
    name: "T",
    catId: "rest",
    done: false,
    order: 0,
    createdAt: 0,
    ...over,
  });
  it("notes where the task is, or where it came back from", () => {
    const d = data();
    expect(taskNote(tk(), d.weeks)).toBe("");
    expect(taskNote(tk({ blockId: "b1" }), d.weeks)).toMatch(/^Mon 9/);
    expect(taskNote(tk({ returnedFrom: 1 }), d.weeks)).toBe("back from Tue");
    expect(taskNote(tk({ blockId: "gone", returnedFrom: 2 }), d.weeks)).toBe("back from Wed");
  });
  it("dots a task in a block with that block's colours", () => {
    const d = data();
    d.weeks[1] = [
      { id: "two", day: 2, start: 540, mins: 60, catIds: ["work", "rest"], done: false, label: "", desc: "" },
      { id: "buf", day: 3, start: 540, mins: 30, catIds: [], done: false, label: "", desc: "", buffer: true },
    ];
    expect(taskDots(tk({ blockId: "b1" }), d)).toEqual(["#123456"]);
    expect(taskDots(tk({ blockId: "two" }), d)).toEqual(["#654321", "#123456"]);
    expect(taskDots(tk({ blockId: "buf" }), d)).toEqual([BUFFER_COLOR]);
    expect(taskDots(tk(), d)).toEqual([]);
    expect(taskDots(tk({ blockId: "gone" }), d)).toEqual([]);
  });
});
