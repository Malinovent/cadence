// "Continue without an account" on the sign-in page (JP, 2026-11-17). Per device, not synced:
// the page doesn't come back on this device; sign-in stays in Settings → Sync.
const KEY = "cadence:ui:signin-skipped";

export function readSignInSkipped(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSignInSkipped(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // storage unavailable: the page may show once more next time
  }
}
