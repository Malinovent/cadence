import type { ImportSummary } from "./transfer";
import { LIB_EN, type LibWords } from "./words";

// "4 categories · 12 blocks across both weeks · 2 templates · 37 logged sessions · 3 streaks · 5 tasks."
// (the tasks part only when there are any)
export const importSummaryLine = (s: ImportSummary, w: LibWords = LIB_EN): string =>
  [
    w.summary.categories(s.categories),
    w.summary.blocks(s.blocks),
    w.summary.templates(s.templates),
    w.summary.sessions(s.sessions),
    w.summary.streaks(s.streaks),
    ...(s.tasks > 0 ? [w.summary.tasks(s.tasks)] : []),
  ].join(" · ") + ".";

// null when nothing was dropped
export const droppedLine = (dropped: number, w: LibWords = LIB_EN): string | null =>
  dropped > 0 ? w.summary.dropped(dropped) : null;
