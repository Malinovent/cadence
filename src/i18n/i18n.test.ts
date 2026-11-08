import { describe, expect, it } from "vitest";
import { en } from "./en";
import { fr } from "./fr";
import { detectLang, parseChoice, resolveLang } from "./lang";

// every path in the catalogue, with arrays and functions as leaves
const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  );

describe("French and English catalogues", () => {
  it("have exactly the same keys", () => {
    expect(keys(fr).sort()).toEqual(keys(en).sort());
  });
  it("have no empty strings, and French that isn't just the English", () => {
    const leaves = (o: object): unknown[] =>
      Object.values(o).flatMap((v) => (v && typeof v === "object" && !Array.isArray(v) ? leaves(v) : [v]));
    for (const v of [...leaves(en), ...leaves(fr)]) if (typeof v === "string") expect(v.trim()).not.toBe("");
    const same = keys(en).filter((k) => {
      const get = (o: object) => k.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown>)[p], o);
      const a = get(en);
      return typeof a === "string" && a === get(fr);
    });
    // words that are the same in both languages
    const ALLOWED = [
      "settings.langNames.en",
      "settings.langNames.fr",
      "header.nav.stats",
      "editor.description",
      "lib.lang",
      "settings.langAuto",
      "settings.looks.device",
    ];
    expect(same.filter((k) => !ALLOWED.includes(k))).toEqual([]);
  });
  it("speak to the person the same way in both: functions give text", () => {
    expect(fr.week.ticked(2, 6)).toBe("2 blocs cochés sur 6 cette semaine");
    expect(en.week.ticked(1, 1)).toBe("1 of 1 block ticked this week");
    expect(fr.tasks.showDone(1)).toBe("Voir 1 tâche faite cette semaine");
  });
});

describe("language", () => {
  it("follows the device, French first, English otherwise", () => {
    expect(detectLang(["fr-CA", "en-CA"])).toBe("fr");
    expect(detectLang(["en-US", "fr"])).toBe("en");
    expect(detectLang(["es-MX", "fr-FR"])).toBe("fr");
    expect(detectLang(["de-DE"])).toBe("en");
    expect(detectLang([])).toBe("en");
  });
  it("a choice in Settings wins over the device", () => {
    expect(resolveLang("en", ["fr-CA"])).toBe("en");
    expect(resolveLang("auto", ["fr-CA"])).toBe("fr");
    expect(parseChoice("fr")).toBe("fr");
    expect(parseChoice("de")).toBe("auto");
    expect(parseChoice(null)).toBe("auto");
  });
});
