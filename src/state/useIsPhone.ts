import { useSyncExternalStore } from "react";

// "phone" = viewport narrower than 900px, the same breakpoint as the .cadence-* stacking CSS
// in styles.ts FONT_IMPORT (SPEC "Phase 3 design").
export const PHONE_QUERY = "(max-width: 899px)";

const query = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(PHONE_QUERY) : null;

const subscribe = (onChange: () => void): (() => void) => {
  const mq = query();
  if (!mq) return () => {};
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const getSnapshot = (): boolean => query()?.matches ?? false;
const getServerSnapshot = (): boolean => false;

// true on phone-width viewports; follows resizes and rotation
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
