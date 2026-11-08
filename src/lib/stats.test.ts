import { describe, expect, it } from "vitest";
import { defaultData, type Block, type CadenceData } from "./model";
import * as A from "./actions";
import { completion, hoursToBlockMins, hoursToTargetMins, quotaStatus, weekBalance } from "./stats";

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

const withWeeks = (w0: Block[], w1: Block[] = []): CadenceData => ({ ...defaultData(), weeks: [w0, w1] });

describe("quotaStatus", () => {
  it("counts multi-tag blocks fully toward each category and flags met targets", () => {
    const d = withWeeks([
      blk("a", { catIds: ["exercise", "learn"], mins: 120, done: true }),
      blk("b", { catIds: ["exercise"], mins: 120, day: 1 }),
    ]);
    const q = quotaStatus(d, 0);
    const ex = q.find((x) => x.cat.id === "exercise")!;
    const le = q.find((x) => x.cat.id === "learn")!;
    expect(ex).toMatchObject({ placedMins: 240, doneMins: 120, met: true });
    expect(le).toMatchObject({ placedMins: 120, doneMins: 120, met: false });
    expect(q.map((x) => x.cat.id)).toEqual(["exercise", "work", "learn", "play"]);
  });

  it("only looks at the requested week", () => {
    const d = withWeeks([], [blk("a", { mins: 90 })]);
    expect(quotaStatus(d, 0).find((x) => x.cat.id === "work")!.placedMins).toBe(0);
    expect(quotaStatus(d, 1).find((x) => x.cat.id === "work")!.placedMins).toBe(90);
  });
});

describe("completion", () => {
  it("is 0% for an empty week", () => {
    expect(completion(withWeeks([]), 0)).toEqual({ done: 0, total: 0, pct: 0 });
  });
  it("rounds done/total", () => {
    const d = withWeeks([blk("a", { done: true }), blk("b", { day: 1 }), blk("c", { day: 2 })]);
    expect(completion(d, 0)).toEqual({ done: 1, total: 3, pct: 33 });
  });
});

describe("hour -> minute conversions", () => {
  it("target rounds to the minute", () => {
    expect(hoursToTargetMins(2.5)).toBe(150);
    expect(hoursToTargetMins(0)).toBe(0);
    expect(hoursToTargetMins(1.01)).toBe(61);
  });
  it("block snaps to 30 minutes, at least 30", () => {
    expect(hoursToBlockMins(1.5)).toBe(90);
    expect(hoursToBlockMins(1.2)).toBe(60);
    expect(hoursToBlockMins(0)).toBe(30);
    expect(hoursToBlockMins(0.1)).toBe(30);
  });
});

describe("weekBalance", () => {
  it("balances planned minutes against each guardrail, per week", () => {
    const d = A.updateCat(A.updateCat(defaultData(), "work", { limit: { kind: "ceiling", max: 120 } }), "learn", {
      limit: { kind: "range", min: 60, max: 120 },
    });
    const b = (id: string, catIds: string[], day: number, mins: number) => blk(id, { catIds, day, mins });
    const data: CadenceData = {
      ...d,
      weeks: [[b("a", ["work", "learn"], 0, 180), b("b", ["exercise"], 1, 60)], [b("c", ["work"], 0, 60)]],
    };
    const w1 = weekBalance(data, 0);
    expect(w1.map((x) => [x.cat.id, x.balance.state, x.balance.plannedMins])).toEqual([
      ["exercise", "short", 60],
      ["work", "over", 180],
      ["learn", "over", 180],
      ["play", "short", 0],
    ]);
    // week 2 starts fresh: nothing carries over from week 1
    expect(weekBalance(data, 1)[1].balance).toMatchObject({ state: "within", plannedMins: 60 });
  });
});
