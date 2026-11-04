import { useState } from "react";
import type { WeekIndex } from "../lib/actions";
import type { CadenceData } from "../lib/model";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

type Props = {
  data: CadenceData;
  week: WeekIndex;
  actions: Pick<CadenceActions, "saveTemplate" | "applyTemplate" | "deleteTemplate">;
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
        {data.templates.length === 0 && !naming && <div style={S.tplEmpty}>No templates yet.</div>}
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
      <button onClick={onAdvance} style={{ ...S.advanceBtn, ...S.weekFooterAdvance }}>
        ⟳ Roll forward → next week becomes Week 1
      </button>
    </div>
  );
}
