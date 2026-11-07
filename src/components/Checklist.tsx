import { useI18n } from "../i18n/I18nProvider";
import { CHECK_ITEMS, doneCount, type CheckDone, type CheckItem } from "../lib/guide";
import { S } from "../styles";

type Props = {
  done: CheckDone;
  collapsed: boolean;
  onToggle: () => void;
  onShow: (item: CheckItem) => void; // "Show me": that item's guided step
  onClose: () => void; // dismissed for good on this device
};

/**
 * Onboarding path 4 (JP, 2026-11-07): after the guided first block, "Getting started" takes over at
 * the person's own pace. Items tick themselves as they're done; each open one has "Show me".
 */
export default function Checklist({ done, collapsed, onToggle, onShow, onClose }: Props) {
  const { m } = useI18n();
  const n = doneCount(done);
  const all = n === CHECK_ITEMS.length;
  return (
    <section style={S.checkCard} aria-labelledby="checklist-title">
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
              return (
                <li key={item} style={S.checkItem}>
                  <span style={{ ...S.checkMark, ...(ok ? S.checkMarkOn : {}) }} aria-hidden="true">
                    {ok ? "✓" : ""}
                  </span>
                  <span style={{ ...S.checkLabel, ...(ok ? S.taskNameDone : {}) }}>
                    {m.checklist.items[item]}
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
