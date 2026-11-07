// Onboarding (JP, 2026-11-07): three short screens for new people only, each one skippable.
// 1) what the app is, 2) start from a starter week or an empty one, 3) how it works.
// Seen once per device; it can be replayed from Settings → About.
import { defaultCategories } from "./constants";
import type { CadenceData } from "./model";
import { isEmptyData, jsonEqual } from "./syncLogic";
import type { Lang } from "./words";

export const ONBOARD_STEPS = 3;

/**
 * New people only: never edited on this device, nothing saved worth keeping (untouched default
 * areas in either language count as nothing), and not seen here before. JP's friend, or anyone
 * with a week, never gets it.
 */
export const shouldOnboard = ({
  seen,
  lastEdit,
  data,
}: {
  seen: boolean;
  lastEdit: number;
  data: CadenceData;
}): boolean => !seen && lastEdit === 0 && isEmptyData(data);

/**
 * The person picked a language while the areas are still the untouched defaults of the other one:
 * the defaults follow (Exercice ↔ Exercise…). Areas anyone has touched never change.
 */
export function relabelDefaults(data: CadenceData, lang: Lang): CadenceData {
  const other: Lang = lang === "fr" ? "en" : "fr";
  return jsonEqual(data.cats, defaultCategories(other)) ? { ...data, cats: defaultCategories(lang) } : data;
}
