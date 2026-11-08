// How a ticked block looks (JP, 2026-11-08: "a setting that can toggle this solid color versus
// transparent"): "soft", the area's light tint with ink text (the default since sprint 1), or
// "solid", filled with the area's colour and white text, the first version's look (JP: "make them
// match the colors we had in the first iteration"; legacy/cadence.html).

export type DoneStyle = "soft" | "solid";
export const DONE_STYLES: readonly DoneStyle[] = ["soft", "solid"];

export const parseDoneStyle = (v: unknown): DoneStyle => (v === "solid" ? "solid" : "soft");

/** The first version's solid block: white text, the duration a little softer, a see-through tick. */
export const SOLID_TEXT = "#fff";
export const SOLID_TEXT_SOFT = "rgba(255,255,255,0.85)";
export const SOLID_TICK = "rgba(255,255,255,0.25)";
/** Soft: the area's colour at ~18% over the card, as an 8-digit hex alpha */
export const SOFT_TINT = "2e";
