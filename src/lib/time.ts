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

// minutes -> "2h", "2h30", "45m"; French: "2 h", "2 h 30", "45 min"
export const fmtDur = (mins: number, lang: Lang = "en"): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang === "fr") return h ? `${h} h${m ? " " + String(m).padStart(2, "0") : ""}` : `${m} min`;
  if (h && m) return `${h}h${m}`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// a one-decimal hours string ("3.0") for the stats bars: "3.0h"; French: "3,0 h"
export const fmtHours = (hours: string, lang: Lang = "en"): string =>
  lang === "fr" ? `${hours.replace(".", ",")} h` : `${hours}h`;
