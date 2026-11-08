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

// minutes -> "2h", "2h30", "45m"; French: "2 h", "2 h 30", "45 min". The one way the app writes
// an amount of time (JP, 2026-11-08: "2h30 to go … 2.5 as notation … consistency"); nothing is "0m"
export const fmtDur = (mins: number, lang: Lang = "en"): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (mins === 0) return lang === "fr" ? "0 h" : "0h";
  if (lang === "fr") return h ? `${h} h${m ? " " + String(m).padStart(2, "0") : ""}` : `${m} min`;
  if (h && m) return `${h}h${m}`;
  if (h) return `${h}h`;
  return `${m}m`;
};
