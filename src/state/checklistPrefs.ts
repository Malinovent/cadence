// Onboarding checklist: whether it's showing, dismissed or folded, and what's been done since it
// started, per device (not synced). Done items are kept here so a check never disappears once earned.
import { CHECK_ITEMS, type CheckDone } from "../lib/guide";

export type ChecklistPrefs = { shown: boolean; dismissed: boolean; collapsed: boolean; done: CheckDone };
export const DEFAULT_CHECKLIST: ChecklistPrefs = { shown: false, dismissed: false, collapsed: false, done: {} };

const KEY = "cadence:ui:checklist";

/** "Show the introduction again": the checklist back, open, and starting over at 0 of 5. */
export const restartChecklist = (c: ChecklistPrefs): ChecklistPrefs => ({
  ...c,
  shown: true,
  dismissed: false,
  collapsed: false,
  done: {},
});

export function parseChecklist(raw: string | null): ChecklistPrefs {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== "object") return DEFAULT_CHECKLIST;
    const r = v as Record<string, unknown>;
    const doneIn = (r.done && typeof r.done === "object" ? r.done : {}) as Record<string, unknown>;
    const done: CheckDone = {};
    for (const item of CHECK_ITEMS) if (doneIn[item] === true) done[item] = true;
    return { shown: r.shown === true, dismissed: r.dismissed === true, collapsed: r.collapsed === true, done };
  } catch {
    return DEFAULT_CHECKLIST;
  }
}

export function readChecklist(): ChecklistPrefs {
  try {
    return parseChecklist(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_CHECKLIST;
  }
}

export function writeChecklist(p: ChecklistPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: the checklist starts over next time
  }
}
