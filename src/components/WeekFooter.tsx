import { useState } from "react";
import type { WeekIndex } from "../lib/actions";
import type { CadenceData } from "../lib/model";
import { addedNote, areaName, missingAreas, STARTERS, starterText } from "../lib/starters";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  data: CadenceData;
  week: WeekIndex;
  actions: Pick<CadenceActions, "saveTemplate" | "applyTemplate" | "deleteTemplate" | "applyStarter">;
  onAdvance: () => void;
};

/** S1.4: below the grid, templates, "Save current week" and roll forward. */
export default function WeekFooter({ data, week, actions, onAdvance }: Props) {
  const { m, lang } = useI18n();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const empty = data.weeks[week].length === 0;

  const save = (n: string) => {
    actions.saveTemplate(week, n.trim() || m.footer.templateName(data.templates.length + 1));
    setNaming(false);
    setName("");
  };
  const cancel = () => {
    setNaming(false);
    setName("");
  };

  return (
    <div style={S.weekFooter}>
      <div style={{ ...S.tplSection, ...S.weekFooterTpl }}>
        <div style={S.panelLabel}>{m.footer.templates}</div>
        {naming ? (
          <div style={S.tplNameRow}>
            <input
              autoFocus
              value={name}
              placeholder={m.footer.templateName(data.templates.length + 1)}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save(name);
                if (e.key === "Escape") cancel();
              }}
              style={S.tplNameInput}
            />
            <button onClick={() => save(name)} style={S.tplSaveConfirm}>
              {m.footer.save}
            </button>
            <button onClick={cancel} style={S.tplDel}>
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNaming(true)}
            disabled={empty}
            style={{
              ...S.tplSave,
              opacity: empty ? 0.4 : 1,
              cursor: empty ? "not-allowed" : "pointer",
            }}
          >
            {m.footer.saveWeek}
          </button>
        )}
        {data.templates.length === 0 && !naming && <div style={S.tplEmpty}>{m.footer.noTemplates}</div>}
        {data.templates.map((t) => (
          <div key={t.id} style={S.tplRow}>
            <span style={S.tplName}>{t.name}</span>
            <button onClick={() => actions.applyTemplate(week, t.id)} style={S.tplApply}>
              {m.footer.apply}
            </button>
            <button onClick={() => actions.deleteTemplate(t.id)} style={S.tplDel}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <StarterWeeks data={data} week={week} onApply={(id) => actions.applyStarter(week, id, { lang })} />
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
    <div style={{ ...S.tplSection, ...S.weekFooterTpl }}>
      <div style={S.panelLabel}>{m.footer.starters}</div>
      {STARTERS.map((st) => {
        const note = addedNote(missingAreas(data.cats, st).map((a) => areaName(a, m.lib)), m.lib);
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
