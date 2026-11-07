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
export default function QuestFinale({
  colors,
  onClose,
  phone = false,
}: {
  colors: string[];
  onClose: () => void;
  phone?: boolean; // a size up, the button full width (JP)
}) {
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
  const big = (base: React.CSSProperties, up: React.CSSProperties): React.CSSProperties =>
    phone ? { ...base, ...up } : base;
  const spread = phone ? 21 : 17; // how far apart the squares fly
  return (
    <div style={big(S.finaleBackdrop, S.finaleBackdropPhone)} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finale-title"
        style={big(S.finaleCard, S.finaleCardPhone)}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" style={S.finaleBurst}>
          {Array.from({ length: BITS }, (_, i) => (
            <span
              key={i}
              style={{
                ...big(S.finaleBit, S.finaleBitPhone),
                background: palette[i % palette.length],
                animationDelay: `${(i % 4) * 30}ms`,
                ...({
                  "--dx": `${Math.round((i - (BITS - 1) / 2) * spread)}px`,
                  "--dy": `${-110 - (i % 3) * 30}px`,
                } as React.CSSProperties),
              }}
            />
          ))}
        </div>
        <h2 id="finale-title" style={big(S.finaleTitle, S.finaleTitlePhone)}>
          {m.checklist.allDone}
        </h2>
        <p style={big(S.finaleText, S.finaleTextPhone)}>{m.checklist.finaleBody}</p>
        <ul style={big(S.finaleList, S.finaleListPhone)}>
          {CHECK_ITEMS.map((i, k) => (
            <li key={i} style={{ ...big(S.finaleItem, S.finaleItemPhone), animationDelay: `${180 + k * 110}ms` }}>
              <span aria-hidden="true" style={big(S.finaleTick, S.finaleTickPhone)}>
                ✓
              </span>
              {m.checklist.items[i]}
            </li>
          ))}
        </ul>
        <button ref={start} type="button" style={big(S.onboardPrimary, S.finaleStartPhone)} onClick={onClose}>
          {m.checklist.finaleStart}
        </button>
      </div>
    </div>
  );
}
