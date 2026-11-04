import { balanceLabel, barGeometry, limitLabel } from "../lib/guardrail";
import type { AreaBalance } from "../lib/stats";
import { S } from "../styles";

/** This week's guardrail balance per area (S1.2), plus calm notes for what's off. */
export default function BalanceList({ rows }: { rows: AreaBalance[] }) {
  const notes = rows.map((r) => r.note).filter((n): n is string => !!n);
  return (
    <div className="cadence-after">
      <div style={S.balanceList}>
        {rows.map(({ cat, balance }) => {
          const g = barGeometry(balance);
          return (
            <div key={cat.id}>
              <div style={S.balanceHead}>
                <span style={{ ...S.dot, background: cat.color, alignSelf: "center" }} />
                <span style={S.balanceName}>{cat.name || "Untitled"}</span>
                <span style={S.balanceKind}>{limitLabel(cat.limit)}</span>
                <span style={S.balanceCount}>{balanceLabel(balance)}</span>
              </div>
              <div style={S.balanceTrack} aria-hidden="true">
                {g.band && <div style={{ ...S.balanceBand, left: `${g.band.left}%`, width: `${g.band.width}%` }} />}
                <div style={{ ...S.balanceFill, width: `${g.fill}%`, background: cat.color }} />
                {g.gap && <div style={{ ...S.balanceGap, left: `${g.gap.left}%`, width: `${g.gap.width}%` }} />}
                {g.marks.map((m, i) => (
                  <div key={i} style={{ ...S.balanceMark, left: `${m}%` }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {notes.length > 0 && (
        <div style={S.balanceNotes} role="status">
          {notes.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}
