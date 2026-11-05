// S1.6: click or tap empty time to add. Pure pieces of the small window (desktop) / bottom
// sheet (phone): what it offers, where it opens, and what a pick would place.
//
// JP (2026-11-04): it opens only when no area is armed (an armed area's tap still places it,
// as before), and it offers areas and the buffer, not tasks (tasks go into blocks only).
import { BUFFER_ID } from "./constants";
import type { Block, Category } from "./model";
import { resolvePlacement } from "./placement";
import { placeMins } from "./actions";

/** The lengths offered; null = the area's usual block (the default). */
export const SLOT_LENGTHS = [30, 60, 90, 120] as const;
export type SlotLength = (typeof SLOT_LENGTHS)[number] | null;

/** Where the user tapped: the day and the slot's start (mins), plus the viewport point. */
export type SlotTap = { day: number; start: number; x: number; y: number };

/** The length a pick places: the chosen one, or the area's (or the buffer's) usual length. */
export const pickMins = (cats: readonly Category[], catId: string, length: SlotLength): number | undefined =>
  length ?? placeMins(cats, catId);

/**
 * What picking `catId` would place: the same nearest-gap / shrink-to-fit rule as a drop, so the
 * window can say so beforehand. Null when nothing fits (the day is full).
 */
export const pickPlacement = (
  blocks: readonly Block[],
  cats: readonly Category[],
  tap: Pick<SlotTap, "day" | "start">,
  catId: string,
  length: SlotLength,
): { start: number; mins: number } | null => {
  const mins = pickMins(cats, catId, length);
  if (!mins) return null;
  return resolvePlacement(blocks, tap.day, tap.start, mins, null);
};

/** The window opens only where a block could go (a full day stays quiet). */
export const canAddAt = (blocks: readonly Block[], day: number, start: number): boolean =>
  resolvePlacement(blocks, day, start, 30, null) !== null;

/** The menu's rows: the areas in their order, then the buffer. */
export const slotOptions = (cats: readonly Category[]): { id: string; name: string; color: string | null }[] => [
  ...cats.map((c) => ({ id: c.id, name: c.name || "Untitled", color: c.color })),
  { id: BUFFER_ID, name: "Buffer", color: null },
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
