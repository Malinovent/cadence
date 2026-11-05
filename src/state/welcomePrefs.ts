// S1.7: the absence the welcome-back prompt was last answered for (the last-edit time it was
// shown for), so "Not now" isn't asked again until the next 7-day gap. Per device, not synced.
const KEY = "cadence:ui:welcomeAnswered";

export function readWelcomeAnswered(): number | null {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeWelcomeAnswered(lastEdit: number): void {
  try {
    localStorage.setItem(KEY, String(lastEdit));
  } catch {
    // storage unavailable: it may ask once more next time
  }
}
