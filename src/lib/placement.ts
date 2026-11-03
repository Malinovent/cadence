import { DAY_END, DAY_START, SNAP_THRESHOLD, STEP } from "./constants";
import type { Block } from "./model";

export type Gap = { s: number; e: number };
export type Bounds = readonly [number, number];
export type Placed = { id: string; day: number; start: number; mins: number };

const DEFAULT_BOUNDS: Bounds = [DAY_START, DAY_END];

// Compute free gaps in a day, given occupied intervals (sorted by start).
export const freeGaps = (others: readonly Gap[], dayStart: number, dayEnd: number): Gap[] => {
  const gaps: Gap[] = [];
  let cursor = dayStart;
  for (const o of others) {
    if (o.s > cursor) gaps.push({ s: cursor, e: o.s });
    cursor = Math.max(cursor, o.e);
  }
  if (cursor < dayEnd) gaps.push({ s: cursor, e: dayEnd });
  return gaps;
};

// Find a placement for a block of `mins` on `day`, near `desiredStart`.
// Snaps to neighbor edges when close, avoids overlap, and SHRINKS the block
// to fill the available gap when there isn't room for the full duration.
// Returns { start, mins } or null if no gap can hold even one step.
export const resolvePlacement = (
  placements: readonly Placed[],
  day: number,
  desiredStart: number,
  mins: number,
  ignoreId: string | null,
  bounds: Bounds = DEFAULT_BOUNDS,
  step: number = STEP,
): { start: number; mins: number } | null => {
  const [dayStart, dayEnd] = bounds;
  const others = placements
    .filter((p) => p.day === day && p.id !== ignoreId)
    .map((p) => ({ s: p.start, e: p.start + p.mins }))
    .sort((a, b) => a.s - b.s);
  let start = Math.max(dayStart, Math.min(desiredStart, dayEnd - step));

  // snap to a neighbor edge if close
  for (const o of others) {
    if (Math.abs(start - o.e) <= SNAP_THRESHOLD) start = o.e;
    else if (Math.abs(start + mins - o.s) <= SNAP_THRESHOLD) start = o.s - mins;
  }
  start = Math.max(dayStart, Math.min(start, dayEnd - step));
  const gaps = freeGaps(others, dayStart, dayEnd).filter((g) => g.e - g.s >= step);
  if (gaps.length === 0) return null; // day is completely full

  // prefer the gap containing `start`; otherwise the gap nearest to it
  let gap = gaps.find((g) => start >= g.s && start < g.e);
  if (!gap) {
    gap = gaps.reduce((best, g) => {
      const dist = start < g.s ? g.s - start : start - g.e;
      const bestDist = start < best.s ? best.s - start : start - best.e;
      return dist < bestDist ? g : best;
    }, gaps[0]);
    start = gap.s;
  }

  // clamp start into the gap, then shrink duration to whatever fits
  start = Math.max(gap.s, Math.min(start, gap.e - step));
  const available = gap.e - start;
  const finalMins = Math.min(mins, available);
  if (finalMins < step) return null;
  return { start, mins: finalMins };
};

// Resize a block by dragging its top or bottom edge `deltaSlots` rows from where
// the drag began (origStart/origMins). Clamped by same-day neighbours and the day
// bounds, never shorter than one step. Returns a new array (same one if id is unknown).
export const resizeBlock = (
  blocks: Block[],
  id: string,
  edge: "top" | "bottom",
  origStart: number,
  origMins: number,
  deltaSlots: number,
  bounds: Bounds = DEFAULT_BOUNDS,
  step: number = STEP,
): Block[] => {
  const [dayStart, dayEnd] = bounds;
  const p = blocks.find((x) => x.id === id);
  if (!p) return blocks;
  const others = blocks.filter((x) => x.day === p.day && x.id !== p.id);
  let next: Block;
  if (edge === "bottom") {
    const newMins = Math.max(step, origMins + deltaSlots * step);
    let maxEnd = dayEnd;
    others.forEach((o) => {
      if (o.start >= origStart + origMins && o.start < maxEnd) maxEnd = o.start;
    });
    next = { ...p, mins: Math.min(newMins, maxEnd - p.start) };
  } else {
    let newStart = origStart + deltaSlots * step;
    newStart = Math.max(dayStart, Math.min(newStart, origStart + origMins - step));
    let minStart = dayStart;
    others.forEach((o) => {
      const oe = o.start + o.mins;
      if (oe <= origStart && oe > minStart) minStart = oe;
    });
    newStart = Math.max(newStart, minStart);
    next = { ...p, start: newStart, mins: origStart + origMins - newStart };
  }
  return blocks.map((x) => (x === p ? next : x));
};
