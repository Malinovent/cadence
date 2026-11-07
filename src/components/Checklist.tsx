import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { CHECK_ITEMS, doneCount, type CheckDone, type CheckItem } from "../lib/guide";
import { S } from "../styles";

type Props = {
  done: CheckDone;
  collapsed: boolean;
  onToggle: () => void;
  onShow: (item: CheckItem) => void; // "Show me": that item's guided step
  onClose: () => void; // dismissed for good on this device
  fresh: CheckItem[]; // done, not crossed off here yet
  onCrossedOff: (items: CheckItem[]) => void;
  onInView: (inView: boolean) => void; // whether the list can be seen: no toast is needed then
};

const CROSS_MS = 1100; // the pop and the strike, then the plain done look

/**
 * Onboarding path 4 (JP, 2026-11-07): after the guided first block, "Getting started" takes over at
 * the person's own pace. Items tick themselves as they're done; each open one has "Show me".
 * A step just done crosses off here when the list is on screen; one done elsewhere crosses off the
 * next time the list is seen (the toast covered the moment itself).
 */
export default function Checklist({
  done,
  collapsed,
  onToggle,
  onShow,
  onClose,
  fresh,
  onCrossedOff,
  onInView,
}: Props) {
  const { m } = useI18n();
  const n = doneCount(done);
  const all = n === CHECK_ITEMS.length;
  const listShown = !collapsed && !all;

  // on screen: at least half the card in view
  const card = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = card.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.5), {
      threshold: [0, 0.5, 1],
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => onInView(inView && listShown), [inView, listShown, onInView]);
  useEffect(() => () => onInView(false), [onInView]); // gone (another page): not in view

  // cross off what's fresh while it can be seen, then settle
  const playKey = inView && listShown ? fresh.filter((i) => done[i]).join(" ") : "";
  useEffect(() => {
    if (!playKey) return;
    const items = playKey.split(" ") as CheckItem[];
    const t = window.setTimeout(() => onCrossedOff(items), CROSS_MS);
    return () => window.clearTimeout(t);
  }, [playKey, onCrossedOff]);
  const playing = playKey ? (playKey.split(" ") as CheckItem[]) : [];

  return (
    <section ref={card} style={S.checkCard} aria-labelledby="checklist-title">
      <div style={S.checkHead}>
        {/* the count drops under the title when the row is narrow (phone, French) */}
        <span style={S.checkHeading}>
          <span id="checklist-title" style={S.checkTitle}>
            {m.checklist.title}
          </span>
          <span style={S.checkProgress}>{m.checklist.progress(n, CHECK_ITEMS.length)}</span>
        </span>
        <button
          type="button"
          className="cadence-tray-toggle"
          style={S.panelToggle}
          onClick={onToggle}
          aria-expanded={!collapsed}
        >
          {collapsed ? m.checklist.show : m.checklist.hide}
        </button>
        <button
          type="button"
          className="cadence-hit44"
          style={S.catDel}
          onClick={onClose}
          aria-label={m.checklist.close}
        >
          ✕
        </button>
      </div>
      {!collapsed &&
        (all ? (
          <div style={S.checkAllDone}>
            <span>{m.checklist.allDone}</span>
            <button type="button" style={S.tplApply} onClick={onClose}>
              {m.checklist.close}
            </button>
          </div>
        ) : (
          <ol style={S.checkItems}>
            {CHECK_ITEMS.map((item) => {
              const ok = !!done[item];
              const crossing = playing.includes(item);
              return (
                <li key={item} style={S.checkItem}>
                  <span
                    style={{ ...S.checkMark, ...(ok ? S.checkMarkOn : {}), ...(crossing ? S.checkMarkFresh : {}) }}
                    aria-hidden="true"
                  >
                    {ok ? "✓" : ""}
                  </span>
                  <span style={{ ...S.checkLabel, ...(ok && !crossing ? S.taskNameDone : {}) }}>
                    {crossing ? (
                      <span style={S.checkWords}>
                        {m.checklist.items[item]}
                        <span aria-hidden="true" style={S.checkStrike} />
                      </span>
                    ) : (
                      m.checklist.items[item]
                    )}
                    {ok && <span style={S.srOnly}> ✓</span>}
                  </span>
                  {!ok && (
                    <button type="button" style={S.checkShow} onClick={() => onShow(item)}>
                      {m.checklist.showMe}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        ))}
    </section>
  );
}
