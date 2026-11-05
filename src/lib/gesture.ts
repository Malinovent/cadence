// Pure maths for the pointer interaction engine (src/interaction/engine.ts):
// thresholds, pointer y -> slot start, hit-testing against measured rects,
// autoscroll speed, resize grip sizing, and what a drop means.
// Nothing here touches the DOM; geometry is passed in, so the grid's row height
// and column count are parameters (desktop: 7 columns of 26px rows).
import { BUFFER_ID, BUFFER_MINS, DAY_END, DAY_START, STEP } from "./constants";
import type { Block, Category } from "./model";
import { resolvePlacement, type Bounds } from "./placement";

// ---- thresholds (SPEC "Phase 3 design") ----
export const LONG_PRESS_MS = 350; // touch: hold this long to pick up
export const TOUCH_SLOP = 8; // touch: moving this far before the long-press fires cancels it (page scrolls)
export const MOUSE_SLOP = 4; // mouse/pen: moving this far starts the drag
export const AUTOSCROLL_EDGE = 60; // px from the viewport top/bottom where autoscroll kicks in
export const AUTOSCROLL_MAX = 16; // px per frame at the very edge
export const GRIP_OUTSIDE = 22; // touch resize hit area: px outside the block edge
export const GRIP_INSIDE = 22; // ... and px inside it, before shrinking for short blocks
export const GRIP_FREE = 0.4; // fraction of the block height always left free for tap/hold
export const GRIP_SPAN = 0.5; // grips cover the middle half of the block width (name and done toggle stay free)...
export const GRIP_MIN_WIDTH = 44; // ...but at least 44px wide, never wider than the block
export const TRAY_GHOST_OFFSET = 8; // tray drag ghost: its top-left corner sits this far up-left of the pointer
export const BLOCK_GAP = 4; // a block is drawn 4px shorter than its slots

const DEFAULT_BOUNDS: Bounds = [DAY_START, DAY_END];

// true once a pointer has travelled at least `slop` px from where it went down
export const exceedsSlop = (dx: number, dy: number, slop: number): boolean => dx * dx + dy * dy >= slop * slop;

export const slotCount = (bounds: Bounds = DEFAULT_BOUNDS, step: number = STEP): number =>
  Math.max(0, Math.floor((bounds[1] - bounds[0]) / step));

// y in px from the top of a day column -> start (mins) of the slot row under it, clamped to the day
export const slotStartAt = (y: number, rowH: number, bounds: Bounds = DEFAULT_BOUNDS, step: number = STEP): number => {
  const last = slotCount(bounds, step) - 1;
  const idx = Math.max(0, Math.min(last, Math.floor(y / rowH)));
  return bounds[0] + idx * step;
};

// y in px from the top of a day column -> start of the NEAREST slot row boundary (round, not
// floor), clamped to the day. Used for a moved block's top edge, so it snaps symmetrically.
export const slotStartNear = (y: number, rowH: number, bounds: Bounds = DEFAULT_BOUNDS, step: number = STEP): number => {
  const last = slotCount(bounds, step) - 1;
  const idx = Math.max(0, Math.min(last, Math.round(y / rowH)));
  return bounds[0] + idx * step;
};

// where a block (or a drop preview) sits inside its day column
export const blockBox = (
  start: number,
  mins: number,
  rowH: number,
  dayStart: number = DAY_START,
  step: number = STEP,
): { top: number; height: number } => ({
  top: ((start - dayStart) / step) * rowH,
  height: (mins / step) * rowH - BLOCK_GAP,
});

// rows travelled by a resize drag between two y positions (same reference frame)
export const resizeDeltaSlots = (fromY: number, toY: number, rowH: number): number =>
  Math.round((toY - fromY) / rowH) || 0; // `|| 0` folds -0 into 0

// px to scroll the window this frame: negative near the top, positive near the bottom,
// proportional to how deep the pointer is into the edge band, capped at `max`
export const autoscrollSpeed = (
  y: number,
  viewportH: number,
  edge: number = AUTOSCROLL_EDGE,
  max: number = AUTOSCROLL_MAX,
): number => {
  if (viewportH <= 0 || edge <= 0) return 0;
  const depthTop = edge - y;
  const depthBottom = y - (viewportH - edge);
  if (depthTop > 0) return -Math.round(max * Math.min(1, depthTop / edge)) || 0;
  if (depthBottom > 0) return Math.round(max * Math.min(1, depthBottom / edge));
  return 0;
};

// ---- touch resize grips ----
// How far the grip hit area reaches INTO a block of height `h`: 22px, reduced on
// short blocks so the middle GRIP_FREE (40%) of the block stays free for tap/hold.
export const gripInside = (h: number): number => Math.max(0, Math.min(GRIP_INSIDE, (h * (1 - GRIP_FREE)) / 2));

// Hit areas around one block, in column coordinates. The parts outside the block are
// clamped to the column so they never spill over the head row or below the grid.
export type GripZones = {
  inside: number; // px inside the block from each edge
  outsideTop: number; // px above the top edge
  outsideBottom: number; // px below the bottom edge
};
export const gripZones = (top: number, height: number, colHeight: number): GripZones => ({
  inside: gripInside(height),
  outsideTop: Math.max(0, Math.min(GRIP_OUTSIDE, top)),
  outsideBottom: Math.max(0, Math.min(GRIP_OUTSIDE, colHeight - (top + height))),
});

