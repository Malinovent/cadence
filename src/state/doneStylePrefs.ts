// How ticked blocks look, per device (Settings → Look and sound, JP 2026-11-08): `cadence:ui:doneStyle`.
// Kept in memory too, so every block reads it without touching storage on each draw.
import { parseDoneStyle, type DoneStyle } from "../lib/doneStyle";

const KEY = "cadence:ui:doneStyle";

function load(): DoneStyle {
  try {
    return parseDoneStyle(localStorage.getItem(KEY));
  } catch {
    return "soft";
  }
}

let current: DoneStyle = load();

export const readDoneStyle = (): DoneStyle => current;

export function writeDoneStyle(style: DoneStyle): void {
  current = style;
  try {
    if (style === "soft") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, style);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
}
