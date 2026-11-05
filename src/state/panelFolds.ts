// S1.5: which areas have their task list folded away in the panel. Per device, not synced.
const KEY = "cadence:ui:foldedAreas";

export function readFolded(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeFolded(ids: string[]): void {
  try {
    if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the folds just won't persist
  }
}
