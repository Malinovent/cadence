// The phone shows one day or the whole week (JP, 2026-11-08); remembered on this device.
const KEY = "cadence:ui:phoneView";

export type PhoneView = "day" | "week";

export function readPhoneView(): PhoneView {
  try {
    return localStorage.getItem(KEY) === "week" ? "week" : "day";
  } catch {
    return "day";
  }
}

export function writePhoneView(v: PhoneView): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // private mode: it just isn't remembered
  }
}