// Horizontal extent of the grip hit areas inside a block `w` px wide: the centred middle
// GRIP_SPAN, at least GRIP_MIN_WIDTH, clamped to the block. `left` is from the block's left edge.
export const gripSpan = (w: number): { left: number; width: number } => {
  const width = Math.max(0, Math.min(w, Math.max(GRIP_MIN_WIDTH, w * GRIP_SPAN)));
  return { left: (w - width) / 2, width };
};

// which edge grip (if any) the point (x, y), relative to a w x h block's top-left, lands on:
// the inside part of the hit areas, within the grip span
export const edgeAt = (x: number, y: number, w: number, h: number): "top" | "bottom" | null => {
  const span = gripSpan(w);
  if (x < span.left || x > span.left + span.width) return null;
  const inside = gripInside(h);
  if (y < inside) return "top";
  if (y > h - inside) return "bottom";
  return null;
};

// ---- hit-testing ----
export type Rect = { left: number; top: number; right: number; bottom: number };
export type ColRect = { day: number; rect: Rect };
export type BlockRect = { id: string; rect: Rect };
export type GridHit = { day: number; start: number; blockId: string | null };

const inside = (x: number, y: number, r: Rect) => x >= r.left && x < r.right && y >= r.top && y < r.bottom;

// What is under the viewport point (x, y): a day column (with a slot start) and the block
// there, if any. `clip` is the visible grid area (its scroll container), so columns scrolled
// out of view never match. Null when the point is outside the grid.
// Start: without `grabOffsetY`, the slot row under y (a new block's top at the pointer). With
// it (a moved block, grabbed that many px below its top), the slot nearest to the block's
// top edge, y - grabOffsetY, so the block lands where its ghost is.
export const hitTest = (
  x: number,
  y: number,
  clip: Rect,
  cols: readonly ColRect[],
  blocks: readonly BlockRect[],
  rowH: number,
  grabOffsetY: number | null = null,
  bounds: Bounds = DEFAULT_BOUNDS,
  step: number = STEP,
): GridHit | null => {
  if (!inside(x, y, clip)) return null;
  const col = cols.find((c) => inside(x, y, c.rect));
  if (!col) return null;
  const block = blocks.find((b) => inside(x, y, b.rect));
  const start =
    grabOffsetY === null
      ? slotStartAt(y - col.rect.top, rowH, bounds, step)
      : slotStartNear(y - grabOffsetY - col.rect.top, rowH, bounds, step);
  return { day: col.day, start, blockId: block ? block.id : null };
};

// ---- what a drop means ----
export type DragSource = { kind: "tray"; catId: string } | { kind: "move"; id: string } | { kind: "task"; taskId: string };
export type DropIntent =
  | { kind: "attach"; blockId: string; taskId: string } // S1.5: task dropped onto a block: joins its to-do list
  | { kind: "tag"; blockId: string; catId: string } // tray category dropped onto a block
  | { kind: "place"; catId: string; day: number; start: number } // tray category dropped on a slot
  | { kind: "move"; id: string; day: number; start: number }; // placed block dropped on a slot

// Where the pointer sits inside the drag ghost (px from the ghost's top-left). A moved block
// keeps the point where it was grabbed (pointer down at startX/startY on `rect`); a tray item
// is not block-shaped, so its ghost hangs just below-right of the pointer.
export const ghostOffset = (source: DragSource, startX: number, startY: number, rect: Rect): { x: number; y: number } =>
  source.kind === "move"
    ? { x: startX - rect.left, y: startY - rect.top }
    : { x: TRAY_GHOST_OFFSET, y: TRAY_GHOST_OFFSET };

// null: the drop does nothing (a task over empty time: tasks only go into blocks)
export const resolveDrop = (source: DragSource, hit: GridHit): DropIntent | null => {
  if (source.kind === "task") return hit.blockId ? { kind: "attach", blockId: hit.blockId, taskId: source.taskId } : null;
  if (source.kind === "tray") {
    // a buffer is never a tag: dropped over a block it goes in the nearest free spot instead
    if (hit.blockId && source.catId !== BUFFER_ID) return { kind: "tag", blockId: hit.blockId, catId: source.catId };
    return { kind: "place", catId: source.catId, day: hit.day, start: hit.start };
  }
  // a moving block ignores blocks under the pointer: resolvePlacement finds the free spot
  return { kind: "move", id: source.id, day: hit.day, start: hit.start };
};

// The exact spot placeBlock / moveBlock would use for this intent (same resolvePlacement
// call, same defaults), so the preview outline matches the result. Null = drop is a no-op.
export const dropPreview = (
  blocks: readonly Block[],
  cats: readonly Category[],
  intent: DropIntent,
): { day: number; start: number; mins: number } | null => {
  if (intent.kind === "tag" || intent.kind === "attach") return null;
  if (intent.kind === "place") {
    const dur = intent.catId === BUFFER_ID ? BUFFER_MINS : cats.find((c) => c.id === intent.catId)?.blockMins;
    if (!dur) return null;
    const r = resolvePlacement(blocks, intent.day, intent.start, dur, null);
    return r && { day: intent.day, ...r };
  }
  const p = blocks.find((b) => b.id === intent.id);
  if (!p) return null;
  const r = resolvePlacement(blocks, intent.day, intent.start, p.mins, intent.id);
  return r && { day: intent.day, ...r };
};

// "#rrggbb" + two hex alpha digits -> "#rrggbbaa" (expands "#rgb"); other strings pass through
export const withAlpha = (color: string, alpha: string): string => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${hex}${alpha}`;
};
