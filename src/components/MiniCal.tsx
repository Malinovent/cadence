import type React from "react";
import { BUFFER_COLOR } from "../lib/constants";
import type { Block, Category } from "../lib/model";
import type { Bounds } from "../lib/placement";
import { miniBounds } from "../lib/templatePreview";
import { S } from "../styles";
import { AreaIconView } from "./AreaIconView";

/**
 * A week (or a day) in miniature: one column per day, blocks as bars in their area's colour with
 * its icon when there's room (JP, 2026-11-08). Used by the template preview and the phone's week
 * view. Without `onBlock` / `onDay` it is a picture; with them, bars and days are buttons.
 */
export default function MiniCal({
  blocks,
  cats,
  days,
  height,
  hours,
  heads,
  onBlock,
  onDay,
  dayLabel,
  today,
}: {
  blocks: readonly Block[];
  cats: readonly Category[];
  days: readonly number[];
  height: number;
  hours: Bounds;
  /** the column titles (short day names), or none */
  heads?: readonly string[];
  onBlock?: (b: Block) => void;
  onDay?: (day: number) => void;
  /** the accessible name of a day button */
  dayLabel?: (day: number) => string;
  today?: number | null;
}) {
  const [from, to] = miniBounds(blocks, hours);
  const scale = height / Math.max(60, to - from);
  const catOf = (id: string) => cats.find((c) => c.id === id);
  const hoursMarks: number[] = [];
  for (let t = Math.ceil(from / 300) * 300; t < to; t += 300) if (t > from) hoursMarks.push(t);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${heads ? "22px " : ""}repeat(${days.length}, minmax(0, 1fr))`,
        gap: 3,
      }}
    >
      {heads && (
        <>
          <span />
          {days.map((d) =>
            onDay ? (
              <button
                key={d}
                type="button"
                onClick={() => onDay(d)}
                aria-label={dayLabel?.(d)}
                style={{ ...S.miniHead, ...(today === d ? S.miniHeadToday : {}) }}
              >
                {heads[d]}
              </button>
            ) : (
              <span key={d} style={{ ...S.miniHead, ...(today === d ? S.miniHeadToday : {}) }}>
                {heads[d]}
              </span>
            ),
          )}
          <span style={{ position: "relative", height }} aria-hidden="true">
            {hoursMarks.map((t) => (
              <span key={t} style={{ ...S.miniHour, top: (t - from) * scale - 6 }}>
                {t / 60}
              </span>
            ))}
          </span>
        </>
      )}
      {days.map((d) => {
        const column = (
          <>
            {hoursMarks.map((t) => (
              <span key={t} aria-hidden="true" style={{ ...S.miniRule, top: (t - from) * scale }} />
            ))}
            {blocks
              .filter((b) => b.day === d)
              .map((b) => {
                const own = b.catIds.map(catOf).filter((c): c is Category => !!c);
                const color = b.buffer ? BUFFER_COLOR : (own[0]?.color ?? "#999");
                const box: React.CSSProperties = {
                  ...S.miniBar,
                  top: (b.start - from) * scale,
                  height: Math.max(4, b.mins * scale - 1),
                  background: b.buffer ? "transparent" : color,
                  border: b.buffer ? `1px dashed ${color}` : "none",
                  borderLeft: own[1] ? `3px solid ${own[1].color}` : undefined,
                  opacity: b.done ? 0.55 : 1,
                };
                const icon =
                  own.length === 1 && own[0].icon && b.mins * scale >= 16 ? (
                    <AreaIconView icon={own[0].icon} size={12} style={{ color: "#fff" }} />
                  ) : null;
                const name = b.buffer ? "" : own.map((c) => c.name).join(" + ");
                return onBlock ? (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBlock(b);
                    }}
                    aria-label={`${name || b.label} ${b.done ? "✓" : ""}`.trim()}
                    style={{ ...box, padding: 0, cursor: "pointer" }}
                  >
                    {icon}
                  </button>
                ) : (
                  <span key={b.id} style={box} title={name}>
                    {icon}
                  </span>
                );
              })}
          </>
        );
        return onDay ? (
          <div key={d} onClick={() => onDay(d)} style={{ ...S.miniCol, height, cursor: "pointer" }} data-day={d}>
            {column}
          </div>
        ) : (
          <div key={d} style={{ ...S.miniCol, height }}>
            {column}
          </div>
        );
      })}
    </div>
  );
}
