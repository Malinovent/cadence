import { describe, expect, it } from "vitest";
import { updateCat } from "./actions";
import { AREA_ICONS, isAreaIcon } from "./icons";
import { defaultData, normalizeData } from "./model";

describe("area icons", () => {
  it("are optional: the default areas have none, as before", () => {
    expect(defaultData().cats.some((c) => "icon" in c)).toBe(false);
  });
  it("survive a reload; a name not in the set is dropped, the area kept", () => {
    const d = updateCat(defaultData(), "work", { icon: "briefcase" });
    const back = normalizeData(JSON.parse(JSON.stringify(d))).data;
    expect(back.cats.find((c) => c.id === "work")?.icon).toBe("briefcase");
    const odd = normalizeData({ ...d, cats: d.cats.map((c) => ({ ...c, icon: "<script>" })) }).data;
    expect(odd.cats).toHaveLength(d.cats.length);
    expect(odd.cats.some((c) => "icon" in c)).toBe(false);
  });
  it("can be taken off again", () => {
    const d = updateCat(updateCat(defaultData(), "work", { icon: "briefcase" }), "work", { icon: undefined });
    expect(normalizeData(JSON.parse(JSON.stringify(d))).data.cats.find((c) => c.id === "work")?.icon).toBeUndefined();
  });
  it("is a fixed, known set", () => {
    expect(AREA_ICONS.length).toBe(new Set(AREA_ICONS).size);
    expect(isAreaIcon("moon")).toBe(true);
    expect(isAreaIcon("Moon")).toBe(false);
  });
});
