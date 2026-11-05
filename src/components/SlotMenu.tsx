import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DAYS } from "../lib/constants";
import type { Block, Category } from "../lib/model";
import {
  menuPosition,
  pickMins,
  pickPlacement,
  SLOT_LENGTHS,
  slotOptions,
  type SlotLength,
  type SlotTap,
} from "../lib/slotMenu";
import { fmtTime } from "../lib/time";
import { BUFFER_COLOR } from "../lib/constants";
import { S } from "../styles";

type Props = {
  tap: SlotTap;
  blocks: Block[];
  cats: Category[];
  phone: boolean;
  onPick: (catId: string, mins: number | undefined) => void;
  onClose: () => void;
};

const lengthLabel = (m: SlotLength) =>
  m === null ? "Usual" : m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`;

/**
 * S1.6: tap or click empty time. Desktop: a small window beside the slot; phone: a bottom sheet.
 * A length (the area's usual one by default) and the areas plus the buffer; a pick places a block
 * there (nearest free spot, shrunk to fit, like a drop) and closes. Escape, ✕ or a tap outside
 * closes with nothing changed.
 */
export default function SlotMenu({ tap, blocks, cats, phone, onPick, onClose }: Props) {
  const [length, setLength] = useState<SlotLength>(null);
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
      aria-label={`Add at ${DAYS[tap.day]} ${fmtTime(tap.start)}`}
      style={
        phone ? S.slotSheet : { ...S.slotMenu, ...(pos ?? { left: tap.x + 12, top: tap.y, visibility: "hidden" }) }
      }
    >
      <div style={S.slotHead}>
        <span style={{ flex: 1 }}>
          Add at {DAYS[tap.day]} {fmtTime(tap.start)}
        </span>
        <button type="button" className="cadence-hit44" onClick={onClose} aria-label="Close" style={S.catDel}>
          ✕
        </button>
      </div>
      <div style={S.slotLengths} role="group" aria-label="Length">
        {[null, ...SLOT_LENGTHS].map((m) => (
          <button
            key={String(m)}
            type="button"
            aria-pressed={length === m}
            onClick={() => setLength(m)}
            style={{ ...S.kindBtn, ...S.slotLength, ...(length === m ? S.kindBtnActive : {}) }}
          >
            {lengthLabel(m)}
          </button>
        ))}
      </div>
      <div style={S.slotOptions}>
        {slotOptions(cats).map((o) => {
          const fit = pickPlacement(blocks, cats, tap, o.id, length);
          const color = o.color ?? BUFFER_COLOR;
          return (
            <button
              key={o.id}
              type="button"
              data-slot-pick=""
              disabled={!fit}
              onClick={() => fit && onPick(o.id, pickMins(cats, o.id, length))}
              style={{
                ...S.trayBlock,
                ...S.slotOption,
                border: `1.5px dashed ${color}`,
                color,
                opacity: fit ? 1 : 0.4,
              }}
            >
              <span style={S.trayName}>{o.name}</span>
              <span style={{ ...S.trayMins, color }}>
                {fit ? `${fmtTime(fit.start)}–${fmtTime(fit.start + fit.mins)}` : "no room"}
              </span>
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
