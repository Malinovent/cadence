// Sounds (JP, 2026-11-07): small, soft, made on the spot (no audio files). Each is a few tones:
// when it starts (ms after the sound begins), how long it lasts, its pitch (gliding to `to`), its
// wave and how loud. Kept quiet and short so they reward without startling; off in Settings.

export type SoundName = "place" | "tick" | "untick" | "remove" | "step" | "finale" | "roll" | "fanfare";
export type Tone = {
  at: number; // ms from the start of the sound
  dur: number; // ms
  freq: number; // Hz
  to?: number; // Hz at the end: a glide
  type: "sine" | "triangle";
  gain: number; // 0..1, peak loudness
};

export const SOUNDS: Record<SoundName, readonly Tone[]> = {
  // a soft wooden tap: a block lands in the week
  place: [{ at: 0, dur: 90, freq: 520, to: 360, type: "sine", gain: 0.12 }],
  // two notes up: done
  tick: [
    { at: 0, dur: 110, freq: 660, type: "triangle", gain: 0.09 },
    { at: 70, dur: 170, freq: 990, type: "triangle", gain: 0.08 },
  ],
  // one quiet note down: not done after all
  untick: [{ at: 0, dur: 120, freq: 520, to: 390, type: "sine", gain: 0.06 }],
  // a low, soft thump: a block deleted (Undo is right there)
  remove: [{ at: 0, dur: 140, freq: 220, to: 140, type: "sine", gain: 0.1 }],
  // a little sparkle, C6 E6 G6: a getting-started step crossed off
  step: [
    { at: 0, dur: 140, freq: 1047, type: "triangle", gain: 0.06 },
    { at: 90, dur: 140, freq: 1319, type: "triangle", gain: 0.06 },
    { at: 180, dur: 260, freq: 1568, type: "triangle", gain: 0.06 },
  ],
  // five of five: up the C major chord, settling on it
  finale: [
    { at: 0, dur: 160, freq: 523, type: "triangle", gain: 0.07 },
    { at: 110, dur: 160, freq: 659, type: "triangle", gain: 0.07 },
    { at: 220, dur: 160, freq: 784, type: "triangle", gain: 0.07 },
    { at: 330, dur: 520, freq: 1047, type: "triangle", gain: 0.07 },
    { at: 330, dur: 520, freq: 659, type: "sine", gain: 0.05 },
  ],
  // roll forward: a soft turn of the page, two notes up a fourth (JP, 2026-11-08)
  roll: [
    { at: 0, dur: 140, freq: 392, to: 440, type: "sine", gain: 0.08 },
    { at: 110, dur: 220, freq: 523, type: "triangle", gain: 0.07 },
  ],
  // a balanced week: a little fanfare, G C E G up, then the C major chord
  fanfare: [
    { at: 0, dur: 120, freq: 392, type: "triangle", gain: 0.08 },
    { at: 100, dur: 120, freq: 523, type: "triangle", gain: 0.08 },
    { at: 200, dur: 120, freq: 659, type: "triangle", gain: 0.08 },
    { at: 300, dur: 160, freq: 784, type: "triangle", gain: 0.08 },
    { at: 460, dur: 500, freq: 1047, type: "triangle", gain: 0.08 },
    { at: 460, dur: 500, freq: 659, type: "sine", gain: 0.06 },
    { at: 460, dur: 500, freq: 523, type: "sine", gain: 0.05 },
  ],
};

/** The volume setting, 0–100; 50 plays the tones as designed (JP, 2026-11-08). */
export const DEFAULT_VOLUME = 50;
export function parseVolume(raw: string | null): number {
  const v = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : DEFAULT_VOLUME;
}
/** A tone's peak loudness at this volume: 50 as designed, 100 twice as loud, 0 silent. */
export const gainAt = (gain: number, volume: number): number => (gain * volume) / DEFAULT_VOLUME;

/** How long a sound lasts, in ms. */
export const soundLength = (tones: readonly Tone[]): number => Math.max(0, ...tones.map((t) => t.at + t.dur));
