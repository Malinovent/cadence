import { useEffect, useRef, useState } from "react";
import { DOCK_ATTR } from "../interaction/dom";
import { openCount, tasksLine } from "../lib/panel";
import { openTasks, taskMins } from "../lib/tasks";
import { S } from "../styles";
import AreaChip from "./AreaChip";
import { armHint, BalanceNotes, hasUnsorted, TasksHead, useFolds, type PanelProps } from "./AreasPanel";
import AreaTasks from "./AreaTasks";
import BalanceBar from "./BalanceBar";

type Tab = "areas" | "tasks";

/**
 * S1.4 phone: areas and tasks share one tray docked at the bottom, with Areas and Tasks tabs.
 * One tap folds it into a slim "Show areas and tasks" bar (remembered on the device by the caller).
 * A spacer in the page flow keeps the end of the page reachable above the dock.
 */
export default function PhoneDock(props: PanelProps & { folded: boolean; onShow: () => void }) {
  const { areas, notes, data, week, now, interaction, armedCatId, onArm, onHide, onShow, folded, actions } = props;
  const [foldedAreas, toggleFold] = useFolds();
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
      <div ref={dockRef} {...{ [DOCK_ATTR]: "" }} style={S.dock} role="region" aria-label="Areas and tasks">
        {folded ? (
          <button type="button" onClick={onShow} style={S.dockBar} aria-expanded={false}>
            ▴ Show areas and tasks
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
                    {t === "areas" ? "Areas" : open > 0 ? `Tasks · ${open}` : "Tasks"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onHide}
                style={S.dockFold}
                aria-expanded={true}
                aria-label="Fold areas and tasks"
              >
                ▾ hide
              </button>
            </div>
            <div style={S.dockBody}>
              {tab === "areas" ? (
                <>
                  {armedCatId && <div style={{ ...S.panelLabel, marginTop: 0, marginBottom: 6 }}>{armHint(true)}</div>}
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
                // S1.5: tasks grouped under their areas, each folding away; Unsorted last
                <div style={S.dockTaskGroups}>
                  {areas
                    .filter((a) => a.balance !== null)
                    .map((a) => {
                      const isOpen = !foldedAreas.has(a.id);
                      return (
                        <div key={a.id}>
                          <div style={S.dockTaskArea}>
                            <span style={{ ...S.dot, background: a.color }} />
                            <span style={S.balanceName}>{a.name}</span>
                          </div>
                          <TasksHead
                            name={a.name}
                            count={openTasks(data.tasks, a.id).length}
                            line={tasksLine(taskMins(data.tasks, a.id), a.balance!.plannedMins, week)}
                            open={isOpen}
                            onToggle={() => toggleFold(a.id)}
                          />
                          {isOpen && (
                            <AreaTasks catId={a.id} data={data} interaction={interaction} actions={actions} now={now} />
                          )}
                        </div>
                      );
                    })}
                  {hasUnsorted(data, now) && (
                    <div>
                      <div style={S.dockTaskArea}>
                        <span style={S.balanceName}>Unsorted · give each an area</span>
                      </div>
                      <AreaTasks catId={null} data={data} interaction={interaction} actions={actions} now={now} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
