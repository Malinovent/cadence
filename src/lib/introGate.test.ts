import { describe, expect, it } from "vitest";
import { shouldShowIntro } from "./introGate";

const base = { intro: true, signInShown: false, ready: true, signedIn: false, syncing: false };

describe("shouldShowIntro: the intro page waits for sign-in and the first sync", () => {
  it("shows for a new person once nothing else is in the way", () => {
    expect(shouldShowIntro(base)).toBe(true);
  });
  it("not for someone who isn't new", () => {
    expect(shouldShowIntro({ ...base, intro: false })).toBe(false);
  });
  it("waits while the sign-in page is up or the saved session isn't known yet", () => {
    expect(shouldShowIntro({ ...base, signInShown: true })).toBe(false);
    expect(shouldShowIntro({ ...base, ready: false })).toBe(false);
  });
  it("just signed in on a new device: waits while the account's weeks come down", () => {
    expect(shouldShowIntro({ ...base, signedIn: true, syncing: true })).toBe(false);
    expect(shouldShowIntro({ ...base, signedIn: true, syncing: false })).toBe(true);
  });
});
