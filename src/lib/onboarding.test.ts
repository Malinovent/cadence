import { describe, expect, it } from "vitest";
import { placeBlock, updateCat } from "./actions";
import { defaultCategories } from "./constants";
import { defaultData } from "./model";
import { relabelDefaults, shouldOnboard } from "./onboarding";
import { addTask } from "./tasks";

describe("who sees the onboarding", () => {
  const fresh = { seen: false, lastEdit: 0, data: defaultData() };

  it("a new person, in either language", () => {
    expect(shouldOnboard(fresh)).toBe(true);
    expect(shouldOnboard({ ...fresh, data: defaultData("fr") })).toBe(true);
  });
  it("never someone who has seen it, edited, or has anything saved", () => {
    expect(shouldOnboard({ ...fresh, seen: true })).toBe(false);
    expect(shouldOnboard({ ...fresh, lastEdit: 1 })).toBe(false);
    expect(shouldOnboard({ ...fresh, data: placeBlock(defaultData(), 0, "work", 0, 540) })).toBe(false);
    expect(shouldOnboard({ ...fresh, data: addTask(defaultData(), "Call the dentist") })).toBe(false);
    expect(shouldOnboard({ ...fresh, data: updateCat(defaultData(), "work", { name: "Job" }) })).toBe(false);
  });
});

describe("default areas follow a language change", () => {
  it("renames untouched defaults to the chosen language", () => {
    expect(relabelDefaults(defaultData("en"), "fr").cats).toEqual(defaultCategories("fr"));
    expect(relabelDefaults(defaultData("fr"), "en").cats).toEqual(defaultCategories("en"));
  });
  it("leaves areas alone once anyone touched them, or when they're already in that language", () => {
    const renamed = updateCat(defaultData("en"), "work", { name: "Job" });
    expect(relabelDefaults(renamed, "fr")).toBe(renamed);
    const fr = defaultData("fr");
    expect(relabelDefaults(fr, "fr")).toBe(fr);
  });
  it("only touches the areas, never the week", () => {
    const d = placeBlock(defaultData("en"), 0, "work", 0, 540, undefined, { uid: () => "b" });
    const out = relabelDefaults(d, "fr");
    expect(out.weeks).toBe(d.weeks);
    expect(out.cats.find((c) => c.id === "work")?.name).toBe("Travail");
  });
});
