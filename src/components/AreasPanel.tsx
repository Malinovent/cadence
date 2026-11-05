import type { Interaction } from "../interaction/useInteraction";
import type { CadenceData } from "../lib/model";
import type { PanelArea } from "../lib/panel";
import { S } from "../styles";
import AreaChip from "./AreaChip";
import TaskList, { type TaskActions } from "./TaskList";
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

/** S1.4 desktop: the left panel. Each area: its drag handle and this week's balance; one task list below. */
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
        <div style={S.panelLabel}>Tasks · drag onto a block</div>
        <TaskList data={data} interaction={interaction} actions={actions} now={now} />
      </div>
    </aside>
  );
}
