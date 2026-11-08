import type { WeekIndex } from "../lib/actions";
import type { CadenceData } from "../lib/model";
import { addedNote, areaName, missingAreas, STARTERS, starterText } from "../lib/starters";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  data: CadenceData;
  week: WeekIndex;
  actions: Pick<CadenceActions, "deleteTemplate">;
  onApplyTemplate: (id: string) => void; // opens its preview; using it replaces the week (Undo offered)
  onApplyStarter: (id: string) => void;
  onApplyDay: (id: string) => void; // a day template: its preview, which asks the day
  /** "＋ Save this week" / "＋ Save a day": a popup shows what's saved, its name and (a day) which day */
  onSaveWeek: () => void;
  onSaveDay: () => void;
  onAdvance: () => void;
};

/**
 * S1.4: below the grid, templates and roll forward. Templates (JP, 2026-11-08): "＋ Save this week"
 * with the week templates under it, "＋ Save a day" with the day templates under it, then the
 * starter weeks. Saving and using both open a preview first.
 */
export default function WeekFooter({
  data,
  week,
  actions,
  onApplyTemplate,
  onApplyStarter,
  onApplyDay,
  onSaveWeek,
  onSaveDay,
  onAdvance,
}: Props) {
  const { m } = useI18n();
  const empty = data.weeks[week].length === 0;
  const weekTemplates = data.templates.filter((t) => !t.day);
  const dayTemplates = data.templates.filter((t) => t.day);
  const saveBtn = (onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      disabled={empty}
      style={{ ...S.tplSave, opacity: empty ? 0.4 : 1, cursor: empty ? "not-allowed" : "pointer" }}
    >
      {label}
    </button>
  );
  const row = (t: { id: string; name: string }, onPreview: () => void) => (
    <div key={t.id} style={S.tplRow}>
      <span style={S.tplName}>{t.name}</span>
      <button onClick={onPreview} style={S.tplApply}>
        {m.footer.apply}
      </button>
      <button onClick={() => actions.deleteTemplate(t.id)} style={S.tplDel} aria-label={m.footer.remove(t.name)}>
        ✕
      </button>
    </div>
  );

  return (
    <div style={S.weekFooter}>
      <div style={{ ...S.tplSection, ...S.weekFooterTpl }}>
        <div style={S.panelLabel}>{m.footer.templates}</div>
        {/* each kind in its own column, under its save button (JP, 2026-11-08) */}
        <div style={S.tplCols}>
          <div style={S.tplCol}>
            {saveBtn(onSaveWeek, m.footer.saveWeek)}
            {weekTemplates.map((t) => row(t, () => onApplyTemplate(t.id)))}
          </div>
          <div style={S.tplCol}>
            {saveBtn(onSaveDay, m.footer.saveDay)}
            {dayTemplates.map((t) => row(t, () => onApplyDay(t.id)))}
          </div>
        </div>
        {weekTemplates.length + dayTemplates.length === 0 && <div style={S.tplEmpty}>{m.footer.noTemplates}</div>}
      </div>
      <StarterWeeks data={data} week={week} onApply={onApplyStarter} />
      <button onClick={onAdvance} style={{ ...S.advanceBtn, ...S.weekFooterAdvance }}>
        {m.footer.rollForward}
      </button>
    </div>
  );
}

/** S1.8: three built-in starter weeks; applying one replaces the week and adds missing areas. */
function StarterWeeks({ data, week, onApply }: { data: CadenceData; week: WeekIndex; onApply: (id: string) => void }) {
  const { m } = useI18n();
  return (
    <div data-coach="starters" style={{ ...S.tplSection, ...S.weekFooterTpl }}>
      <div style={S.panelLabel}>{m.footer.starters}</div>
      {STARTERS.map((st) => {
        const note = addedNote(
          missingAreas(data.cats, st).map((a) => areaName(a, m.lib)),
          m.lib,
        );
        const text = starterText(st, m.lib);
        return (
          <div key={st.id} style={{ ...S.tplRow, ...S.starterRow }}>
            <span style={S.starterText}>
              <span style={S.tplName}>{text.name}</span>
              <span style={S.starterBlurb}>{text.blurb}</span>
              {note && <span style={S.starterNote}>{note}</span>}
            </span>
            <button
              onClick={() => onApply(st.id)}
              style={S.tplApply}
              aria-label={m.footer.applyStarter(text.name, week + 1)}
            >
              {m.footer.apply}
            </button>
          </div>
        );
      })}
    </div>
  );
}
