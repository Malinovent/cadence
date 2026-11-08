import type React from "react";
import type { Season, WeekMark } from "../lib/balancedWeeks";
import { fromKey, monthStarts } from "../lib/statsWeeks";
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
  fromKey(key).toLocaleDateString(locale, { month: "short", day: "numeric" });

/**
 * S1.3: "5 balanced weeks this season", with a square per week. Compact above the grid (S1.4).
 * In Stats (JP, 2026-11-08) the squares are larger, months sit under them, and a tap shows that
 * week below (`onPick`, with the `picked` one outlined).
 */
export default function BalancedWeeksCard({
  season,
  footnote,
  compact,
  picked,
  onPick,
}: {
  season: Season;
  footnote?: string;
  compact?: boolean;
  picked?: string;
  onPick?: (monday: string) => void;
}) {
  const { m, locale } = useI18n();
  const n = season.balancedCount;
  const hasGrace = season.weeks.some((w) => w.mark === "grace");
  const starts = new Set(monthStarts(season.weeks.map((w) => w.monday)));
  return (
    <div style={{ ...S.seasonCard, ...(compact ? S.seasonCardCompact : {}) }}>
      <div style={{ ...S.seasonNum, ...(compact ? S.seasonNumCompact : {}) }}>{n}</div>
      <div>
        <div style={S.seasonLabel}>{m.season.label(n)}</div>
        {onPick ? (
          <div style={{ ...S.seasonSquares, gap: 2 }} role="group" aria-label={m.season.squares}>
            {season.weeks.map((w, i) => {
              const label = m.season.week(fmtMonday(w.monday, locale), m.season.marks[w.mark]);
              const on = picked === w.monday;
              return (
                <button
                  key={w.monday}
                  type="button"
                  aria-label={label}
                  aria-pressed={on}
                  title={label}
                  onClick={() => onPick(w.monday)}
                  style={S.seasonPick}
                >
                  <span
                    style={{
                      ...S.seasonSquare,
                      ...S.seasonSquareBig,
                      ...SQUARE[w.mark],
                      ...(on ? S.seasonPicked : {}),
                    }}
                  />
                  <span aria-hidden="true" style={S.seasonMonth}>
                    {starts.has(i) ? fromKey(w.monday).toLocaleDateString(locale, { month: "short" }) : ""}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
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
        )}
        {hasGrace && <div style={S.seasonLegend}>{m.season.graceLegend}</div>}
        {footnote && <div style={{ ...S.seasonLegend, marginTop: 2 }}>{footnote}</div>}
      </div>
    </div>
  );
}
