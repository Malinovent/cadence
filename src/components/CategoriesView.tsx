import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { changeKind, fmtH, limitLabel, type Limit, type LimitKind } from "../lib/guardrail";
import type { Category } from "../lib/model";
import { PALETTE } from "../lib/constants";
import { AreaIconView } from "./AreaIconView";
import { AREA_ICONS } from "../lib/icons";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  cats: Category[];
  actions: Pick<CadenceActions, "updateCat" | "addCat" | "removeCat">;
};

const KINDS: LimitKind[] = ["floor", "ceiling", "range"];
const STEP = 30; // half an hour

/** − 4 h ＋, in half hours: no keyboard on the phone (JP, 2026-11-08) */
function Stepper({
  label,
  mins,
  min = 0,
  onChange,
}: {
  label: string;
  mins: number;
  min?: number;
  onChange: (mins: number) => void;
}) {
  const { m } = useI18n();
  const down = Math.max(min, mins - STEP);
  return (
    <div>
      <div style={S.areaLabel}>{label}</div>
      <div style={S.stepper} role="group" aria-label={label}>
        <button
          type="button"
          disabled={down === mins}
          aria-label={m.categories.less(label)}
          onClick={() => onChange(down)}
          style={{ ...S.stepBtn, ...(down === mins ? { opacity: 0.35, cursor: "not-allowed" } : {}) }}
        >
          −
        </button>
        <span style={S.stepVal} aria-live="polite">
          {m.categories.hours(fmtH(mins))}
        </span>
        <button
          type="button"
          aria-label={m.categories.more(label)}
          onClick={() => onChange(mins + STEP)}
          style={S.stepBtn}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

function LimitHours({ limit: l, onChange }: { limit: Limit; onChange: (limit: Limit) => void }) {
  const { m } = useI18n();
  if (l.kind === "floor")
    return <Stepper label={m.categories.hoursLabel} mins={l.min} onChange={(min) => onChange({ ...l, min })} />;
  if (l.kind === "ceiling")
    return <Stepper label={m.categories.hoursLabel} mins={l.max} onChange={(max) => onChange({ ...l, max })} />;
  // keep the range the right way round as either end moves
  return (
    <>
      <Stepper
        label={m.categories.from}
        mins={l.min}
        onChange={(min) => onChange({ ...l, min, max: Math.max(min, l.max) })}
      />
      <Stepper
        label={m.categories.to}
        mins={l.max}
        onChange={(max) => onChange({ ...l, max, min: Math.min(max, l.min) })}
      />
    </>
  );
}

/** "At least 4 h" with the key word in bold, so the kind reads first (JP, 2026-11-08) */
function GoalText({ limit }: { limit: Limit }) {
  const { m } = useI18n();
  const text = limitLabel(limit, m.lib);
  const word = m.categories.kinds[limit.kind].label;
  if (!text.startsWith(word)) return <>{text}</>;
  return (
    <>
      <strong style={S.areaGoalWord}>{word}</strong>
      {text.slice(word.length)}
    </>
  );
}

/** The area's icon, or its initial, on its colour */
function AreaBadge({ cat }: { cat: Category }) {
  return (
    <span style={{ ...S.areaBadge, background: cat.color }} aria-hidden="true">
      {cat.icon ? <AreaIconView icon={cat.icon} size={18} /> : (cat.name.trim() || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function AreaEditor({
  cat: c,
  actions,
  onDeleted,
}: {
  cat: Category;
  actions: Props["actions"];
  onDeleted: () => void;
}) {
  const { m } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const setLimit = (limit: Limit) => actions.updateCat(c.id, { limit });
  const custom = !PALETTE.some((p) => p.toLowerCase() === c.color.toLowerCase());
  return (
    <div style={S.areaEdit}>
      <label>
        <div style={S.areaLabel}>{m.categories.name}</div>
        <input
          value={c.name}
          onChange={(e) => actions.updateCat(c.id, { name: e.target.value })}
          style={S.areaNameInput}
        />
      </label>
      <div>
        <div style={S.areaLabel}>{m.categories.eachWeek}</div>
        <div
          style={{ ...S.previewDays, gridTemplateColumns: "repeat(3, 1fr)" }}
          role="group"
          aria-label={m.categories.guardrail(c.name || m.categories.area)}
        >
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={c.limit.kind === k}
              onClick={() => setLimit(changeKind(c.limit, k, c.blockMins))}
              style={{ ...S.previewDay, ...(c.limit.kind === k ? S.kindBtnActive : {}) }}
            >
              {m.categories.kinds[k].label}
            </button>
          ))}
        </div>
        <div style={S.catGuardHint}>{m.categories.kinds[c.limit.kind].hint}</div>
      </div>
      <div style={S.areaSteppers}>
        <LimitHours limit={c.limit} onChange={setLimit} />
        <Stepper
          label={m.categories.block}
          mins={c.blockMins}
          min={STEP}
          onChange={(blockMins) => actions.updateCat(c.id, { blockMins })}
        />
      </div>
      <div>
        <div style={S.areaLabel}>{m.categories.colour}</div>
        <div style={S.swatches} role="group" aria-label={m.categories.colour}>
          {PALETTE.map((p) => {
            const on = p.toLowerCase() === c.color.toLowerCase();
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                aria-label={p}
                onClick={() => actions.updateCat(c.id, { color: p })}
                style={{ ...S.swatch, background: p, ...(on ? S.swatchOn : {}) }}
              />
            );
          })}
          <label
            title={m.categories.anyColour}
            style={{
              ...S.swatch,
              background: custom ? c.color : "conic-gradient(#e8643c, #c9a227, #1fa98a, #3c6fe8, #9b4dca, #e8643c)",
              ...(custom ? S.swatchOn : {}),
            }}
          >
            <input
              type="color"
              value={c.color}
              aria-label={m.categories.anyColour}
              onChange={(e) => actions.updateCat(c.id, { color: e.target.value })}
              style={S.swatchInput}
            />
          </label>
        </div>
      </div>
      <div>
        <div style={S.areaLabel}>{m.categories.iconLabel}</div>
        <div role="group" aria-label={m.categories.icon(c.name)} style={S.iconGrid}>
          <button
            type="button"
            aria-pressed={!c.icon}
            onClick={() => actions.updateCat(c.id, { icon: undefined })}
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
              onClick={() => actions.updateCat(c.id, { icon: ic })}
              style={{ ...S.iconPick, color: c.color, ...(c.icon === ic ? S.iconPickOn : {}) }}
            >
              <AreaIconView icon={ic} size={20} />
            </button>
          ))}
        </div>
      </div>
      {confirming ? (
        <div style={S.areaConfirm} role="group" aria-label={m.categories.remove(c.name)}>
          <span style={{ flex: "1 1 180px" }}>{m.categories.confirmDelete(c.name || m.categories.area)}</span>
          <button
            type="button"
            onClick={() => {
              actions.removeCat(c.id);
              onDeleted();
            }}
            style={S.areaConfirmYes}
          >
            {m.categories.remove(c.name || m.categories.area)}
          </button>
          <button type="button" onClick={() => setConfirming(false)} style={S.setLink}>
            {m.categories.keep}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          style={{ ...S.setLink, alignSelf: "flex-start", fontWeight: 400, color: "var(--c-muted)", padding: 0 }}
        >
          {m.categories.deleteArea}
        </button>
      )}
    </div>
  );
}

