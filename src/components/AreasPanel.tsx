import { useState } from "react";
import type { Interaction } from "../interaction/useInteraction";
import type { CadenceData } from "../lib/model";
import type { PanelArea } from "../lib/panel";
import { doneThisWeek, openTasks } from "../lib/tasks";
import { readFolded, writeFolded } from "../state/panelFolds";
import { S } from "../styles";
import AreaChip from "./AreaChip";
import AreaTasks, { type TaskActions } from "./AreaTasks";
import BalanceBar from "./BalanceBar";

export type PanelProps = {
  areas: PanelArea[];
  notes: string[];
  data: CadenceData;
  now: Date;
  interaction: Interaction;
  armedCatId: string | null; // tap-to-place: the area waiting for a slot tap
  onArm: (catId: string | null) => void;
  onHide: () => void;
  actions: TaskActions;
};

export const armHint = (armed: boolean) => (armed ? "Tap a slot · tap again to cancel" : "Drag into the grid");

/** The calm notes for what's off this week ("Rest is 3 h short of its floor"). */
export function BalanceNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div style={S.balanceNotes} role="status">
      {notes.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </div>
  );
}

/** Folded areas, remembered on this device (S1.5). */
export function useFolds(): [Set<string>, (id: string) => void] {
  const [folded, setFolded] = useState(() => new Set(readFolded()));
  const toggle = (id: string) => {
    const next = new Set(folded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFolded(next);
    writeFolded([...next]);
  };
  return [folded, toggle];
}

/** "Tasks · 3" fold button for one area. */
export function TasksHead({
  count,
  open,
  onToggle,
  name,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  name: string;
}) {
  return (
    <div style={S.areaTasksHead}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? "Fold" : "Show"} ${name} tasks`}
        style={S.areaFold}
      >
        {open ? "▾" : "▸"} {count > 0 ? `Tasks · ${count}` : "Tasks"}
      </button>
    </div>
  );
}

/** Unsorted tasks (from before tasks had areas) exist, open or finished this week. */
export const hasUnsorted = (data: CadenceData, now: Date) =>
  openTasks(data.tasks, null).length > 0 || doneThisWeek(data.tasks, null, now).length > 0;

/** S1.4/S1.5 desktop: the left panel. Each area: its drag handle, this week's balance, its tasks (folding away). */
export default function AreasPanel({
  areas,
  notes,
  data,
  now,
  interaction,
  armedCatId,
  onArm,
  onHide,
  actions,
}: PanelProps) {
  const [folded, toggleFold] = useFolds();
  return (
    <aside style={S.sidebar} aria-label="Areas and tasks">
      <div style={S.panelHead}>
        <span style={{ flex: 1 }}>Areas · {armHint(!!armedCatId)}</span>
        <button type="button" className="cadence-tray-toggle" onClick={onHide} style={S.panelToggle}>
          hide
        </button>
      </div>
      <div className="cadence-tray" style={S.areaList}>
        {areas.map((a) => {
          const isArea = a.balance !== null;
          const open = !folded.has(a.id);
          return (
            <div key={a.id}>
              <AreaChip area={a} interaction={interaction} armed={armedCatId === a.id} onArm={onArm} />
              {a.balance && <BalanceBar balance={a.balance} color={a.color} kind={a.limitText} />}
              {isArea && (
                <>
                  <TasksHead
                    name={a.name}
                    count={openTasks(data.tasks, a.id).length}
                    open={open}
                    onToggle={() => toggleFold(a.id)}
                  />
                  {open && <AreaTasks catId={a.id} data={data} interaction={interaction} actions={actions} now={now} />}
                </>
              )}
            </div>
          );
        })}
      </div>
      {hasUnsorted(data, now) && (
        <div style={S.panelSection}>
          <div style={S.panelLabel}>Unsorted · give each an area</div>
          <AreaTasks catId={null} data={data} interaction={interaction} actions={actions} now={now} />
        </div>
      )}
      <BalanceNotes notes={notes} />
    </aside>
  );
}
