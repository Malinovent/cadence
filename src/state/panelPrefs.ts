// S1.4: whether the areas-and-tasks panel is hidden (desktop) or folded to its slim bar (phone).
// A per-device choice, not synced. Same key the tray "hide" used before, so that choice carries over.
export const PANEL_HIDDEN_KEY = "cadence:ui:trayHidden";

export function readPanelHidden(): boolean {
  try {
    return localStorage.getItem(PANEL_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePanelHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(PANEL_HIDDEN_KEY, "1");
    else localStorage.removeItem(PANEL_HIDDEN_KEY);
  } catch {
    // storage unavailable: the choice just won't persist
  }
}
