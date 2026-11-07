import { describe, expect, it } from "vitest";
import { blockWhen, keyboardInset } from "./sheet";
import { LIB_FR } from "./words.fr";

describe("the phone block sheet", () => {
  it("rises by what the keyboard covers, and sits at the bottom without it", () => {
    expect(keyboardInset(812, 812, 0)).toBe(0);
    expect(keyboardInset(812, 476, 0)).toBe(336);
    expect(keyboardInset(812, 476, 40)).toBe(296); // the page scrolled under the keyboard
    expect(keyboardInset(812, 900, 0)).toBe(0); // never below the bottom
  });
  it("says the block's day and time", () => {
    expect(blockWhen({ day: 2, start: 540, mins: 120 })).toBe("Wed · 9am–11am");
    expect(blockWhen({ day: 2, start: 540, mins: 90 }, LIB_FR)).toBe("mer. · 9 h–10 h 30");
  });
});
