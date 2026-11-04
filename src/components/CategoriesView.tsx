import { changeKind, type Limit, type LimitKind } from "../lib/guardrail";
import type { Category } from "../lib/model";
import { hoursToBlockMins, hoursToTargetMins } from "../lib/stats";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

type Props = {
  cats: Category[];
  actions: Pick<CadenceActions, "updateCat" | "addCat" | "removeCat">;
};

const KINDS: { kind: LimitKind; label: string; hint: string }[] = [
  { kind: "floor", label: "Floor", hint: "A floor protects at least this much time each week." },
  { kind: "ceiling", label: "Ceiling", hint: "A ceiling keeps this to at most this much each week." },
  { kind: "range", label: "Range", hint: "A range counts fully anywhere in between." },
];

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
  const l = cat.limit;
  const hint = KINDS.find((k) => k.kind === l.kind)!.hint;
  return (
    <div style={S.catGuard}>
      <div style={S.kindGroup} role="group" aria-label={`${cat.name || "Area"} guardrail`}>
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            aria-pressed={l.kind === k.kind}
            onClick={() => onChange(changeKind(l, k.kind, cat.blockMins))}
            style={{ ...S.kindBtn, ...(l.kind === k.kind ? S.kindBtnActive : {}) }}
          >
            {k.label}
          </button>
        ))}
      </div>
      <span style={S.catGuardHint}>{hint}</span>
    </div>
  );
}

function LimitHours({ limit: l, onChange }: { limit: Limit; onChange: (limit: Limit) => void }) {
  if (l.kind === "floor") return <HoursInput label="At least (h/week)" mins={l.min} onChange={(min) => onChange({ ...l, min })} />;
  if (l.kind === "ceiling") return <HoursInput label="At most (h/week)" mins={l.max} onChange={(max) => onChange({ ...l, max })} />;
  // keep the range the right way round as either end moves
  return (
    <>
      <HoursInput label="From (h/week)" mins={l.min} onChange={(min) => onChange({ ...l, min, max: Math.max(min, l.max) })} />
      <HoursInput label="To (h/week)" mins={l.max} onChange={(max) => onChange({ ...l, max, min: Math.min(max, l.min) })} />
    </>
  );
}

export default function CategoriesView({ cats, actions }: Props) {
  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>Define your blocks</h2>
      <p style={S.catIntro}>
        For each area, set a floor, a ceiling or a range of hours per week, the default block length you drag in, and a
        color. Each week starts fresh.
      </p>
      <div style={S.catList}>
        {cats.map((c) => {
          const setLimit = (limit: Limit) => actions.updateCat(c.id, { limit });
          return (
            <div key={c.id} style={{ ...S.catRow, borderLeft: `6px solid ${c.color}` }}>
              <input value={c.name} onChange={(e) => actions.updateCat(c.id, { name: e.target.value })} style={S.catNameInput} />
              <GuardrailField cat={c} onChange={setLimit} />
              <LimitHours limit={c.limit} onChange={setLimit} />
              <label style={S.catField}>
                <span>Block (hrs)</span>
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
              <button onClick={() => actions.removeCat(c.id)} style={S.catDel}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={() => actions.addCat()} style={S.catAdd}>
        ＋ Add category
      </button>
    </div>
  );
}
