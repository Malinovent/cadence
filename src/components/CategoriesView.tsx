import type { Category } from "../lib/model";
import { hoursToBlockMins, hoursToTargetMins } from "../lib/stats";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

type Props = {
  cats: Category[];
  actions: Pick<CadenceActions, "updateCat" | "addCat" | "removeCat">;
};

export default function CategoriesView({ cats, actions }: Props) {
  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>Define your blocks</h2>
      <p style={S.catIntro}>
        Set how much time you require per week (in hours), the default block length you drag in, and a color.
      </p>
      <div style={S.catList}>
        {cats.map((c) => (
          <div key={c.id} style={{ ...S.catRow, borderLeft: `6px solid ${c.color}` }}>
            <input value={c.name} onChange={(e) => actions.updateCat(c.id, { name: e.target.value })} style={S.catNameInput} />
            <label style={S.catField}>
              <span>Hours / week</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={c.targetMins / 60}
                onChange={(e) => actions.updateCat(c.id, { targetMins: hoursToTargetMins(+e.target.value) })}
                style={S.catNum}
              />
            </label>
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
        ))}
      </div>
      <button onClick={() => actions.addCat()} style={S.catAdd}>
        ＋ Add category
      </button>
    </div>
  );
}
