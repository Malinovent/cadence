import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { hoursText } from "../lib/review";
import type { Preview } from "../lib/templatePreview";
import type { Bounds } from "../lib/placement";
import { S } from "../styles";
import { AreaMark } from "./AreaIconView";
import MiniCal from "./MiniCal";

/**
 * Before a template, a starter week or a day template is used (JP, 2026-11-08): what it will do.
 * The result in miniature, hours per area, the areas it adds, what it replaces; "Use it" or Cancel.
 * A day template also asks which day. Escape or a tap outside cancels.
 */
export default function TemplatePreview({
  title,
  where,
  replaces,
  preview,
  addedNote,
  hours,
  day,
  onDay,
  onUse,
  onCancel,
  phone = false,
}: {
  title: string;
  /** "Into Week 1" / "Into Wednesday, Week 1" */
  where: string;
  /** "Replaces the 9 blocks in Week 1. You can undo." */
  replaces: string;
  preview: Preview;
  addedNote: string | null;
  hours: Bounds;
  /** a day template: the day it goes on, and changing it */
  day?: number;
  onDay?: (day: number) => void;
  onUse: () => void;
  onCancel: () => void;
  phone?: boolean;
}) {
  const { m } = useI18n();
  const use = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });
  useEffect(() => {
    use.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const isDay = day !== undefined;
  return (
    <div style={{ ...S.finaleBackdrop, ...(phone ? S.finaleBackdropPhone : {}) }} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        style={{ ...S.finaleCard, ...(phone ? S.finaleCardPhone : {}), ...S.previewCard }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="preview-title" style={S.previewTitle}>
            {title}
          </h2>
          <p style={S.previewWhere}>{where}</p>
        </div>
        {isDay && onDay && (
          <div role="group" aria-label={m.footer.whichDay} style={S.previewDays}>
            {m.lib.days.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={day === i}
                aria-label={m.preview.days[i]}
                onClick={() => onDay(i)}
                style={{ ...S.previewDay, ...(day === i ? S.kindBtnActive : {}) }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        {preview.blocks.length ? (
          <MiniCal
            blocks={preview.blocks}
            cats={preview.cats}
            days={isDay ? [day] : [0, 1, 2, 3, 4, 5, 6]}
            height={isDay ? 150 : 110}
            hours={hours}
            heads={isDay ? undefined : m.lib.days}
          />
        ) : (
          <p style={S.previewWhere}>{m.preview.empty}</p>
        )}
        {preview.rows.length > 0 && (
          <ul style={S.previewRows}>
            {preview.rows.map((r) => (
              <li key={r.catId} style={S.previewRow}>
                <AreaMark icon={r.icon} color={r.color} />
                <span style={S.reviewName}>{r.name}</span>
                <span style={S.reviewHours}>{hoursText(r.mins, m.lib)} h</span>
              </li>
            ))}
          </ul>
        )}
        {addedNote && <p style={S.previewNote}>{addedNote}</p>}
        <p style={S.previewNote}>{replaces}</p>
        <div style={S.previewBtns}>
          <button ref={use} type="button" style={{ ...S.onboardPrimary, marginLeft: 0, flex: 1 }} onClick={onUse}>
            {m.preview.use}
          </button>
          <button type="button" style={{ ...S.resetCancel, flex: 1, minHeight: 44 }} onClick={onCancel}>
            {m.preview.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
