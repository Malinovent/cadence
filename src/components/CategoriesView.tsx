import { useState } from "react";
import { changeKind, type Limit, type LimitKind } from "../lib/guardrail";
import type { Category } from "../lib/model";
import { Plus } from "lucide-react";
import { AreaIconView } from "./AreaIconView";
import { AREA_ICONS } from "../lib/icons";
import { hoursToBlockMins, hoursToTargetMins } from "../lib/stats";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  cats: Category[];
  actions: Pick<CadenceActions, "updateCat" | "addCat" | "removeCat">;
};

const KINDS: LimitKind[] = ["floor", "ceiling", "range"];

function HoursInput({ label, mins, onChange }: { label: string; mins: number; onChange: (mins: number) => void }) {
  return (
    <label style={S.catField}>
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="0.5"
        value={mins / 60}
        onChange={(e) => onChange(hoursToTargetMins(Math.max(0, +e.target.value || 0)))}
        style={S.catNum}
      />
    </label>
  );
}

function GuardrailField({ cat, onChange }: { cat: Category; onChange: (limit: Limit) => void }) {
  const { m } = useI18n();
  const l = cat.limit;
  const hint = m.categories.kinds[l.kind].hint;
  return (
    <div style={S.catGuard}>
      <div style={S.kindGroup} role="group" aria-label={m.categories.guardrail(cat.name || m.categories.area)}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={l.kind === k}
            onClick={() => onChange(changeKind(l, k, cat.blockMins))}
            style={{ ...S.kindBtn, ...(l.kind === k ? S.kindBtnActive : {}) }}
          >
            {m.categories.kinds[k].label}
          </button>
        ))}
      </div>
      <span style={S.catGuardHint}>{hint}</span>
    </div>
  );
}

function LimitHours({ limit: l, onChange }: { limit: Limit; onChange: (limit: Limit) => void }) {
  const { m } = useI18n();
  if (l.kind === "floor")
    return <HoursInput label={m.categories.atLeast} mins={l.min} onChange={(min) => onChange({ ...l, min })} />;
  if (l.kind === "ceiling")
    return <HoursInput label={m.categories.atMost} mins={l.max} onChange={(max) => onChange({ ...l, max })} />;
  // keep the range the right way round as either end moves
  return (
    <>
      <HoursInput
        label={m.categories.from}
        mins={l.min}
        onChange={(min) => onChange({ ...l, min, max: Math.max(min, l.max) })}
      />
      <HoursInput
        label={m.categories.to}
        mins={l.max}
        onChange={(max) => onChange({ ...l, max, min: Math.min(max, l.min) })}
      />
    </>
  );
}

export default function CategoriesView({ cats, actions }: Props) {
  const { m } = useI18n();
  const [picking, setPicking] = useState<string | null>(null); // the area whose icon grid is open
  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>{m.categories.title}</h2>
      <p style={S.catIntro}>{m.categories.intro}</p>
      <div style={S.catList}>
        {cats.map((c) => {
          const setLimit = (limit: Limit) => actions.updateCat(c.id, { limit });
          return (
            <div key={c.id} style={{ ...S.catRow, borderLeft: `6px solid ${c.color}` }}>
              <button
                type="button"
                aria-expanded={picking === c.id}
                aria-label={m.categories.icon(c.name)}
                title={m.categories.icon(c.name)}
                onClick={() => setPicking(picking === c.id ? null : c.id)}
                style={{ ...S.iconBtn, color: c.color }}
              >
                {c.icon ? <AreaIconView icon={c.icon} size={20} /> : <Plus size={18} aria-hidden="true" />}
              </button>
              <input
                value={c.name}
                onChange={(e) => actions.updateCat(c.id, { name: e.target.value })}
                style={S.catNameInput}
              />
              <GuardrailField cat={c} onChange={setLimit} />
              <LimitHours limit={c.limit} onChange={setLimit} />
              <label style={S.catField}>
                <span>{m.categories.block}</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={c.blockMins / 60}
                  onChange={(e) => actions.updateCat(c.id, { blockMins: hoursToBlockMins(+e.target.value) })}
                  style={S.catNum}
                />
              </label>
              <input
                type="color"
                value={c.color}
                onChange={(e) => actions.updateCat(c.id, { color: e.target.value })}
                style={S.catColor}
              />
              <button onClick={() => actions.removeCat(c.id)} style={S.catDel} aria-label={m.categories.remove(c.name)}>
                ✕
              </button>
              {picking === c.id && (
                <div role="group" aria-label={m.categories.icon(c.name)} style={S.iconGrid}>
                  <button
                    type="button"
                    aria-pressed={!c.icon}
                    onClick={() => {
                      actions.updateCat(c.id, { icon: undefined });
                      setPicking(null);
                    }}
                    style={{ ...S.iconPick, ...(c.icon ? {} : S.iconPickOn), fontSize: 12 }}
                  >
                    {m.categories.noIcon}
                  </button>
                  {AREA_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      aria-pressed={c.icon === ic}
                      aria-label={ic}
                      onClick={() => {
                        actions.updateCat(c.id, { icon: ic });
                        setPicking(null);
                      }}
                      style={{ ...S.iconPick, color: c.color, ...(c.icon === ic ? S.iconPickOn : {}) }}
                    >
                      <AreaIconView icon={ic} size={20} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button data-coach="areas-page" onClick={() => actions.addCat(undefined, m.categories.newName)} style={S.catAdd}>
        {m.categories.add}
      </button>
    </div>
  );
}
