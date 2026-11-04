// S1.2 buffer blocks: unassigned time that never counts toward an area.
import { describe, expect, it } from "vitest";
import * as A from "./actions";
import { BUFFER_ID, BUFFER_MINS } from "./constants";
import { dropPreview, resolveDrop } from "./gesture";
import { defaultData, normalizeData, type Block, type CadenceData } from "./model";
import { completion, weekBalance } from "./stats";

const ids = () => {
  let n = 0;
  return () => `id${++n}`;
};
const withBlocks = (blocks: Block[]): CadenceData => ({ ...defaultData(), weeks: [blocks, []] });
const work = (id: string, over: Partial<Block> = {}): Block =>
  ({ id, catIds: ["work"], day: 0, start: 540, mins: 60, label: "", desc: "", done: false, ...over });

describe("placing a buffer", () => {
  it("places a 30-min block with no area", () => {
    const out = A.placeBlock(defaultData(), 0, BUFFER_ID, 2, 690, undefined, { uid: () => "b" });
    expect(out.weeks[0]).toEqual([{ id: "b", catIds: [], day: 2, start: 690, mins: BUFFER_MINS, label: "", desc: "", done: false, buffer: true }]);
  });
  it("is never a tag: dropped over a block it goes to a free slot", () => {
    expect(resolveDrop({ kind: "tray", catId: BUFFER_ID }, { day: 0, start: 540, blockId: "w" })).toEqual({ kind: "place", catId: BUFFER_ID, day: 0, start: 540 });
    // the usual nearest-free-gap rule, 30 min long, never on top of the block
    const pv = dropPreview([work("w")], defaultData().cats, { kind: "place", catId: BUFFER_ID, day: 0, start: 540 })!;
    expect(pv.mins).toBe(30);
    expect(pv.start + pv.mins <= 540 || pv.start >= 600).toBe(true);
    expect(A.addTag(withBlocks([work("w")]), "w", BUFFER_ID).weeks[0][0].catIds).toEqual(["work"]);
  });
});

describe("a placed buffer", () => {
  const d = A.placeBlock(withBlocks([work("w", { done: true })]), 0, BUFFER_ID, 0, 720, undefined, { uid: () => "b" });
  it("counts toward no area and isn't a session", () => {
    expect(weekBalance(d, 0).every((r) => r.balance.plannedMins === (r.cat.id === "work" ? 60 : 0))).toBe(true);
    expect(completion(d, 0)).toEqual({ done: 1, total: 1, pct: 100 });
  });
  it("has no tick", () => expect(A.toggleDone(d, 0, "b")).toBe(d));
  it("becomes an area block when an area is dropped on it", () => {
    const b = A.addTag(d, "b", "learn").weeks[0].find((x) => x.id === "b")!;
    expect(b.catIds).toEqual(["learn"]);
    expect("buffer" in b).toBe(false);
  });
  it("moves and resizes like any block", () => {
    expect(A.moveBlock(d, 0, "b", 3, 600).weeks[0].find((x) => x.id === "b")).toMatchObject({ day: 3, start: 600, buffer: true });
    expect(A.resize(d, 0, "b", "bottom", 720, 30, 1).weeks[0].find((x) => x.id === "b")!.mins).toBe(60);
  });
  it("survives removing a category", () => {
    expect(A.removeCat(d, "work").weeks[0].map((x) => x.id)).toEqual(["b"]);
  });
  it("is kept by templates", () => {
    const saved = A.saveTemplate(d, 0, "T", { uid: () => "t" });
    expect(saved.templates[0].blocks.filter((x) => x.buffer)).toHaveLength(1);
    const applied = A.applyTemplate(saved, 1, "t", { uid: ids() });
    expect(applied.weeks[1].filter((x) => x.buffer)).toEqual([{ id: "id2", catIds: [], day: 0, start: 720, mins: 30, label: "", desc: "", done: false, buffer: true }]);
  });
});

describe("normalizeData and buffers", () => {
  it("keeps buffers and ignores stray tags on them", () => {
    const raw = { weeks: [[{ id: "b", catIds: ["work", "nope"], day: 1, start: 600, mins: 30, label: "", desc: "", done: true, buffer: true }], []] };
    const { data, dropped } = normalizeData(raw);
    expect(dropped).toBe(0);
    expect(data.weeks[0]).toEqual([{ id: "b", catIds: [], day: 1, start: 600, mins: 30, label: "", desc: "", done: true, buffer: true }]);
    expect(normalizeData(data).data).toEqual(data);
  });
  it("still drops untagged blocks that aren't buffers", () => {
    expect(normalizeData({ weeks: [[{ id: "x", catIds: [], day: 1, start: 600, mins: 30 }], []] }).dropped).toBe(1);
  });
  it("normal blocks gain no buffer field (stored shape unchanged)", () => {
    const { data } = normalizeData({ weeks: [[work("w")], []] });
    expect("buffer" in data.weeks[0][0]).toBe(false);
  });
});
