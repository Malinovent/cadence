import { useState } from "react";
import type { WeekIndex } from "../lib/actions";
import type { CadenceData } from "../lib/model";
import { completion, quotaStatus } from "../lib/stats";
import { fmtDur } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import type { DragRef } from "./drag";

type Props = {
  data: CadenceData;
  week: WeekIndex;
  setWeek: (w: WeekIndex) => void;
  dragRef: DragRef;
  actions: Pick<CadenceActions, "saveTemplate" | "applyTemplate" | "deleteTemplate">;
  onAdvance: () => void;
};

export default function Sidebar({ data, week, setWeek, dragRef, actions, onAdvance }: Props) {
  const [namingTemplate, setNamingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const blocks = data.weeks[week];
  const quotas = quotaStatus(data, week);
  const done = completion(data, week);

  const save = (name: string) => {
    actions.saveTemplate(week, name);
    setNamingTemplate(false);
    setTemplateName("");
  };
  const cancelNaming = () => {
    setNamingTemplate(false);
    setTemplateName("");
  };

  return (
    <aside className="cadence-side" style={S.sidebar}>
      <div style={S.weekToggle}>
        {(["Week 1", "Week 2"] as const).map((w, i) => (
          <button
            key={w}
            onClick={() => setWeek(i as WeekIndex)}
            style={{ ...S.weekBtn, ...(week === i ? S.weekBtnActive : {}) }}
          >
            {w}
          </button>
        ))}
      </div>

      <div style={S.panelLabel}>Drag into the grid</div>
      <div className="cadence-tray" style={S.tray}>
        {data.cats.map((c) => (
          <div
            key={c.id}
            draggable
            onDragStart={(e) => {
              dragRef.current = { type: "tray", catId: c.id };
              e.dataTransfer.effectAllowed = "copy";
            }}
            style={{ ...S.trayBlock, border: `1.5px dashed ${c.color}`, color: c.color }}
          >
            <span>{c.name}</span>
            <span style={{ ...S.trayMins, color: c.color }}>{fmtDur(c.blockMins)}</span>
          </div>
        ))}
      </div>

      <div className="cadence-after" style={S.panelLabel}>This week's time targets</div>
      <div className="cadence-after" style={S.quotaList}>
        {quotas.map((q) => (
          <div key={q.cat.id} style={S.quotaRow}>
            <span style={{ ...S.dot, background: q.cat.color }} />
            <span style={S.quotaName}>{q.cat.name}</span>
            <div style={S.quotaBarWrap}>
              <div
                style={{
                  ...S.quotaBar,
                  width: `${Math.min(100, (q.placedMins / q.cat.targetMins) * 100)}%`,
                  background: q.met ? q.cat.color : "#cabfb2",
                }}
              />
            </div>
            <span style={{ ...S.quotaCount, color: q.met ? "#1FA98A" : "#9a8d7d" }}>
              {fmtDur(q.placedMins)}/{fmtDur(q.cat.targetMins)}
              {q.met && " ✓"}
            </span>
          </div>
        ))}
      </div>

      <div className="cadence-after" style={S.completionCard}>
        <div style={S.completionPct}>{done.pct}%</div>
        <div style={S.completionLabel}>
          sessions done this week ({done.done}/{done.total})
        </div>
      </div>

      <div className="cadence-after" style={S.tplSection}>
        <div style={S.panelLabel}>Templates</div>
        {namingTemplate ? (
          <div style={S.tplNameRow}>
            <input
              autoFocus
              value={templateName}
              placeholder={`Template ${data.templates.length + 1}`}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save(templateName);
                if (e.key === "Escape") cancelNaming();
              }}
              style={S.tplNameInput}
            />
            <button onClick={() => save(templateName)} style={S.tplSaveConfirm}>
              save
            </button>
            <button onClick={cancelNaming} style={S.tplDel}>
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNamingTemplate(true)}
            disabled={blocks.length === 0}
            style={{
              ...S.tplSave,
              opacity: blocks.length === 0 ? 0.4 : 1,
              cursor: blocks.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            ＋ Save current week
          </button>
        )}
        {data.templates.length === 0 && !namingTemplate && <div style={S.tplEmpty}>No templates yet.</div>}
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

      <button className="cadence-after" onClick={onAdvance} style={S.advanceBtn}>
        ⟳ Roll forward → next week becomes Week 1
      </button>
    </aside>
  );
}
