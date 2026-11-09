import type { Lang } from "./words";

// minutes from 00:00 -> "7am", "1:30pm"; French (Canada): "7 h", "13 h 30"
export const fmtTime = (mins: number, lang: Lang = "en"): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang === "fr") return `${h} h${m ? " " + String(m).padStart(2, "0") : ""}`;
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""}${ap}`;
};

// minutes -> "2", "1.5", "0.5" (French "2", "1,5", "0,5"): hours with no unit, only in the tags
// under an area, "9.5 to go", "4.5 left" (JP, 2026-11-09: "the only place I didn't want them").
// Blocks snap to half hours, so it is nearly always a whole or a half; finer keeps two decimals.
export const fmtNum = (mins: number, lang: Lang = "en"): string => {
  const h = String(Math.round((mins / 60) * 100) / 100);
  return lang === "fr" ? h.replace(".", ",") : h;
};

// minutes -> "2h", "1.5h", "0.5h" (French « 2 h », « 1,5 h »): the way the app shows an amount of
// time everywhere else (JP, 2026-11-08: "I prefer 1.5 instead of 1h30"; 2026-11-09: keep the h)
export const fmtDur = (mins: number, lang: Lang = "en"): string =>
  lang === "fr" ? `${fmtNum(mins, "fr")} h` : `${fmtNum(mins)}h`;

/** The same as fmtDur, named for sentences read aloud and tooltips. */
export const fmtHours = fmtDur;
