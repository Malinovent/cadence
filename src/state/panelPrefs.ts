// S1.4: whether the areas-and-tasks panel is hidden (desktop) or folded to its slim bar (phone).
// A per-device choice, not synced. Same key the tray "hide" used before, so that choice carries over.
// JP (2026-11-09): until the person chooses, the phone tray starts folded so the calendar shows
// first; the desktop panel starts shown. "0" remembers "shown", so unfolding it once sticks.
export const PANEL_HIDDEN_KEY = "cadence:ui:trayHidden";

/** The person's choice on this device, or null if they haven't made one. */
export function readPanelHidden(): boolean | null {
  try {
    const v = localStorage.getItem(PANEL_HIDDEN_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

export function writePanelHidden(hidden: boolean): void {
  try {
    localStorage.setItem(PANEL_HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    // storage unavailable: the choice just won't persist
  }
}
