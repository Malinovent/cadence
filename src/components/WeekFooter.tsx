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
  actions: Pick<CadenceActions, "saveTemplate" | "deleteTemplate" | "saveDayTemplate">;
  onApplyTemplate: (id: string) => void; // opens its preview; using it replaces the week (Undo offered)
  onApplyStarter: (id: string) => void;
  onApplyDay: (id: string) => void; // a day template: its preview, which asks the day
  /** the day "＋ Save a day" starts on (the phone's day, else today) */
  day: number;
  /** the phone puts day templates first */
  phone?: boolean;
  onAdvance: () => void;
};

/** S1.4: below the grid, templates, "Save current week" and roll forward. */
export default function WeekFooter({
  data,
  week,
  actions,
  onApplyTemplate,
  onApplyStarter,
  onApplyDay,
  day,
  phone = false,
  onAdvance,
}: Props) {
  const { m } = useI18n();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const empty = data.weeks[week].length === 0;
  const weekTemplates = data.templates.filter((t) => !t.day);

  const save = (n: string) => {
    actions.saveTemplate(week, n.trim() || m.footer.templateName(weekTemplates.length + 1));
    setNaming(false);
    setName("");
  };
  const cancel = () => {
    setNaming(false);
    setName("");
  };

  const days = <DayTemplates data={data} week={week} day={day} actions={actions} onApply={onApplyDay} />;
  return (
    <div style={S.weekFooter}>
      {phone && days}
      <div style={{ ...S.tplSection, ...S.weekFooterTpl }}>
        <div style={S.panelLabel}>{m.footer.templates}</div>
        {naming ? (
          <div style={S.tplNameRow}>
            <input
              autoFocus
              value={name}
              placeholder={m.footer.templateName(weekTemplates.length + 1)}
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
        {weekTemplates.length === 0 && !naming && <div style={S.tplEmpty}>{m.footer.noTemplates}</div>}
        {weekTemplates.map((t) => (
          <div key={t.id} style={S.tplRow}>
            <span style={S.tplName}>{t.name}</span>
            <button onClick={() => onApplyTemplate(t.id)} style={S.tplApply}>
              {m.footer.apply}
            </button>
            <button onClick={() => actions.deleteTemplate(t.id)} style={S.tplDel}>
              ✕
            </button>
          </div>
        ))}
      </div>
      {!phone && days}
      <StarterWeeks data={data} week={week} onApply={onApplyStarter} />
      <button onClick={onAdvance} style={{ ...S.advanceBtn, ...S.weekFooterAdvance }}>
        {m.footer.rollForward}
      </button>
    </div>
  );
}

/** Day templates (JP, 2026-11-08): save one day of the week, use it on any day. */
function DayTemplates({
  data,
  week,
  day,
  actions,
  onApply,
}: {
  data: CadenceData;
  week: WeekIndex;
  day: number;
  actions: Pick<CadenceActions, "saveDayTemplate" | "deleteTemplate">;
  onApply: (id: string) => void;
}) {
  const { m } = useI18n();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(day);
  const list = data.templates.filter((t) => t.day);
  const fallback = m.footer.dayTemplateName(list.length + 1);
  const hasBlocks = (d: number) => data.weeks[week].some((b) => b.day === d);
  const open = () => {
    setFrom(day);
    setNaming(true);
  };
  const save = () => {
    actions.saveDayTemplate(week, from, name.trim() || fallback);
    setNaming(false);
    setName("");
  };
  const cancel = () => {
    setNaming(false);
    setName("");
  };
  return (
    <div style={{ ...S.tplSection, ...S.weekFooterTpl }}>
      <div style={S.panelLabel}>{m.footer.dayTemplates}</div>
      {naming ? (
        <div style={{ ...S.tplNameRow, flexWrap: "wrap" }}>
          <select
            value={from}
            aria-label={m.footer.whichDay}
            onChange={(e) => setFrom(Number(e.target.value))}
            style={{ ...S.setSelect, minWidth: 0 }}
          >
            {m.preview.days.map((d, i) => (
              <option key={d} value={i} disabled={!hasBlocks(i)}>
                {d}
              </option>
            ))}
          </select>
          <input
            autoFocus
            value={name}
            placeholder={fallback}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasBlocks(from)) save();
              if (e.key === "Escape") cancel();
            }}
            style={{ ...S.tplNameInput, flex: "1 1 120px" }}
          />
          <button onClick={save} disabled={!hasBlocks(from)} style={S.tplSaveConfirm}>
            {m.footer.save}
          </button>
          <button onClick={cancel} style={S.tplDel}>
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={open}
          disabled={data.weeks[week].length === 0}
          style={{
            ...S.tplSave,
            opacity: data.weeks[week].length === 0 ? 0.4 : 1,
            cursor: data.weeks[week].length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {m.footer.saveDay}
        </button>
      )}
      {list.length === 0 && !naming && <div style={S.tplEmpty}>{m.footer.noDayTemplates}</div>}
      {list.map((t) => (
        <div key={t.id} style={S.tplRow}>
          <span style={S.tplName}>{t.name}</span>
          <button onClick={() => onApply(t.id)} style={S.tplApply}>
            {m.footer.apply}
          </button>
          <button onClick={() => actions.deleteTemplate(t.id)} style={S.tplDel}>
            ✕
          </button>
        </div>
      ))}
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
