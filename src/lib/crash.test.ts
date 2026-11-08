import { describe, expect, it } from "vitest";
import { crashBackup } from "./crash";
import { defaultData } from "./model";
import { parseImport } from "./transfer";

describe("the crash screen's backup", () => {
  it("copies the stored keys as they are, and import reads it back", () => {
    const d = defaultData();
    const stored: Record<string, string> = {
      "cadence:cats": JSON.stringify(d.cats),
      "cadence:weeks": JSON.stringify([
        [{ id: "b", day: 1, start: 540, mins: 60, label: "", desc: "", done: false, catIds: ["work"] }],
        [],
      ]),
      "cadence:ui:lang": "fr", // not data: left out
    };
    const text = crashBackup((k) => stored[k] ?? null);
    const flat = JSON.parse(text) as Record<string, string>;
    expect(Object.keys(flat).sort()).toEqual(["cadence:cats", "cadence:weeks"]);
    expect(flat["cadence:cats"]).toBe(stored["cadence:cats"]);
    const back = parseImport(text);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.data.weeks[0].map((b) => b.id)).toEqual(["b"]);
  });
  it("keeps going when storage refuses a key", () => {
    const text = crashBackup((k) => {
      if (k === "cadence:cats") throw new Error("denied");
      return k === "cadence:tasks" ? "[]" : null;
    });
    expect(JSON.parse(text)).toEqual({ "cadence:tasks": "[]" });
  });
});
