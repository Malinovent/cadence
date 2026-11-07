import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { CHECK_ITEMS, doneCount, type CheckDone, type CheckItem } from "../lib/guide";
import { doneGreen, S } from "../styles";

const SHOW_MS = 5000;

type Props = {
  items: CheckItem[]; // just done
  done: CheckDone; // everything done so far, these included
  next: CheckItem | null; // the first step still open
  onShow: (item: CheckItem) => void; // "Show me" for the next step
  onClose: () => void;
  phone?: boolean; // a size up (JP)
};

const draw = (ms: number, delay: number): React.CSSProperties => ({
  animation: `cadence-draw ${ms}ms ${delay}ms ease-out both`,
});

/**
 * A step done away from the board (JP, 2026-11-07): the cross-off comes to you instead of the page
 * moving to the board. The check draws itself, the step is struck through, its square pops, and
 * "Next" leads on. At the top, clear of the phone tray, the keyboard and the Undo bar. Never takes
 * focus; stays while hovered, focused or touched; gone after five seconds.
 */
export default function QuestToast({ items, done, next, onShow, onClose, phone = false }: Props) {
  const { m } = useI18n();
  const [held, setHeld] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (held) return;
    const t = window.setTimeout(() => closeRef.current(), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [held]);

  const big = (base: React.CSSProperties, up: React.CSSProperties): React.CSSProperties =>
    phone ? { ...base, ...up } : base;
  const check = phone ? 36 : 28;
  const hold = () => setHeld(true);
  const release = () => setHeld(false);
  return (
    <div
      role="status"
      style={big(S.questToast, S.questToastPhone)}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
      onTouchStart={hold}
      onTouchEnd={release}
    >
      <svg width={check} height={check} viewBox="0 0 28 28" aria-hidden="true" style={S.questCheck}>
        <path
          d="M14 2a12 12 0 1 1 0 24a12 12 0 1 1 0-24"
          fill="none"
          stroke={doneGreen}
          strokeWidth="2.5"
          pathLength={1}
          strokeDasharray="1"
          style={draw(360, 120)}
        />
        <path
          d="M8 14.5l4 4 8-9"
          fill="none"
          stroke={doneGreen}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          style={draw(260, 420)}
        />
      </svg>
      <div style={S.questBody}>
        <span style={big(S.questLabel, S.questLabelPhone)}>
          {m.checklist.title} · {m.checklist.progress(doneCount(done), CHECK_ITEMS.length)}
        </span>
        {items.map((i) => (
          <span key={i} style={big(S.questItem, S.questItemPhone)}>
            <span style={S.srOnly}>{m.checklist.doneSr} </span>
            {m.checklist.items[i]}
            <span aria-hidden="true" style={S.questStrike} />
          </span>
        ))}
        <span aria-hidden="true" style={S.questPips}>
          {CHECK_ITEMS.map((i) => (
            <span
              key={i}
              style={{
                ...big(S.questPip, S.questPipPhone),
                ...(done[i] ? (items.includes(i) ? S.questPipNew : S.questPipOn) : {}),
              }}
            />
          ))}
        </span>
        {next && (
          <span style={big(S.questNext, S.questNextPhone)}>
            <span>
              {m.checklist.next} {m.checklist.items[next]}
            </span>
            <button
              type="button"
              style={big(S.questShow, S.questShowPhone)}
              onClick={() => {
                onClose();
                onShow(next);
              }}
            >
              {m.checklist.showMe}
            </button>
          </span>
        )}
      </div>
      <button
        type="button"
        className="cadence-hit44"
        style={big(S.questClose, S.questClosePhone)}
        onClick={onClose}
        aria-label={m.checklist.close}
      >
        ✕
      </button>
    </div>
  );
}
