import type { Interaction } from "../interaction/useInteraction";
import type { CadenceData } from "../lib/model";
import type { PanelArea } from "../lib/panel";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import AreaChip from "./AreaChip";
import TaskList, { type TaskActions } from "./TaskList";
import BlockCount from "./BlockCount";

export type PanelProps = {
  areas: PanelArea[];
  data: CadenceData;
  now: Date;
  interaction: Interaction;
  armedCatId: string | null; // tap-to-place: the area waiting for a slot tap
  onArm: (catId: string | null) => void;
  onHide: () => void;
  actions: TaskActions;
};


/** S1.4 desktop: the left panel. Each area: its drag handle and this week's balance; one task list below. */
export default function AreasPanel({
  areas,
  data,
  now,
  interaction,
  armedCatId,
  onArm,
  onHide,
  actions,
}: PanelProps) {
  const { m } = useI18n();
  return (
    <aside style={S.sidebar} aria-label={m.panel.region}>
      <div style={S.panelHead}>
        <span style={{ flex: 1 }}>
          {m.panel.areas} · {armedCatId ? m.panel.armedHint : m.panel.dragHint}
        </span>
        <button type="button" className="cadence-tray-toggle" onClick={onHide} style={S.panelToggle}>
          {m.panel.hide}
        </button>
      </div>
      <div className="cadence-tray" style={S.areaList}>
        {areas.map((a) => (
          <div key={a.id}>
            <AreaChip area={a} interaction={interaction} armed={armedCatId === a.id} onArm={onArm} />
            <BlockCount area={a} />
          </div>
        ))}
      </div>

      <div style={S.panelSection}>
        <div style={S.panelLabel}>{m.panel.tasksHead}</div>
        <TaskList data={data} interaction={interaction} actions={actions} now={now} />
      </div>
    </aside>
  );
}
