// Phone block sheet (JP, 2026-11-07): tapping a block on a phone opens it in a floating sheet like
// the add window, with no keyboard until a field is tapped. Pure helpers only.
import type { Block } from "./model";
import { fmtTime } from "./time";
import { LIB_EN, type LibWords } from "./words";

/**
 * How much of the bottom of the layout viewport the on-screen keyboard covers (0 when it's closed),
 * from `window.innerHeight` and the visual viewport: the sheet sits that much higher to stay above it.
 */
export const keyboardInset = (innerHeight: number, viewHeight: number, viewTop: number): number =>
  Math.max(0, Math.round(innerHeight - viewHeight - viewTop));

/** "Wed · 9am–11am" / "mer. · 9 h–11 h": the sheet's header. */
export const blockWhen = (p: Pick<Block, "day" | "start" | "mins">, w: LibWords = LIB_EN): string =>
  `${w.days[p.day]} · ${fmtTime(p.start, w.lang)}–${fmtTime(p.start + p.mins, w.lang)}`;
