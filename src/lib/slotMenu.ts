// S1.6: click or tap empty time to add. Pure pieces of the small window (desktop) / bottom
// sheet (phone): what it offers, where it opens, and what a pick would place.
//
// JP (2026-11-04): it opens only when no area is armed (an armed area's tap still places it,
// as before), and it offers areas and the buffer, not tasks (tasks go into blocks only).
import { BUFFER_ID } from "./constants";
import type { Block, Category } from "./model";
import { resolvePlacement, type Bounds } from "./placement";
import { placeMins } from "./actions";
import { LIB_EN, type LibWords } from "./words";

/** Where the user tapped: the day and the slot's start (mins), plus the viewport point. */
export type SlotTap = { day: number; start: number; x: number; y: number };

/**
 * Where picking `catId` lands: the area's (or the buffer's) usual length, by the same nearest-gap
 * / shrink-to-fit rule as a drop. Null when nothing fits. JP (2026-11-06): the window doesn't ask
 * for a length; the person resizes the block in the calendar.
 */
export const pickPlacement = (
  blocks: readonly Block[],
  cats: readonly Category[],
  tap: Pick<SlotTap, "day" | "start">,
  catId: string,
  bounds?: Bounds, // the calendar's hours; 7:00–23:00 when not given
): { start: number; mins: number } | null => {
  const mins = placeMins(cats, catId);
  if (!mins) return null;
  return resolvePlacement(blocks, tap.day, tap.start, mins, null, bounds);
};

/** The window opens only where a block could go (a full day stays quiet). */
export const canAddAt = (blocks: readonly Block[], day: number, start: number, bounds?: Bounds): boolean =>
  resolvePlacement(blocks, day, start, 30, null, bounds) !== null;

/** The menu's rows: the areas in their order, then the buffer. */
export const slotOptions = (
  cats: readonly Category[],
  w: LibWords = LIB_EN,
): { id: string; name: string; color: string | null }[] => [
  ...cats.map((c) => ({ id: c.id, name: c.name || w.panel.untitled, color: c.color })),
  { id: BUFFER_ID, name: w.panel.buffer, color: null },
];

/**
 * Desktop: the window sits beside the tapped point, to its right, or to its left when there's
 * no room; vertically it starts at the point and is kept inside the viewport (8px margin).
 */
export function menuPosition(
  tap: { x: number; y: number },
  size: { w: number; h: number },
  viewport: { w: number; h: number },
  gap = 12,
  margin = 8,
): { left: number; top: number } {
  const right = tap.x + gap;
  const left = right + size.w <= viewport.w - margin ? right : Math.max(margin, tap.x - gap - size.w);
  const top = Math.max(margin, Math.min(tap.y - 16, viewport.h - margin - size.h));
  return { left, top };
}
