import { useState } from "react";
import type { CadenceData } from "../lib/model";
import { maxHours, statsByCat, type StatsRange } from "../lib/stats";
import { season } from "../lib/balancedWeeks";
import { readBalanceRules } from "../state/balanceRules";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BalancedWeeksCard from "./BalancedWeeksCard";
import { describeLastWeek } from "../lib/describe";
import { fmtHours } from "../lib/time";

type Props = {
  data: CadenceData;
  range: StatsRange;
  setRange: (r: StatsRange) => void;
  resetStats: () => void;
};

const RANGES: StatsRange[] = ["month", "quarter", "year"];

export default function StatsView({ data, range, setRange, resetStats }: Props) {
  const { m, lang } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);
  const stats = statsByCat(data, range, Date.now());
  const max = maxHours(stats);

  return (
    <div style={S.statsBody}>
      <div style={S.statsHead}>
        <h2 style={S.statsTitle}>{m.stats.title}</h2>
        <div style={S.rangeToggle}>
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ ...S.rangeBtn, ...(range === r ? S.rangeBtnActive : {}) }}>
              {m.stats.ranges[r]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <BalancedWeeksCard season={season(data.cats, data.history, new Date(), readBalanceRules())} />
      </div>

      {/* S1.10: last week in words: describe, don't judge */}
      <div style={S.weekWords} aria-label={m.stats.lastWeek}>
        <div style={S.panelLabel}>{m.stats.lastWeek}</div>
        {describeLastWeek(data.cats, data.history, new Date(), m.lib.describe).map((l) => (
          <div key={l.catId} style={S.weekWord}>
            <span style={{ ...S.dot, background: l.color, flexShrink: 0, marginTop: 5 }} />
            <span>{l.text}</span>
          </div>
        ))}
      </div>

      <div style={S.barChart}>
        {stats.map((s) => (
          <div key={s.cat.id} style={S.barRow}>
            <span style={S.barName}>{s.cat.name}</span>
            <div style={S.barTrack}>
              <div style={{ ...S.barFill, width: `${(parseFloat(s.hours) / max) * 100}%`, background: s.cat.color }}>
                <span style={S.barVal}>{fmtHours(s.hours, lang)}</span>
              </div>
            </div>
            <span style={S.barSessions}>{m.stats.sessions(s.sessions)}</span>
          </div>
        ))}
      </div>

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
