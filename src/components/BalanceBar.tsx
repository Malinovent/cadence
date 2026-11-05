import { balanceLabel, barGeometry, type Balance } from "../lib/guardrail";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

/** S1.2 balance bar for one area: partial credit ("7 of 10 h") and the guardrail bar. */
export default function BalanceBar({ balance, color, kind }: { balance: Balance; color: string; kind: string | null }) {
  const { m } = useI18n();
  const g = barGeometry(balance);
  return (
    <div style={S.areaBalance}>
      <div style={S.balanceHead}>
        {kind && <span style={S.balanceKind}>{kind}</span>}
        <span style={S.balanceCount}>{balanceLabel(balance, m.lib)}</span>
      </div>
      <div style={S.balanceTrack} aria-hidden="true">
        {g.band && (
          <div
            style={{
              ...S.balanceBand,
              left: `${g.band.left}%`,
              width: `${g.band.width}%`,
            }}
          />
        )}
        <div style={{ ...S.balanceFill, width: `${g.fill}%`, background: color }} />
        {g.gap && (
          <div
            style={{
              ...S.balanceGap,
              left: `${g.gap.left}%`,
              width: `${g.gap.width}%`,
            }}
          />
        )}
        {g.marks.map((m, i) => (
          <div key={i} style={{ ...S.balanceMark, left: `${m}%` }} />
        ))}
      </div>
    </div>
  );
}
