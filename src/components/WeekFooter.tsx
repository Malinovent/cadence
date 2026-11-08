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
  onAdvance: () => void;
};

/**
 * S1.4: below the grid, templates and roll forward. Templates (JP, 2026-11-08): "＋ Save this week"
 * and "＋ Save a day" side by side, then the person's week templates and day templates, then the
 * starter weeks. Every "preview" opens what it would do first.
 */
export default function WeekFooter({
  data,
  week,
  actions,
  onApplyTemplate,
  onApplyStarter,
  onApplyDay,
  day,
  onAdvance,
}: Props) {
  const { m } = useI18n();
  const [naming, setNaming] = useState<"week" | "day" | null>(null);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(day);
  const blocks = data.weeks[week];
  const empty = blocks.length === 0;
  const weekTemplates = data.templates.filter((t) => !t.day);
  const dayTemplates = data.templates.filter((t) => t.day);
  const hasBlocks = (d: number) => blocks.some((b) => b.day === d);
  const fallback =
    naming === "day"
      ? m.footer.dayTemplateName(dayTemplates.length + 1)
      : m.footer.templateName(weekTemplates.length + 1);
  const canSave = naming === "week" ? !empty : naming === "day" ? hasBlocks(from) : false;

  const open = (kind: "week" | "day") => {
    // a day to save: the day shown when it has blocks, else the first that has some
    if (kind === "day") setFrom(hasBlocks(day) ? day : Math.max(0, [0, 1, 2, 3, 4, 5, 6].find(hasBlocks) ?? 0));
    setName("");
    setNaming(kind);
  };
  const cancel = () => {
    setNaming(null);
    setName("");
  };
  const save = () => {
    if (!canSave) return;
    const n = name.trim() || fallback;
    if (naming === "day") actions.saveDayTemplate(week, from, n);
    else actions.saveTemplate(week, n);
    cancel();
  };
  const saveBtn = (kind: "week" | "day", label: string) => (
    <button
      type="button"
      onClick={() => open(kind)}
      disabled={empty}
      aria-pressed={naming === kind}
      style={{
        ...S.tplSave,
        opacity: empty ? 0.4 : 1,
        cursor: empty ? "not-allowed" : "pointer",
        ...(naming === kind ? { borderStyle: "solid" } : {}),
      }}
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
  const namingRow = (kind: "week" | "day") =>
    naming === kind && (
      <div style={{ ...S.tplNameRow, flexWrap: "wrap" }}>
        {kind === "day" && (
          <select
            value={from}
            aria-label={m.footer.whichDay}
            onChange={(e) => setFrom(Number(e.target.value))}
            style={{ ...S.setSelect, minWidth: 0, flex: "1 1 100%" }}
          >
            {m.preview.days.map((d, i) => (
              <option key={d} value={i} disabled={!hasBlocks(i)}>
                {d}
              </option>
            ))}
          </select>
        )}
        <input
          autoFocus
          value={name}
          placeholder={fallback}
          aria-label={m.footer.templateNameLabel}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          style={{ ...S.tplNameInput, flex: "1 1 90px", minWidth: 0 }}
        />
        <button onClick={save} disabled={!canSave} style={S.tplSaveConfirm}>
          {m.footer.save}
        </button>
        <button onClick={cancel} style={S.tplDel} aria-label={m.footer.cancel}>
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
            {saveBtn("week", m.footer.saveWeek)}
            {namingRow("week")}
            {weekTemplates.map((t) => row(t, () => onApplyTemplate(t.id)))}
          </div>
          <div style={S.tplCol}>
            {saveBtn("day", m.footer.saveDay)}
            {namingRow("day")}
            {dayTemplates.map((t) => row(t, () => onApplyDay(t.id)))}
          </div>
        </div>
        {weekTemplates.length + dayTemplates.length === 0 && !naming && (
          <div style={S.tplEmpty}>{m.footer.noTemplates}</div>
        )}
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
