// The hours the calendar shows, per device (not synced), like the language and the balanced-week
// rules: `cadence:ui:dayHours` = [start, end] in minutes. The default (7:00–23:00) isn't stored.
import { DEFAULT_HOURS, parseDayHours } from "../lib/dayHours";
import type { Bounds } from "../lib/placement";

const KEY = "cadence:ui:dayHours";

export function readDayHours(): Bounds {
  try {
    return parseDayHours(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_HOURS;
  }
}

export function writeDayHours(h: Bounds): void {
  try {
    if (h[0] === DEFAULT_HOURS[0] && h[1] === DEFAULT_HOURS[1]) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
}
