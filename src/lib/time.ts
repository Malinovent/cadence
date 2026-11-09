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

// minutes -> "2", "1.5", "0.5" (French "2", "1,5", "0,5"): the one way the app shows an amount of
// time, in hours with no unit (JP, 2026-11-08: "I prefer 1.5 instead of 1h30", then "get rid of the
// h in the numbers … just write 9.5 to go"). Blocks snap to half hours, so it is nearly always a
// whole or a half; anything finer keeps two decimals at most.
export const fmtDur = (mins: number, lang: Lang = "en"): string => {
  const h = String(Math.round((mins / 60) * 100) / 100);
  return lang === "fr" ? h.replace(".", ",") : h;
};

// the same with its unit, "9.5h" / « 9,5 h », for sentences heard or read away from the screen
// around them: screen readers and hover tooltips, where a bare "9.5" would say nothing
export const fmtHours = (mins: number, lang: Lang = "en"): string =>
  lang === "fr" ? `${fmtDur(mins, "fr")} h` : `${fmtDur(mins)}h`;
