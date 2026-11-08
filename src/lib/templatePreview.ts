// What applying a template, a starter week or a day template would do (JP, 2026-11-08): the
// result in miniature, hours per area, how many blocks it replaces and the areas it adds. Worked
// out from the data before and after the change, so the preview is exactly what "Use it" does.

import type { WeekIndex } from "./actions";
import type { Block, CadenceData, Category } from "./model";
import type { Bounds } from "./placement";
import type { AreaIcon } from "./icons";

export type PreviewRow = { catId: string; name: string; color: string; icon?: AreaIcon; mins: number };

export type Preview = {
  /** the blocks the week (or the day) would hold */
  blocks: Block[];
  cats: Category[];
  /** hours per area, in the areas' order; a block for several areas counts fully to each */
  rows: PreviewRow[];
  /** blocks there now that it replaces */
  replaces: number;
  /** names of the areas it would add */
  added: string[];
};

export function previewChange(before: CadenceData, after: CadenceData, week: WeekIndex, day?: number): Preview {
  const inScope = (b: Block) => day === undefined || b.day === day;
  const blocks = after.weeks[week].filter(inScope);
  const mins = new Map<string, number>();
  for (const b of blocks) for (const id of b.catIds) mins.set(id, (mins.get(id) ?? 0) + b.mins);
  const rows = after.cats
    .filter((c) => (mins.get(c.id) ?? 0) > 0)
    .map((c) => ({ catId: c.id, name: c.name, color: c.color, icon: c.icon, mins: mins.get(c.id)! }));
  const had = new Set(before.cats.map((c) => c.id));
  return {
    blocks,
    cats: after.cats,
    rows,
    replaces: before.weeks[week].filter(inScope).length,
    added: after.cats.filter((c) => !had.has(c.id)).map((c) => c.name),
  };
}

/** The hours a miniature shows: the day hours, widened to whole hours holding every block. */
export function miniBounds(blocks: readonly Pick<Block, "start" | "mins">[], hours: Bounds): [number, number] {
  let [from, to] = hours;
  for (const b of blocks) {
    from = Math.min(from, Math.floor(b.start / 60) * 60);
    to = Math.max(to, Math.ceil((b.start + b.mins) / 60) * 60);
  }
  return [Math.max(0, from), Math.min(24 * 60, to)];
}
