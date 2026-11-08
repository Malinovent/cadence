import { useState } from "react";
import type { CadenceData } from "../lib/model";
import { maxHours, statsByCat, type StatsRange } from "../lib/stats";
import { season } from "../lib/balancedWeeks";
import { readBalanceRules } from "../state/balanceRules";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BalancedWeeksCard from "./BalancedWeeksCard";
import { hoursText, lastWeekLines } from "../lib/review";
import AreaRows from "./AreaRows";

type Props = {
  data: CadenceData;
  range: StatsRange;
  setRange: (r: StatsRange) => void;
  resetStats: () => void;
};

const RANGES: StatsRange[] = ["month", "quarter", "year"];

export default function StatsView({ data, range, setRange, resetStats }: Props) {
  const { m } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);
  const stats = statsByCat(data, range, Date.now());
  const max = maxHours(stats);

  const rules = readBalanceRules();
  // hours without a trailing ".0": "14 h", "1.5 h" / "1,5 h"
  const hours = (h: string) => `${hoursText(Math.round(parseFloat(h) * 60), m.lib)} h`;

  return (
    <div style={S.statsBody}>
      <div style={{ marginBottom: 24 }}>
        <BalancedWeeksCard season={season(data.cats, data.history, new Date(), rules)} />
      </div>

      {/* last week, one short row per area (JP, 2026-11-08: "less verbose") */}
      <section style={S.statsSection} aria-labelledby="stats-last-week">
        <h2 id="stats-last-week" style={S.statsSubtitle}>
          {m.stats.lastWeek}
        </h2>
        <AreaRows lines={lastWeekLines(data.cats, data.history, new Date(), rules, m.lib)} />
      </section>

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

      <div style={S.resetRow}>
        {confirmReset ? (
          <>
            <span style={S.resetWarn}>{m.stats.resetWarn}</span>
            <button
              onClick={() => {
                resetStats();
                setConfirmReset(false);
              }}
              style={S.resetConfirm}
            >
              {m.stats.resetYes}
            </button>
            <button onClick={() => setConfirmReset(false)} style={S.resetCancel}>
              {m.stats.cancel}
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmReset(true)} style={S.resetBtn}>
            {m.stats.reset}
          </button>
        )}
      </div>
    </div>
  );
}
