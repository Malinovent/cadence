import type { Interaction } from "../interaction/useInteraction";
import type { PanelArea } from "../lib/panel";
import type { Task } from "../lib/model";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import AreaChip from "./AreaChip";
import BalanceBar from "./BalanceBar";
import TaskList from "./TaskList";

export type PanelProps = {
  areas: PanelArea[];
  notes: string[];
  tasks: Task[];
  interaction: Interaction;
  armedCatId: string | null; // tap-to-place: the area waiting for a slot tap
  onArm: (catId: string | null) => void;
  onHide: () => void;
  actions: Pick<CadenceActions, "addTask" | "toggleTask" | "removeTask">;
};

export const armHint = (armed: boolean) => (armed ? "Tap a slot to place · tap again to cancel" : "Drag into the grid");

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

/** S1.4 desktop: the left panel. Each area is its drag handle plus this week's balance; tasks below. */
export default function AreasPanel({
  areas,
  notes,
  tasks,
  interaction,
  armedCatId,
  onArm,
  onHide,
  actions,
}: PanelProps) {
  return (
    <aside style={S.sidebar} aria-label="Areas and tasks">
      <div style={S.panelHead}>
        <span style={{ flex: 1 }}>Areas · {armHint(!!armedCatId)}</span>
        <button type="button" className="cadence-tray-toggle" onClick={onHide} style={S.panelToggle}>
          hide
        </button>
      </div>
      <div className="cadence-tray" style={S.areaList}>
        {areas.map((a) => (
          <div key={a.id}>
            <AreaChip area={a} interaction={interaction} armed={armedCatId === a.id} onArm={onArm} />
            {a.balance && <BalanceBar balance={a.balance} color={a.color} kind={a.limitText} />}
          </div>
        ))}
      </div>
      <BalanceNotes notes={notes} />

      <div style={S.panelSection}>
        <div style={S.panelLabel}>Tasks</div>
        <TaskList tasks={tasks} actions={actions} />
      </div>
    </aside>
  );
}
