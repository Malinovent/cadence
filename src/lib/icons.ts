// Area icons (JP, 2026-11-08): an area may carry one icon from this set, drawn in its colour on its
// chip, its blocks and in Stats. Optional; areas without one look as before. Stored by name in
// `cadence:cats` (`icon`), so a name not in this list is simply ignored.

export const AREA_ICONS = [
  "moon",
  "bed",
  "briefcase",
  "users",
  "heart",
  "dumbbell",
  "bike",
  "book",
  "brain",
  "palette",
  "music",
  "home",
  "leaf",
  "coffee",
  "utensils",
  "cart",
  "code",
  "pen",
  "camera",
  "gamepad",
  "baby",
  "paw",
  "plane",
  "sparkles",
] as const;

export type AreaIcon = (typeof AREA_ICONS)[number];

export const isAreaIcon = (v: unknown): v is AreaIcon =>
  typeof v === "string" && (AREA_ICONS as readonly string[]).includes(v);
