// S1.9: which language to show. The device's language (navigator.languages), unless the person
// picked one in Settings (saved on this device, never synced). French first: a French-speaking
// device gets French; any other language that isn't English falls back to English.
import type { Lang } from "../lib/words";
import { en, type Messages } from "./en";
import { fr } from "./fr";

export type { Lang };
export type LangChoice = Lang | "auto";

export const MESSAGES: Record<Lang, Messages> = { en, fr };

/** BCP 47 tags for dates and numbers: Canada. */
export const LOCALE: Record<Lang, string> = { en: "en-CA", fr: "fr-CA" };

/** The first of the device's languages that we have; English when none. */
export function detectLang(deviceLangs: readonly string[]): Lang {
  for (const l of deviceLangs) {
    const base = l.toLowerCase().split("-")[0];
    if (base === "fr" || base === "en") return base;
  }
  return "en";
}

export const resolveLang = (choice: LangChoice, deviceLangs: readonly string[]): Lang =>
  choice === "auto" ? detectLang(deviceLangs) : choice;

/** French off for now (JP, 2026-11-17): flip to true to bring it back; fr.ts stays up to date. */
export const FRENCH_ON = false;
/** The languages shown; the pickers hide while there is only one. */
export const LANGS_ON: readonly Lang[] = FRENCH_ON ? ["fr", "en"] : ["en"];

/** The language to show: the choice or the device's, if it's on; otherwise the first one on. */
export function pickLang(choice: LangChoice, deviceLangs: readonly string[], on: readonly Lang[] = LANGS_ON): Lang {
  const l = resolveLang(choice, deviceLangs);
  return on.includes(l) ? l : on[0];
}

export const parseChoice = (raw: string | null): LangChoice => (raw === "fr" || raw === "en" ? raw : "auto");

const KEY = "cadence:ui:lang";

export function readLangChoice(): LangChoice {
  try {
    return parseChoice(localStorage.getItem(KEY));
  } catch {
    return "auto";
  }
}

export function writeLangChoice(choice: LangChoice): void {
  try {
    if (choice === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
}

export const deviceLangs = (): readonly string[] =>
  typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language ?? ""];

/** The language the app opens in (also names a new person's default areas). */
export const startLang = (): Lang => pickLang(readLangChoice(), deviceLangs());
