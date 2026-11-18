import { describe, expect, it } from "vitest";
import { shouldShowSignIn } from "./signInGate";

const base = { configured: true, ready: true, signedIn: false, skipped: false, recovery: false };

describe("shouldShowSignIn: the app opens on sign-in when signed out (JP, 2026-11-17)", () => {
  it("shows for someone signed out who hasn't skipped it on this device", () => {
    expect(shouldShowSignIn(base)).toBe(true);
  });
  it("never flashes while the saved session is still being restored (or coming back from Google)", () => {
    expect(shouldShowSignIn({ ...base, ready: false })).toBe(false);
  });
  it("hides when signed in, skipped, or when the app has no accounts at all", () => {
    expect(shouldShowSignIn({ ...base, signedIn: true })).toBe(false);
    expect(shouldShowSignIn({ ...base, skipped: true })).toBe(false);
    expect(shouldShowSignIn({ ...base, configured: false })).toBe(false);
  });
  it("arriving from a reset link always shows it (to choose the new password), even if skipped or signed in", () => {
    expect(shouldShowSignIn({ ...base, recovery: true, skipped: true, signedIn: true })).toBe(true);
    expect(shouldShowSignIn({ ...base, recovery: true, ready: false })).toBe(false);
  });
});
