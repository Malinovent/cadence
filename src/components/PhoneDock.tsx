import { useEffect, useRef, useState } from "react";
import { DOCK_ATTR } from "../interaction/dom";
import { openCount } from "../lib/panel";
import { S } from "../styles";
import AreaChip from "./AreaChip";
import { BalanceNotes, type PanelProps } from "./AreasPanel";
import { useI18n } from "../i18n/I18nProvider";
import TaskList from "./TaskList";
import BalanceBar from "./BalanceBar";

type Tab = "areas" | "tasks";

/**
 * S1.4 phone: areas and tasks share one tray docked at the bottom, with Areas and Tasks tabs.
 * One tap folds it into a slim "Show areas and tasks" bar (remembered on the device by the caller).
 * A spacer in the page flow keeps the end of the page reachable above the dock.
 */
export default function PhoneDock(props: PanelProps & { folded: boolean; onShow: () => void }) {
  const { areas, notes, data, now, interaction, armedCatId, onArm, onHide, onShow, folded, actions } = props;
  const { m } = useI18n();
  const [tab, setTab] = useState<Tab>("areas");
  const dockRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = dockRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const open = openCount(data.tasks);
  return (
    <>
      <div style={{ height }} aria-hidden="true" />
      <div ref={dockRef} {...{ [DOCK_ATTR]: "" }} style={S.dock} role="region" aria-label={m.panel.region}>
        {folded ? (
          <button type="button" onClick={onShow} style={S.dockBar} aria-expanded={false}>
            {m.panel.showBar}
          </button>
        ) : (
          <>
            <div style={S.dockHead}>
              <div style={S.dockTabs} role="tablist">
                {(["areas", "tasks"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    style={{
                      ...S.dockTab,
                      ...(tab === t ? S.dockTabActive : {}),
                    }}
                  >
                    {t === "areas" ? m.panel.tabs.areas : open > 0 ? m.panel.tabs.tasksOpen(open) : m.panel.tabs.tasks}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onHide}
                style={S.dockFold}
                aria-expanded={true}
                aria-label={m.panel.foldLabel}
              >
                {m.panel.fold}
              </button>
            </div>
            <div style={S.dockBody}>
              {tab === "areas" ? (
                <>
                  {armedCatId && <div style={{ ...S.panelLabel, marginTop: 0, marginBottom: 6 }}>{m.panel.armedHint}</div>}
                  <div style={S.dockAreas}>
                    {areas.map((a) => (
                      <div key={a.id}>
                        <AreaChip area={a} interaction={interaction} armed={armedCatId === a.id} onArm={onArm} />
                        {a.balance && <BalanceBar balance={a.balance} color={a.color} kind={null} />}
                      </div>
                    ))}
                  </div>
                  {/* the calm notes sit below the chips: the tray scrolls to them, its height stays capped */}
                  <BalanceNotes notes={notes} />
                </>
              ) : (
                <TaskList data={data} interaction={interaction} actions={actions} now={now} />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
