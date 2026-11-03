import { useState } from "react";
import type { CadenceData } from "../lib/model";
import { maxHours, statsByCat, type StatsRange } from "../lib/stats";
import { S } from "../styles";

type Props = {
  data: CadenceData;
  range: StatsRange;
  setRange: (r: StatsRange) => void;
  resetStats: () => void;
};

const RANGES: StatsRange[] = ["month", "quarter", "year"];

export default function StatsView({ data, range, setRange, resetStats }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const stats = statsByCat(data, range, Date.now());
  const max = maxHours(stats);

  return (
    <div style={S.statsBody}>
      <div style={S.statsHead}>
        <h2 style={S.statsTitle}>Time invested</h2>
        <div style={S.rangeToggle}>
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ ...S.rangeBtn, ...(range === r ? S.rangeBtnActive : {}) }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={S.streakRow}>
        {data.cats.map((c) => {
          const s = data.streaks[c.id]?.count || 0;
          return (
            <div key={c.id} style={S.streakCard}>
              <div style={{ ...S.streakFlame, color: s > 0 ? c.color : "#cabfb2" }}>{s > 0 ? "🔥" : "·"}</div>
              <div style={S.streakNum}>{s}</div>
              <div style={S.streakName}>{c.name} streak</div>
            </div>
          );
        })}
      </div>

      <div style={S.barChart}>
        {stats.map((s) => (
          <div key={s.cat.id} style={S.barRow}>
            <span style={S.barName}>{s.cat.name}</span>
            <div style={S.barTrack}>
              <div style={{ ...S.barFill, width: `${(parseFloat(s.hours) / max) * 100}%`, background: s.cat.color }}>
                <span style={S.barVal}>{s.hours}h</span>
              </div>
            </div>
            <span style={S.barSessions}>{s.sessions} sessions</span>
          </div>
        ))}
      </div>

      <p style={S.statsNote}>Stats count sessions you marked done. Roll the week forward to bank streaks.</p>

      <div style={S.resetRow}>
        {confirmReset ? (
          <>
            <span style={S.resetWarn}>Clear all tracked hours and streaks? This can't be undone.</span>
            <button
              onClick={() => {
                resetStats();
                setConfirmReset(false);
              }}
              style={S.resetConfirm}
            >
              Yes, reset
            </button>
            <button onClick={() => setConfirmReset(false)} style={S.resetCancel}>
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmReset(true)} style={S.resetBtn}>
            Reset stats
          </button>
        )}
      </div>
    </div>
  );
}
