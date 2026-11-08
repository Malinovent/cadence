import { useState } from "react";
import type { CadenceData } from "../lib/model";
import { maxHours, statsByCat, type StatsRange } from "../lib/stats";
import { dayKey, mondayOf, season } from "../lib/balancedWeeks";
import { areaTrends, fromKey, shiftWeek, weekRows, weekSpan } from "../lib/statsWeeks";
import { readBalanceRules } from "../state/balanceRules";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BalancedWeeksCard from "./BalancedWeeksCard";
import { hoursText } from "../lib/review";
import WeekRows from "./WeekRows";
import AreaTrends from "./AreaTrends";

type Props = {
  data: CadenceData;
  range: StatsRange;
  setRange: (r: StatsRange) => void;
};

const RANGES: StatsRange[] = ["month", "quarter", "year"];

/**
 * Stats (JP, 2026-11-08, "more love"): the season's squares (tap one for its week), any week with
 * ‹ ›, each area's bar and what it missed by, the last 12 weeks per area, then Time invested as
 * before. Before anything is ticked, a short empty state instead. Reset lives in Settings now.
 */
export default function StatsView({ data, range, setRange }: Props) {
  const { m, locale } = useI18n();
  const now = new Date();
  const thisWeek = dayKey(mondayOf(now));
  const lastWeek = shiftWeek(thisWeek, -1);
  const [picked, setPicked] = useState(lastWeek);
  const rules = readBalanceRules();
  const span = weekSpan(data.history, now);
  const week = picked < span.first ? span.first : picked > span.last ? span.last : picked;
  const open = week === span.last;
  const stats = statsByCat(data, range, Date.now());
  const max = maxHours(stats);
  const trends = areaTrends(data.cats, data.history, now, rules);
  const empty = data.history.length === 0;

  // hours without a trailing ".0": "14 h", "1.5 h" / "1,5 h"
  const hours = (h: string) => `${hoursText(Math.round(parseFloat(h) * 60), m.lib)} h`;
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

          <section style={S.statsSection} aria-labelledby="stats-time">
            <div style={S.statsHead}>
              <h2 id="stats-time" style={S.statsSubtitle}>
                {m.stats.title}
              </h2>
              <div style={S.rangeToggle}>
                {RANGES.map((r) => (
                  <button
                    key={r}
                    aria-pressed={range === r}
                    onClick={() => setRange(r)}
                    style={{ ...S.rangeBtn, ...(range === r ? S.rangeBtnActive : {}) }}
                  >
                    {m.stats.ranges[r]}
                  </button>
                ))}
              </div>
            </div>
            <div style={S.barChart}>
              {stats.map((s) => (
                <div key={s.cat.id} style={S.barRow} title={m.stats.sessions(s.sessions)}>
                  <span style={S.barName}>{s.cat.name}</span>
                  <div style={S.barTrackTight}>
                    <div
                      style={{
                        ...S.barFill,
                        minWidth: 6,
                        height: 28,
                        width: `${(parseFloat(s.hours) / max) * 82}%`,
                        background: s.cat.color,
                      }}
                    />
                    <span style={{ ...S.barHours, textAlign: "left" }}>{hours(s.hours)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p style={S.statsNote}>{m.stats.note}</p>
        </>
      )}
    </div>
  );
}
