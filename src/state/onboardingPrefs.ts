// Onboarding: whether this device has finished or skipped it. Per device, not synced: a new
// device of someone who already uses the app has their data after signing in, so it won't ask.
const KEY = "cadence:ui:onboarded";

export function readOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // storage unavailable: it may show once more
  }
}
