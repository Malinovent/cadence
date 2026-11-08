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
 * Saving a week or a day uses it too (JP, 2026-11-08): what's saved, its name, which day; "Save".
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
  dayDisabled,
  name,
  useLabel,
  useDisabled = false,
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
  /** days that can't be picked (saving: days without blocks) */
  dayDisabled?: (day: number) => boolean;
  /** saving: the template's name, empty for the placeholder's */
  name?: { value: string; placeholder: string; onChange: (v: string) => void };
  useLabel?: string;
  useDisabled?: boolean;
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
                disabled={dayDisabled?.(i)}
                onClick={() => onDay(i)}
                style={{
                  ...S.previewDay,
                  ...(day === i ? S.kindBtnActive : {}),
                  ...(dayDisabled?.(i) ? { opacity: 0.35, cursor: "not-allowed" } : {}),
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        {name && (
          <input
            value={name.value}
            placeholder={name.placeholder}
            aria-label={m.footer.templateNameLabel}
            onChange={(e) => name.onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !useDisabled) onUse();
            }}
            style={{ ...S.tplNameInput, flex: "none" }}
          />
        )}
        {preview.blocks.length ? (
          // a day keeps a day's width, not the card's (JP, 2026-11-08)
          <div style={isDay ? S.previewDayCal : undefined}>
            <MiniCal
              blocks={preview.blocks}
              cats={preview.cats}
              days={isDay ? [day] : [0, 1, 2, 3, 4, 5, 6]}
              height={isDay ? 150 : 110}
              hours={hours}
              heads={isDay ? undefined : m.lib.days}
            />
          </div>
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
          <button
            ref={use}
            type="button"
            disabled={useDisabled}
            style={{ ...S.onboardPrimary, marginLeft: 0, flex: 1, ...(useDisabled ? { opacity: 0.4 } : {}) }}
            onClick={onUse}
          >
            {useLabel ?? m.preview.use}
          </button>
          <button type="button" style={{ ...S.resetCancel, flex: 1, minHeight: 44 }} onClick={onCancel}>
            {m.preview.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