/**
 * The Areas tab (JP, 2026-11-08): a short list (icon on colour, name, weekly goal, block length);
 * tap an area to change it. One open at a time. Steppers in half hours, palette swatches plus any
 * colour, the icon grid, and a delete that asks first (its blocks and history go with it).
 */
export default function CategoriesView({ cats, actions }: Props) {
  const { m } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  // a new area opens, ready to name
  const count = useRef(cats.length);
  useEffect(() => {
    if (cats.length > count.current) setOpen(cats[cats.length - 1].id);
    count.current = cats.length;
  }, [cats]);
  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>{m.categories.title}</h2>
      <p style={S.catIntro}>{m.categories.intro}</p>
      <div style={{ ...S.setCard, marginTop: 16 }}>
        {cats.map((c) => {
          const isOpen = open === c.id;
          const Chevron = isOpen ? ChevronDown : ChevronRight;
          return (
            <div key={c.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : c.id)}
                style={{ ...S.setRowBtn, minHeight: 60, ...(isOpen ? { background: "var(--c-field)" } : {}) }}
              >
                <AreaBadge cat={c} />
                <span style={{ ...S.setLabel, flex: "1 1 0", overflowWrap: "anywhere" }}>
                  {c.name || m.categories.area}
                </span>
                <span style={S.areaGoal}>
                  <GoalText limit={c.limit} />
                  <br />
                  {m.categories.blocks(fmtH(c.blockMins))}
                </span>
                <Chevron size={18} aria-hidden="true" style={{ color: "var(--c-muted)", flexShrink: 0 }} />
              </button>
              {isOpen && <AreaEditor cat={c} actions={actions} onDeleted={() => setOpen(null)} />}
            </div>
          );
        })}
      </div>
      <button
        data-coach="areas-page"
        onClick={() => actions.addCat(undefined, m.categories.newName)}
        style={{ ...S.catAdd, width: "100%" }}
      >
        {m.categories.add}
      </button>
    </div>
  );
}
