import type React from "react";
import type { Season, WeekMark } from "../lib/balancedWeeks";
import { S, paper } from "../styles";

// filled = balanced, dashed = a grace week, faint = not balanced, outline = this week (still open).
// Never a flame, never red, never a "broken" message.
const SQUARE: Record<WeekMark, React.CSSProperties> = {
  balanced: { background: paper },
  grace: { border: `1.5px dashed ${paper}` },
  unbalanced: { border: "1.5px solid rgba(244, 237, 225, 0.3)" },
  current: { border: `1.5px solid ${paper}` },
};
const WORD: Record<WeekMark, string> = {
  balanced: "balanced",
  grace: "a grace week",
  unbalanced: "not balanced",
  current: "this week, still open",
};

const fmtMonday = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** S1.3: "5 balanced weeks this season", with a square per week. Compact above the grid (S1.4). */
export default function BalancedWeeksCard({ season, footnote, compact }: { season: Season; footnote?: string; compact?: boolean }) {
  const n = season.balancedCount;
  const hasGrace = season.weeks.some((w) => w.mark === "grace");
  return (
    <div style={{ ...S.seasonCard, ...(compact ? S.seasonCardCompact : {}) }}>
      <div style={{ ...S.seasonNum, ...(compact ? S.seasonNumCompact : {}) }}>{n}</div>
      <div>
        <div style={S.seasonLabel}>{n === 1 ? "balanced week this season" : "balanced weeks this season"}</div>
        <div style={S.seasonSquares} role="list" aria-label="This season's weeks">
          {season.weeks.map((w) => {
            const label = `Week of ${fmtMonday(w.monday)}: ${WORD[w.mark]}`;
            return <span key={w.monday} role="listitem" aria-label={label} title={label} style={{ ...S.seasonSquare, ...SQUARE[w.mark] }} />;
          })}
        </div>
        {hasGrace && <div style={S.seasonLegend}>Dashed square: a grace week</div>}
        {footnote && <div style={{ ...S.seasonLegend, marginTop: 2 }}>{footnote}</div>}
      </div>
    </div>
  );
}
