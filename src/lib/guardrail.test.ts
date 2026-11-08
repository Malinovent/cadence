import { describe, expect, it } from "vitest";
import {
  balance,
  changeKind,
  floorFromTarget,
  fmtH,
  legacyTarget,
  limitLabel,
  parseLimit,
  type Limit,
} from "./guardrail";

const h = (n: number) => n * 60;
const floor10: Limit = { kind: "floor", min: h(10) };
const ceil40: Limit = { kind: "ceiling", max: h(40) };
const range48: Limit = { kind: "range", min: h(4), max: h(8) };

describe("parseLimit", () => {
  it("reads each kind", () => {
    expect(parseLimit({ kind: "floor", min: 600 })).toEqual(floor10);
    expect(parseLimit({ kind: "ceiling", max: 2400 })).toEqual(ceil40);
    expect(parseLimit({ kind: "range", min: 240, max: 480 })).toEqual(range48);
  });
  it("turns a backwards range round", () => expect(parseLimit({ kind: "range", min: 480, max: 240 })).toEqual(range48));
  it("rejects junk", () => {
    for (const v of [
      null,
      5,
      [],
      { kind: "floor" },
      { kind: "floor", min: -1 },
      { kind: "cap", max: 1 },
      { kind: "range", min: 1 },
    ])
      expect(parseLimit(v)).toBeNull();
  });
});

describe("migration helpers", () => {
  it("targets become floors", () => {
    expect(floorFromTarget(240)).toEqual({ kind: "floor", min: 240 });
    expect(floorFromTarget(NaN)).toEqual({ kind: "floor", min: 0 });
  });
  it("keeps a legacy target for older app copies", () => {
    expect(legacyTarget(floor10)).toBe(600);
    expect(legacyTarget(range48)).toBe(240);
    expect(legacyTarget(ceil40)).toBe(0);
  });
  it("changes kind keeping sensible numbers", () => {
    expect(changeKind(floor10, "ceiling", 60)).toEqual({ kind: "ceiling", max: h(12) });
    expect(changeKind(floor10, "range", 60)).toEqual({ kind: "range", min: h(10), max: h(12) });
    expect(changeKind(ceil40, "floor", 60)).toEqual({ kind: "floor", min: h(39) });
    expect(changeKind(range48, "ceiling")).toEqual({ kind: "ceiling", max: h(8) });
    expect(changeKind(range48, "range")).toBe(range48);
  });
});

describe("balance", () => {
  it("floor: partial credit toward the floor", () => {
    const b = balance(floor10, h(7));
    expect(b).toMatchObject({ state: "short", shortMins: h(3), overMins: 0 });
    expect(b.credit).toBeCloseTo(0.7);
    expect(balance(floor10, h(12))).toMatchObject({ state: "met", credit: 1, shortMins: 0 });
    expect(balance({ kind: "floor", min: 0 }, 0)).toMatchObject({ state: "met", credit: 1 });
  });
  it("ceiling: within or over, never short", () => {
    expect(balance(ceil40, h(38))).toMatchObject({ state: "within", credit: 1, overMins: 0 });
    expect(balance(ceil40, h(42))).toMatchObject({ state: "over", credit: 1, overMins: h(2) });
    expect(balance(ceil40, h(40)).state).toBe("within");
  });
  it("range: full credit anywhere inside, partial below", () => {
    expect(balance(range48, h(4))).toMatchObject({ state: "inRange", credit: 1 });
    expect(balance(range48, h(8))).toMatchObject({ state: "inRange", credit: 1 });
    const below = balance(range48, h(3));
    expect(below).toMatchObject({ state: "short", shortMins: h(1) });
    expect(below.credit).toBeCloseTo(0.75);
    expect(balance(range48, h(9))).toMatchObject({ state: "over", credit: 1, overMins: h(1) });
  });
});

describe("wording", () => {
  it("formats hours", () => {
    expect(fmtH(450)).toBe("7.5");
    expect(fmtH(600)).toBe("10");
    expect(fmtH(0)).toBe("0");
  });
  it("labels limits like the wireframe", () => {
    expect(limitLabel(floor10)).toBe("At least 10h");
    expect(limitLabel(ceil40)).toBe("At most 40h");
    expect(limitLabel(range48)).toBe("Between 4h and 8h");
  });
});
