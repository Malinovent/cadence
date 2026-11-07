import { useEffect, useState } from "react";
import { keyboardInset } from "../lib/sheet";

export type Keyboard = { inset: number; height: number };

/** How far the on-screen keyboard covers the bottom of the screen, and the height left above it. */
function readKeyboard(): Keyboard {
  if (typeof window === "undefined") return { inset: 0, height: 0 };
  const vv = window.visualViewport;
  return vv
    ? { inset: keyboardInset(window.innerHeight, vv.height, vv.offsetTop), height: vv.height }
    : { inset: 0, height: window.innerHeight };
}

/**
 * The on-screen keyboard, from the visual viewport (JP, 2026-11-07): what sits at the bottom of the
 * screen (the block sheet, the phone tray) rises by `inset` so the keyboard never covers it.
 */
export function useKeyboard(): Keyboard {
  const [kb, setKb] = useState(readKeyboard);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () =>
      setKb((k) => {
        const next = readKeyboard();
        return next.inset === k.inset && next.height === k.height ? k : next;
      });
    vv.addEventListener("resize", on);
    vv.addEventListener("scroll", on);
    return () => {
      vv.removeEventListener("resize", on);
      vv.removeEventListener("scroll", on);
    };
  }, []);
  return kb;
}
