// The app's look per device (Settings → Look, JP 2026-11-08): `cadence:ui:theme`. Applied as
// <html data-theme>, which picks the palette's CSS variables (styles.ts FONT_IMPORT).
import { PALETTES, parseTheme, resolveTheme, type ThemeChoice } from "../lib/theme";

const KEY = "cadence:ui:theme";
const DARK = "(prefers-color-scheme: dark)";

export function readTheme(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(KEY));
  } catch {
    return "paper";
  }
}

export function writeTheme(choice: ThemeChoice): void {
  try {
    if (choice === "paper") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // storage unavailable: the look lasts until the page closes
  }
}

const deviceDark = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.(DARK).matches;

let stopFollowing: (() => void) | null = null;

/** Draws the app in this look now; "device" keeps following the device's light/dark setting. */
export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const draw = () => {
    const t = resolveTheme(choice, deviceDark());
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", PALETTES[t].paper);
  };
  draw();
  stopFollowing?.();
  stopFollowing = null;
  if (choice === "device" && window.matchMedia) {
    const mq = window.matchMedia(DARK);
    mq.addEventListener?.("change", draw);
    stopFollowing = () => mq.removeEventListener?.("change", draw);
  }
}
