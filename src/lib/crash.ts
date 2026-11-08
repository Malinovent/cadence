// The crash screen's "Download my data" (JP, 2026-11-07): when the app can't draw, the stored keys
// are saved exactly as they are, without parsing them, so even data that tripped the app comes out
// whole. Import (Settings → Your data) reads this shape: a flat object keyed by the storage keys.
import { STORAGE_KEYS } from "./storage";

/** The stored data as a backup file's text, from `read` (localStorage.getItem); keys never saved are left out. */
export function crashBackup(read: (key: string) => string | null): string {
  const out: Record<string, string> = {};
  for (const key of Object.values(STORAGE_KEYS)) {
    let v: string | null = null;
    try {
      v = read(key);
    } catch {
      v = null; // storage refused: nothing to copy for this key
    }
    if (v !== null) out[key] = v;
  }
  return JSON.stringify(out, null, 2);
}
