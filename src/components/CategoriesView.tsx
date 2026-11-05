import { changeKind, type Limit, type LimitKind } from "../lib/guardrail";
import type { Category } from "../lib/model";
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
  if (l.kind === "floor") return <HoursInput label={m.categories.atLeast} mins={l.min} onChange={(min) => onChange({ ...l, min })} />;
  if (l.kind === "ceiling") return <HoursInput label={m.categories.atMost} mins={l.max} onChange={(max) => onChange({ ...l, max })} />;
  // keep the range the right way round as either end moves
  return (
    <>
      <HoursInput label={m.categories.from} mins={l.min} onChange={(min) => onChange({ ...l, min, max: Math.max(min, l.max) })} />
      <HoursInput label={m.categories.to} mins={l.max} onChange={(max) => onChange({ ...l, max, min: Math.min(max, l.min) })} />
    </>
  );
}

export default function CategoriesView({ cats, actions }: Props) {
  const { m } = useI18n();
  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>{m.categories.title}</h2>
      <p style={S.catIntro}>{m.categories.intro}</p>
      <div style={S.catList}>
        {cats.map((c) => {
          const setLimit = (limit: Limit) => actions.updateCat(c.id, { limit });
          return (
            <div key={c.id} style={{ ...S.catRow, borderLeft: `6px solid ${c.color}` }}>
              <input value={c.name} onChange={(e) => actions.updateCat(c.id, { name: e.target.value })} style={S.catNameInput} />
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
            </div>
          );
        })}
      </div>
      <button onClick={() => actions.addCat(undefined, m.categories.newName)} style={S.catAdd}>
        {m.categories.add}
      </button>
    </div>
  );
}
