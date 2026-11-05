import { useState } from "react";
import type { WeekIndex } from "../lib/actions";
import type { CadenceData } from "../lib/model";
import { addedNote, missingAreas, STARTERS } from "../lib/starters";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

type Props = {
  data: CadenceData;
  week: WeekIndex;
  actions: Pick<CadenceActions, "saveTemplate" | "applyTemplate" | "deleteTemplate" | "applyStarter">;
  onAdvance: () => void;
};

/** S1.4: below the grid, templates, "Save current week" and roll forward. */
export default function WeekFooter({ data, week, actions, onAdvance }: Props) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const empty = data.weeks[week].length === 0;

  const save = (n: string) => {
    actions.saveTemplate(week, n);
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
        <div style={S.panelLabel}>Templates</div>
        {naming ? (
          <div style={S.tplNameRow}>
            <input
              autoFocus
              value={name}
              placeholder={`Template ${data.templates.length + 1}`}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save(name);
                if (e.key === "Escape") cancel();
              }}
              style={S.tplNameInput}
            />
            <button onClick={() => save(name)} style={S.tplSaveConfirm}>
              save
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
            ＋ Save current week
          </button>
        )}
        {data.templates.length === 0 && !naming && <div style={S.tplEmpty}>No templates of your own yet.</div>}
        {data.templates.map((t) => (
          <div key={t.id} style={S.tplRow}>
            <span style={S.tplName}>{t.name}</span>
            <button onClick={() => actions.applyTemplate(week, t.id)} style={S.tplApply}>
              apply
            </button>
            <button onClick={() => actions.deleteTemplate(t.id)} style={S.tplDel}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <StarterWeeks data={data} week={week} onApply={(id) => actions.applyStarter(week, id)} />
      <button onClick={onAdvance} style={{ ...S.advanceBtn, ...S.weekFooterAdvance }}>
        ⟳ Roll forward → next week becomes Week 1
      </button>
    </div>
  );
}

/** S1.8: three built-in starter weeks; applying one replaces the week and adds missing areas. */
function StarterWeeks({ data, week, onApply }: { data: CadenceData; week: WeekIndex; onApply: (id: string) => void }) {
  return (
    <div style={{ ...S.tplSection, ...S.weekFooterTpl }}>
      <div style={S.panelLabel}>Starter weeks</div>
      {STARTERS.map((st) => {
        const note = addedNote(missingAreas(data.cats, st).map((a) => a.name));
        return (
          <div key={st.id} style={{ ...S.tplRow, ...S.starterRow }}>
            <span style={S.starterText}>
              <span style={S.tplName}>{st.name}</span>
              <span style={S.starterBlurb}>{st.blurb}</span>
              {note && <span style={S.starterNote}>{note}</span>}
            </span>
            <button
              onClick={() => onApply(st.id)}
              style={S.tplApply}
              aria-label={`Apply ${st.name} to Week ${week + 1}`}
            >
              apply
            </button>
          </div>
        );
      })}
    </div>
  );
}
