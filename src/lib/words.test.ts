import { describe, expect, it } from "vitest";
import { defaultCategories, DEFAULT_CATEGORIES } from "./constants";
import { describeArea } from "./describe";
import { droppedLine, importSummaryLine } from "./format";
import { limitLabel } from "./guardrail";
import { defaultData, normalizeData } from "./model";
import { fmtLeft } from "./now";
import { isEmptyData } from "./syncLogic";
import { authErrorMessage, statusBadge, statusSentence } from "./syncUi";
import { fmtDur, fmtTime } from "./time";
import { replaceNote } from "./welcome";
import { LIB_EN } from "./words";
import { LIB_FR } from "./words.fr";

const h = (n: number) => n * 60;

describe("French (Canada) wording of the lib", () => {
  it("writes times and lengths the Quebec way", () => {
    expect(fmtTime(540, "fr")).toBe("9 h");
    expect(fmtTime(810, "fr")).toBe("13 h 30");
    expect(fmtTime(810)).toBe("1:30pm");
    expect(fmtDur(120, "fr")).toBe("2");
    expect(fmtDur(90, "fr")).toBe("1,5");
    expect(fmtDur(30, "fr")).toBe("0,5");
    expect(fmtLeft(65, LIB_FR)).toBe("encore 1,1");
    expect(fmtLeft(38, LIB_FR)).toBe("encore 38 min");
  });
  it("labels the weekly time", () => {
    expect(limitLabel({ kind: "floor", min: h(10) }, LIB_FR)).toBe("Au moins 10 h");
    expect(limitLabel({ kind: "range", min: h(4), max: h(8) }, LIB_FR)).toBe("Entre 4 h et 8 h");
    expect(limitLabel({ kind: "ceiling", max: h(40) }, LIB_FR)).toBe("Au plus 40 h");
  });
  it("describes without judging, in French too", () => {
    const rest = { ...DEFAULT_CATEGORIES[0], name: "Repos", limit: { kind: "floor" as const, min: h(8) } };
    expect(describeArea(rest, h(5), LIB_FR.describe)).toBe("Repos : sous les 8 h visées (5 h).");
  });
  it("summarises imports and sync states", () => {
    const sum = { categories: 1, blocks: 4, templates: 0, sessions: 2, streaks: 0, tasks: 3 };
    expect(importSummaryLine(sum, LIB_FR)).toBe(
      "1 domaine · 4 blocs sur les deux semaines · 0 modèle · 2 séances notées · 0 série · 3 tâches.",
    );
    expect(droppedLine(2, LIB_FR)).toBe("2 entrées ignorées : elles ne semblaient pas valides.");
    expect(statusBadge("synced", LIB_FR)?.label).toBe("synchronisé");
    expect(statusSentence("local", LIB_FR)).toBeNull();
    expect(authErrorMessage("rate_limited", LIB_FR)).toMatch(/une heure/);
    expect(replaceNote(4, LIB_FR)).toBe("Cela remplace les 4 blocs de la semaine 1.");
  });
  it("has every English key in French", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`],
      );
    expect(keys(LIB_FR).sort()).toEqual(keys(LIB_EN).sort());
  });
});

describe("default areas in the person's language", () => {
  it("names the defaults in French for a new French-speaking person, same ids", () => {
    const fr = defaultCategories("fr");
    expect(fr.map((c) => c.name)).toEqual(["Exercice", "Travail", "Apprentissage", "Loisirs"]);
    expect(fr.map((c) => c.id)).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(normalizeData({}, "fr").data.cats).toEqual(fr);
    expect(defaultData().cats).toEqual(DEFAULT_CATEGORIES);
  });
  it("counts untouched French defaults as nothing worth keeping (no sign-in conflict)", () => {
    expect(isEmptyData(defaultData("fr"))).toBe(true);
    expect(isEmptyData(defaultData("en"))).toBe(true);
  });
});

describe("one way to write time", () => {
  it("half hours read 2.5, never 2h30 (JP, 2026-11-08: \"I prefer 1.5 instead of 1h30\")", () => {
    expect(limitLabel({ kind: "floor", min: 150 }, LIB_FR)).toBe("Au moins 2,5 h");
    expect(limitLabel({ kind: "floor", min: 150 })).toBe("At least 2.5h");
  });
});
