import type React from "react";
import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";
import type { WeekReview as Review } from "../lib/review";
import { doneGreen, S } from "../styles";

const BITS = 16;

/**
 * Roll forward (JP, 2026-11-08): how the week that just ended went, area by area, in neutral words.
 * A balanced week gets its headline, a fanfare (App) and squares rising in the area colours; any
 * other week simply says it's done. Undo stays in its bar underneath. Escape, a tap outside or the
 * button closes it.
 */
export default function WeekReview({
  review,
  onClose,
  phone = false,
}: {
  review: Review;
  onClose: () => void;
  phone?: boolean;
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
        e.preventDefault();
        start.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const big = (base: React.CSSProperties, up: React.CSSProperties): React.CSSProperties =>
    phone ? { ...base, ...up } : base;
  const colors = review.lines.map((l) => l.color);
  return (
    <div style={big(S.finaleBackdrop, S.finaleBackdropPhone)} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        style={big(S.finaleCard, S.finaleCardPhone)}
        onClick={(e) => e.stopPropagation()}
      >
        {review.balanced && (
          <div aria-hidden="true" style={S.finaleBurst}>
            {Array.from({ length: BITS }, (_, i) => (
              <span
                key={i}
                style={{
                  ...big(S.finaleBit, S.finaleBitPhone),
                  background: colors.length ? colors[i % colors.length] : doneGreen,
                  animationDelay: `${(i % 4) * 30}ms`,
                  ...({
                    "--dx": `${Math.round((i - (BITS - 1) / 2) * (phone ? 19 : 16))}px`,
                    "--dy": `${-110 - (i % 3) * 30}px`,
                  } as React.CSSProperties),
                }}
              />
            ))}
          </div>
        )}
        <h2 id="review-title" style={big(S.finaleTitle, S.finaleTitlePhone)}>
          {review.balanced ? m.review.balanced : m.review.done}
        </h2>
        <p style={S.reviewTicked}>{m.review.ticked(review.ticked, review.total)}</p>
        <ul style={big(S.finaleList, S.finaleListPhone)}>
          {review.lines.map((l, k) => (
            <li
              key={l.catId}
              aria-label={l.text}
              style={{ ...big(S.finaleItem, S.finaleItemPhone), animationDelay: `${120 + k * 90}ms` }}
            >
              <span aria-hidden="true" style={{ ...S.dot, background: l.color, flexShrink: 0 }} />
              <span style={S.reviewName}>{l.name}</span>
              <span style={S.reviewHours}>{l.hours} h</span>
              <span style={S.reviewLimit}>{l.limit}</span>
              <span aria-hidden="true" style={{ ...S.reviewKept, visibility: l.kept ? "visible" : "hidden" }}>
                ✓
              </span>
            </li>
          ))}
        </ul>
        <button ref={start} type="button" style={big(S.onboardPrimary, S.finaleStartPhone)} onClick={onClose}>
          {m.review.start}
        </button>
      </div>
    </div>
  );
}
