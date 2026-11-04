import type { Category } from "./model";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_START = 7 * 60; // 7:00
export const DAY_END = 23 * 60; // 23:00
export const ROW_H = 26; // fixed pixel height per 30-min slot row (desktop)
export const ROW_H_PHONE = 40; // phone one-day view (< 900px)
export const STEP = 30; // fixed: 30-minute slots
export const SNAP_THRESHOLD = 25; // minutes — within this, snap to a neighbor edge

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: "exercise", name: "Exercise", color: "#E8643C", targetMins: 240, blockMins: 120, limit: { kind: "floor", min: 240 } },
  { id: "work", name: "Work", color: "#3C6FE8", targetMins: 1200, blockMins: 240, limit: { kind: "floor", min: 1200 } },
  { id: "learn", name: "Learn", color: "#1FA98A", targetMins: 240, blockMins: 60, limit: { kind: "floor", min: 240 } },
  { id: "play", name: "Play", color: "#C9A227", targetMins: 240, blockMins: 120, limit: { kind: "floor", min: 240 } },
];

// colours handed out (in order, cycling) to new categories
export const PALETTE = ["#E8643C", "#3C6FE8", "#1FA98A", "#C9A227", "#9B4DCA", "#D6336C", "#0CA678"] as const;
