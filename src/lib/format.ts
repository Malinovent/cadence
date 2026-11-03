import type { ImportSummary } from "./transfer";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// "4 categories · 12 blocks across both weeks · 2 templates · 37 logged sessions · 3 streaks."
export const importSummaryLine = (s: ImportSummary): string =>
  [
    count(s.categories, "category", "categories"),
    `${count(s.blocks, "block", "blocks")} across both weeks`,
    count(s.templates, "template", "templates"),
    count(s.sessions, "logged session", "logged sessions"),
    count(s.streaks, "streak", "streaks"),
  ].join(" · ") + ".";

// null when nothing was dropped
export const droppedLine = (dropped: number): string | null =>
  dropped > 0 ? `Skipped ${count(dropped, "entry", "entries")} that didn't look right.` : null;
