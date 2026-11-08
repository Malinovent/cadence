import type { AreaLine, Direction } from "../lib/statsWeeks";
import { fmtDur } from "../lib/time";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import { AreaMark } from "./AreaIconView";

const ARROW: Record<Direction, string> = { up: "↗", down: "↘", steady: "→" };
const W = 100; // the line's own units; it stretches to the row
const H = 36;

/**
 * Stats → Trends (JP, 2026-11-08, option A of docs/mockups/stats-trends.html): per area its hours a
 * week as a line over the chosen range, the target dashed (two lines for "between"), then its last 4
 * weeks' average and an arrow against the 4 weeks before: ↗ / ↘ with how much, → steady. Neutral:
 * arrows and words in ink, never red for less.
 */
export default function TrendLines({ lines }: { lines: AreaLine[] }) {
  const { m, lang } = useI18n();
  return (
    <ul style={S.weekRows}>
      {lines.map(({ cat, points, recent, direction, change, scale }) => {
        const l = cat.limit;
        const targets = l.kind === "floor" ? [l.min] : l.kind === "ceiling" ? [l.max] : [l.min, l.max];
        const y = (mins: number) => H - 1 - Math.min(1, mins / scale) * (H - 2);
        const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * W : W / 2);
        const avg = fmtDur(recent, lang);
        return (
          <li key={cat.id} style={S.lineRow}>
            <span style={S.weekRowName}>
              <AreaMark icon={cat.icon} color={cat.color} size={15} />
              <span style={S.weekRowNameText}>{cat.name}</span>
            </span>
            <svg
              role="img"
              aria-label={m.stats.lineLabel(cat.name, avg, direction, fmtDur(change, lang))}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              style={S.lineSvg}
            >
              {targets.map((t, i) => (
                <line
                  key={i}
                  x1={0}
                  x2={W}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--c-ink)"
                  strokeOpacity={0.55}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {points.length > 1 ? (
                <polyline
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  points={points.map((p, i) => `${x(i)},${y(p)}`).join(" ")}
                />
              ) : (
                points.length === 1 && (
                  <line
                    x1={W / 2}
                    x2={W / 2}
                    y1={y(points[0])}
                    y2={y(points[0])}
                    stroke={cat.color}
                    strokeWidth={5}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              )}
            </svg>
            <span style={S.lineValue} aria-hidden="true">
              <span>
                <b>{avg}</b> <span style={{ color: "var(--c-muted)" }}>{m.stats.aWeek}</span>
              </span>
              {direction && (
                <span>
                  {ARROW[direction]} {direction === "steady" ? m.stats.steady : fmtDur(change, lang)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
