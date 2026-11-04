import { describe, expect, it } from "vitest";
import { BUFFER_ID, BUFFER_MINS } from "./constants";
import { defaultData, type CadenceData } from "./model";
import { openCount, panelAreas, panelNotes } from "./panel";

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
        { id: "a", name: "a", done: false, createdAt: 1 },
        { id: "b", name: "b", done: true, createdAt: 2 },
      ]),
    ).toBe(1);
    expect(openCount([])).toBe(0);
  });
});
