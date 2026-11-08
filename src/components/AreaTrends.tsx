import type { AreaTrend } from "../lib/statsWeeks";
import { S, line } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import { AreaMark } from "./AreaIconView";

/**
 * Stats → Last 12 weeks (JP, 2026-11-08): per area a small column per finished week, the target as
 * a dashed line (two for "between"), and how many weeks kept it. A week that missed is lighter;
 * the count says it in words too. Weeks before the first tick ever are a faint stub, not counted.
 */
export default function AreaTrends({ trends }: { trends: AreaTrend[] }) {
  const { m } = useI18n();
  return (
    <ul style={S.weekRows}>
      {trends.map(({ cat, weeks, kept, counted, scale }) => {
        const l = cat.limit;
        const lines = l.kind === "floor" ? [l.min] : l.kind === "ceiling" ? [l.max] : [l.min, l.max];
        const pct = (mins: number) => `${Math.min(1, mins / scale) * 100}%`;
        return (
          <li key={cat.id} style={S.trendRow}>
            <span style={S.weekRowName}>
              <AreaMark icon={cat.icon} color={cat.color} size={15} />
              <span style={S.weekRowNameText}>{cat.name}</span>
            </span>
            <span role="img" aria-label={m.stats.trendLabel(cat.name, kept, counted)} style={S.trendCols}>
              {weeks.map((w) =>
                w.counted ? (
                  <span
                    key={w.monday}
                    style={{
                      ...S.trendCol,
                      height: w.mins > 0 ? pct(w.mins) : 2,
                      background: cat.color,
                      opacity: w.kept ? 1 : 0.45,
                    }}
                  />
                ) : (
                  <span key={w.monday} style={{ ...S.trendCol, height: 2, background: line }} />
                ),
              )}
              {lines.map((mins, i) => (
                <span key={i} style={{ ...S.trendLine, bottom: pct(mins) }} />
              ))}
            </span>
            <span style={S.trendKept} aria-hidden="true">
              {m.stats.kept}
              <br />
              <b style={{ color: "var(--c-ink)" }}>{m.stats.keptOf(kept, counted)}</b>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
