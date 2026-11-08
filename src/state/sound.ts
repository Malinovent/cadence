// Plays the sounds of src/lib/sounds.ts with Web Audio (JP, 2026-11-07). One context for the app,
// started by the first tap (iPhone needs a gesture). "Ambient" so the sounds mix with the person's
// music and follow the phone's silent switch where the browser allows it. Settings → Sounds sets the
// volume on this device, 0 for none (`cadence:ui:soundVolume`; 50 when never set).
import { gainAt, parseVolume, SOUNDS, type SoundName } from "../lib/sounds";

const KEY = "cadence:ui:sound";
const VOLUME_KEY = "cadence:ui:soundVolume"; // 0–100, 50 when never set

/** The volume, 0–100 (0 is off). Before the slider, "off" was its own setting: it reads as 0. */
export function readVolume(): number {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved === null && localStorage.getItem(KEY) === "off") return 0;
    return parseVolume(saved);
  } catch {
    return parseVolume(null);
  }
}

let volume = readVolume();

export const soundVolume = (): number => volume;
export function setSoundVolume(next: number): void {
  volume = parseVolume(String(next));
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
    localStorage.removeItem(KEY); // the old on/off: the volume says it all now
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
}

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "ambient";
    } catch {
      // older browsers: plain playback
    }
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** Start audio on the first tap or click, so later sounds (after a drop, a step) can play. */
export function unlockSoundOnFirstGesture(): () => void {
  const unlock = () => {
    if (volume > 0) context();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
}

/** Plays a sound now, or `delayMs` later (a step's sparkle follows the tick that earned it). */
export function playSound(name: SoundName, delayMs = 0): void {
  if (volume <= 0) return;
  const c = context();
  if (!c) return;
  try {
    const t0 = c.currentTime + 0.01 + delayMs / 1000;
    for (const t of SOUNDS[name]) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const start = t0 + t.at / 1000;
      const end = start + t.dur / 1000;
      osc.type = t.type;
      osc.frequency.setValueAtTime(t.freq, start);
      if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end);
      // a quick swell and a smooth fade: no clicks
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAt(t.gain, volume)), start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // audio refused (a locked context, an old browser): stay silent
  }
}
