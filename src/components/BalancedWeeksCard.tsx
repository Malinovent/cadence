import type React from "react";
import type { Season, WeekMark } from "../lib/balancedWeeks";
import { S, paper } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

// filled = balanced, dashed = a grace week, faint = not balanced, outline = this week (still open).
// Never a flame, never red, never a "broken" message.
const SQUARE: Record<WeekMark, React.CSSProperties> = {
  balanced: { background: paper },
  grace: { border: `1.5px dashed ${paper}` },
  unbalanced: { border: "1.5px solid color-mix(in srgb, var(--c-paper) 30%, transparent)" },
  current: { border: `1.5px solid ${paper}` },
};
const fmtMonday = (key: string, locale: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });

/** S1.3: "5 balanced weeks this season", with a square per week. Compact above the grid (S1.4). */
export default function BalancedWeeksCard({
  season,
  footnote,
  compact,
}: {
  season: Season;
  footnote?: string;
  compact?: boolean;
}) {
  const { m, locale } = useI18n();
  const n = season.balancedCount;
  const hasGrace = season.weeks.some((w) => w.mark === "grace");
  return (
    <div style={{ ...S.seasonCard, ...(compact ? S.seasonCardCompact : {}) }}>
      <div style={{ ...S.seasonNum, ...(compact ? S.seasonNumCompact : {}) }}>{n}</div>
      <div>
        <div style={S.seasonLabel}>{m.season.label(n)}</div>
        <div style={S.seasonSquares} role="list" aria-label={m.season.squares}>
          {season.weeks.map((w) => {
            const label = m.season.week(fmtMonday(w.monday, locale), m.season.marks[w.mark]);
            return (
              <span
                key={w.monday}
                role="listitem"
                aria-label={label}
                title={label}
                style={{ ...S.seasonSquare, ...SQUARE[w.mark] }}
              />
            );
          })}
        </div>
        {hasGrace && <div style={S.seasonLegend}>{m.season.graceLegend}</div>}
        {footnote && <div style={{ ...S.seasonLegend, marginTop: 2 }}>{footnote}</div>}
      </div>
    </div>
  );
}
