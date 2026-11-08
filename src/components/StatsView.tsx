import { useState } from "react";
import type { CadenceData } from "../lib/model";
import { dayKey, mondayOf, season } from "../lib/balancedWeeks";
import {
  areaLines,
  areaTrends,
  fromKey,
  shiftWeek,
  TREND_RANGES,
  weekRows,
  weekSpan,
  type TrendRange,
} from "../lib/statsWeeks";
import { readBalanceRules } from "../state/balanceRules";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BalancedWeeksCard from "./BalancedWeeksCard";
import WeekRows from "./WeekRows";
import AreaTrends from "./AreaTrends";
import TrendLines from "./TrendLines";

type Props = {
  data: CadenceData;
};

/**
 * Stats (JP, 2026-11-08, "more love"): the season's squares (tap one for its week), any week with
 * ‹ ›, each area's bar and what it missed by, the last 12 weeks per area, then Trends: a line per
 * area over 12 weeks, 6 months or a year (JP, 2026-11-08, option A). Time invested is gone. Before
 * anything is ticked, a short empty state instead. Reset lives in Settings now.
 */
export default function StatsView({ data }: Props) {
  const { m, locale } = useI18n();
  const now = new Date();
  const thisWeek = dayKey(mondayOf(now));
  const lastWeek = shiftWeek(thisWeek, -1);
  const [picked, setPicked] = useState(lastWeek);
  const rules = readBalanceRules();
  const span = weekSpan(data.history, now);
  const week = picked < span.first ? span.first : picked > span.last ? span.last : picked;
  const open = week === span.last;
  const trends = areaTrends(data.cats, data.history, now, rules);
  const [range, setRange] = useState<TrendRange>(26);
  const lines = areaLines(data.cats, data.history, now, range);
  const empty = data.history.length === 0;

  const weekDate = fromKey(week).toLocaleDateString(locale, { month: "short", day: "numeric" });

  return (
    <div style={S.statsBody}>
      <div style={{ marginBottom: 24 }}>
        <BalancedWeeksCard
          season={season(data.cats, data.history, now, rules)}
          {...(empty ? {} : { picked: week, onPick: setPicked })}
        />
      </div>

      {empty ? (
        <section style={S.statsEmpty} aria-labelledby="stats-empty">
          <h2 id="stats-empty" style={S.statsSubtitle}>
            {m.stats.emptyTitle}
          </h2>
          <p style={S.statsEmptyText}>{m.stats.emptyText}</p>
          <div aria-hidden="true" style={{ opacity: 0.35, display: "grid", gap: 10 }}>
            {data.cats.slice(0, 3).map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 70, height: 10, borderRadius: 5, background: "var(--c-line)" }} />
                <span style={{ ...S.countBar, maxWidth: 220 }}>
                  <span style={{ ...S.countBarFill, width: `${[70, 45, 85][i]}%`, background: c.color }} />
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* any week, one row per area: a bar with its target, ✓ or what it missed by */}
          <section style={S.statsSection} aria-labelledby="stats-week">
            <div style={S.weekPicker}>
              <button
                type="button"
                aria-label={m.stats.earlier}
                disabled={week <= span.first}
                onClick={() => setPicked(shiftWeek(week, -1))}
                style={{ ...S.weekArrow, ...(week <= span.first ? { opacity: 0.3, cursor: "not-allowed" } : {}) }}
              >
                ‹
              </button>
              <div>
                <h2 id="stats-week" style={{ ...S.statsSubtitle, margin: 0, textAlign: "center" }}>
                  {m.stats.weekOf(weekDate)}
                </h2>
                {(open || week === lastWeek) && (
                  <div style={S.weekWhen}>{open ? m.stats.thisWeek : m.stats.lastWeek}</div>
                )}
              </div>
              <button
                type="button"
                aria-label={m.stats.later}
                disabled={open}
                onClick={() => setPicked(shiftWeek(week, 1))}
                style={{ ...S.weekArrow, ...(open ? { opacity: 0.3, cursor: "not-allowed" } : {}) }}
              >
                ›
              </button>
            </div>
            <WeekRows rows={weekRows(data.cats, data.history, week, rules, open)} />
          </section>

          {trends.some((t) => t.counted > 0) && (
            <section style={S.statsSection} aria-labelledby="stats-trend">
              <h2 id="stats-trend" style={S.statsSubtitle}>
                {m.stats.trendTitle}
              </h2>
              <AreaTrends trends={trends} />
            </section>
          )}

          {/* Trends always has its heading once anything is ticked; before a week has finished, it says
              when the lines will start instead of hiding (JP, 2026-11-08: "I don't see the trend line") */}
          {!lines.some((l) => l.points.length > 0) ? (
            <section style={S.statsSection} aria-labelledby="stats-lines">
              <h2 id="stats-lines" style={S.statsSubtitle}>
                {m.stats.trendsTitle}
              </h2>
              <p style={S.statsEmptyText}>{m.stats.trendsSoon}</p>
            </section>
          ) : (
            <section style={S.statsSection} aria-labelledby="stats-lines">
              <div style={{ ...S.statsHead, marginBottom: 6 }}>
                <h2 id="stats-lines" style={{ ...S.statsSubtitle, margin: 0 }}>
                  {m.stats.trendsTitle}
                </h2>
                <div style={S.kindGroup} role="group" aria-label={m.stats.trendsRange}>
                  {TREND_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={range === r}
                      onClick={() => setRange(r)}
                      style={{ ...S.kindBtn, ...S.setSeg, ...(range === r ? S.kindBtnActive : {}) }}
                    >
                      {m.stats.ranges[r]}
                    </button>
                  ))}
                </div>
              </div>
              <TrendLines lines={lines} />
              <p style={{ ...S.weekWhen, textAlign: "left" }}>
                {lines.some((l) => l.direction) ? m.stats.trendsNote : m.stats.trendsEarly}
              </p>
            </section>
          )}

          <p style={S.statsNote}>{m.stats.note}</p>
        </>
      )}
    </div>
  );
}
