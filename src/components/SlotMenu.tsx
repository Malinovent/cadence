import type React from "react";
import type { Bounds } from "../lib/placement";
import { AreaMark } from "./AreaIconView";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Block, Category } from "../lib/model";
import { menuPosition, pickPlacement, slotOptions, type SlotTap } from "../lib/slotMenu";
import { fmtTime } from "../lib/time";
import { BUFFER_COLOR } from "../lib/constants";
import { withAlpha } from "../lib/gesture";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  tap: SlotTap;
  blocks: Block[];
  cats: Category[];
  phone: boolean;
  bounds?: Bounds; // the hours the calendar shows (Settings → Your day)
  onPick: (catId: string) => void;
  onClose: () => void;
};

/**
 * S1.6: tap or click empty time. Desktop: a small window beside the slot; phone: a floating sheet.
 * One tap on an area (or the buffer) places its usual length there (nearest free spot, shrunk to
 * fit, like a drop) and closes; the person resizes it in the calendar. Escape, ✕ or a tap outside
 * closes with nothing changed.
 */
export default function SlotMenu({ tap, blocks, cats, phone, bounds, onPick, onClose }: Props) {
  const { m, lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // desktop: measure, then sit beside the tapped point inside the viewport
  useLayoutEffect(() => {
    if (phone || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos(menuPosition(tap, { w: r.width, h: r.height }, { w: window.innerWidth, h: window.innerHeight }));
  }, [phone, tap]);

  // Escape, a pointer down outside, or the page scrolling (desktop: the window would drift off its slot)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => {
      if (!phone) onClose();
    };
    window.addEventListener("keydown", onKey);
    // capture, and after this tap's own events: the opening click must not close it
    const t = window.setTimeout(() => window.addEventListener("pointerdown", onDown, true), 0);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose, phone]);

  // focus the first area so the keyboard can pick straight away
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("[data-slot-pick]")?.focus();
  }, []);

  const body = (
    <div
      ref={ref}
      role="dialog"
      aria-label={m.slot.addAt(m.lib.days[tap.day], fmtTime(tap.start, lang))}
      style={
        phone ? S.slotSheet : { ...S.slotMenu, ...(pos ?? { left: tap.x + 12, top: tap.y, visibility: "hidden" }) }
      }
    >
      <div style={S.slotHead}>
        <span style={{ flex: 1 }}>{m.slot.addAt(m.lib.days[tap.day], fmtTime(tap.start, lang))}</span>
        <button type="button" className="cadence-hit44" onClick={onClose} aria-label={m.slot.close} style={S.closeX}>
          ✕
        </button>
      </div>
      <div style={S.slotOptions}>
        {slotOptions(cats, m.lib).map((o) => {
          const fit = pickPlacement(blocks, cats, tap, o.id, bounds);
          const buffer = o.color === null;
          const color = o.color ?? BUFFER_COLOR;
          return (
            <button
              key={o.id}
              type="button"
              data-slot-pick=""
              className="cadence-slot-pick"
              disabled={!fit}
              onClick={() => onPick(o.id)}
              title={fit ? undefined : m.slot.noRoom}
              style={
                {
                  ...S.slotOption,
                  border: `1.5px ${buffer ? "dashed" : "solid"} ${color}`,
                  opacity: fit ? 1 : 0.4,
                  cursor: fit ? "pointer" : "default",
                  "--cadence-hover": withAlpha(color, "1a"),
                } as React.CSSProperties
              }
            >
              <AreaMark icon={o.icon} color={color} />
              <span style={S.slotOptionName}>{o.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!phone) return body;
  return (
    <>
      <div style={S.slotBackdrop} aria-hidden="true" />
      {body}
    </>
  );
}
