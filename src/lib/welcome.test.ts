import { describe, expect, it } from "vitest";
import { replaceNote, shouldWelcome } from "./welcome";

const DAY = 86_400_000;
const now = 1_800_000_000_000;
const base = { lastEdit: now - 7 * DAY, now, dismissedFor: null, templates: 1 };

describe("welcome back", () => {
  it("shows after 7 days or more without an edit", () => {
    expect(shouldWelcome(base)).toBe(true);
    expect(shouldWelcome({ ...base, lastEdit: now - 30 * DAY })).toBe(true);
    expect(shouldWelcome({ ...base, lastEdit: now - 7 * DAY + 1 })).toBe(false);
  });
  it("never for a new user, or when there's no template to start from", () => {
    expect(shouldWelcome({ ...base, lastEdit: 0 })).toBe(false);
    expect(shouldWelcome({ ...base, templates: 0 })).toBe(false);
  });
  it("once answered, not again for the same absence; a later absence asks again", () => {
    expect(shouldWelcome({ ...base, dismissedFor: base.lastEdit })).toBe(false);
    expect(shouldWelcome({ ...base, dismissedFor: base.lastEdit - 20 * DAY })).toBe(true);
  });
  it("says what a tap replaces", () => {
    expect(replaceNote(0)).toBeNull();
    expect(replaceNote(1)).toBe("It replaces the block in Week 1.");
    expect(replaceNote(4)).toBe("It replaces the 4 blocks in Week 1.");
  });
});
