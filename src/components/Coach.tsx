import { useEffect, useRef, useState } from "react";
import { coachPosition, outOfView, type Rect } from "../lib/guide";
import { S } from "../styles";

export type CoachAction = { label: string; onClick: () => void; primary?: boolean };

type Props = {
  target: string; // the data-coach value of the element to point at
  title: string;
  body?: string;
  actions: CoachAction[];
  onClose: () => void; // Escape
};

const same = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

/**
 * One guided step (onboarding path 1 + checklist): an ink outline around one element and a small
 * bubble beside it. Never blocks the page: the outline lets clicks and drags through, so the person
 * does the real thing. Follows its target as the page scrolls or the layout moves.
 */
export default function Coach({ target, title, body, actions, onClose }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [size, setSize] = useState({ w: 300, h: 120 });
  const bubble = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const find = () => document.querySelector<HTMLElement>(`[data-coach="${target}"]`);
    // bring the target into view once, only when it's hidden: off screen, or under the phone tray
    // (fixed, so what's inside it never needs scrolling). No smooth scroll: reduced motion.
    const el = find();
    if (el) {
      const dock = document.querySelector<HTMLElement>("[data-cadence-dock]");
      const inDock = !!dock?.contains(el);
      const limit = () => (dock && !inDock ? dock.getBoundingClientRect().top : window.innerHeight);
      if (!inDock && outOfView(el.getBoundingClientRect(), limit())) {
        el.scrollIntoView({ block: "center", inline: "nearest" });
        const r = el.getBoundingClientRect();
        if (outOfView(r, limit())) window.scrollBy(0, r.top + r.height / 2 - limit() / 2);
      }
    }
    const measure = () => {
      const r = find()?.getBoundingClientRect();
      const next = r
        ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
        : null;
      setRect((prev) => (same(prev, next) ? prev : next));
      // the bubble's own size, to keep it on screen
      const b = bubble.current?.getBoundingClientRect();
      if (b)
        setSize((s) =>
          Math.round(s.w) === Math.round(b.width) && Math.round(s.h) === Math.round(b.height)
            ? s
            : { w: b.width, h: b.height },
        );
    };
    measure();
    const id = window.setInterval(measure, 250); // layout can move without a scroll (tray, editor)
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
    };
  }, [target]);

  const pos = coachPosition(rect, size, { w: window.innerWidth, h: window.innerHeight });

  return (
    <>
      {rect && (
        <div
          aria-hidden="true"
          style={{
            ...S.coachRing,
            left: rect.left - 5,
            top: rect.top - 5,
            width: rect.width + 10,
            height: rect.height + 10,
          }}
        />
      )}
      <div ref={bubble} role="dialog" aria-label={title} style={{ ...S.coachBubble, left: pos.left, top: pos.top }}>
        <div style={S.coachTitle} aria-live="polite">
          {title}
        </div>
        {body && <div style={S.coachBody}>{body}</div>}
        <div style={S.coachActions}>
          {actions.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} style={a.primary ? S.coachPrimary : S.coachQuiet}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
