import type React from "react";
import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { CHECK_ITEMS } from "../lib/guide";
import { doneGreen, S } from "../styles";

const BITS = 14;

/**
 * Five of five (JP, 2026-11-07): the one moment that earns a card of its own. The five steps land
 * one by one and small squares in the person's area colours rise from it (none under reduced
 * motion: at rest they're hidden). "Start planning", Escape or a tap outside closes it, and the
 * checklist with it.
 */
export default function QuestFinale({ colors, onClose }: { colors: string[]; onClose: () => void }) {
  const { m } = useI18n();
  const start = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    start.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        e.preventDefault(); // one control: focus stays on it
        start.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const palette = colors.length ? colors : [doneGreen];
  return (
    <div style={S.finaleBackdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finale-title"
        style={S.finaleCard}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" style={S.finaleBurst}>
          {Array.from({ length: BITS }, (_, i) => (
            <span
              key={i}
              style={{
                ...S.finaleBit,
                background: palette[i % palette.length],
                animationDelay: `${(i % 4) * 30}ms`,
                ...({
                  "--dx": `${Math.round((i - (BITS - 1) / 2) * 17)}px`,
                  "--dy": `${-110 - (i % 3) * 30}px`,
                } as React.CSSProperties),
              }}
            />
          ))}
        </div>
        <h2 id="finale-title" style={S.finaleTitle}>
          {m.checklist.allDone}
        </h2>
        <p style={S.finaleText}>{m.checklist.finaleBody}</p>
        <ul style={S.finaleList}>
          {CHECK_ITEMS.map((i, k) => (
            <li key={i} style={{ ...S.finaleItem, animationDelay: `${180 + k * 110}ms` }}>
              <span aria-hidden="true" style={S.finaleTick}>
                ✓
              </span>
              {m.checklist.items[i]}
            </li>
          ))}
        </ul>
        <button ref={start} type="button" style={S.onboardPrimary} onClick={onClose}>
          {m.checklist.finaleStart}
        </button>
      </div>
    </div>
  );
}
