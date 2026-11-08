import { describeArea } from "../lib/describe";
import { fmtDur } from "../lib/time";
import { hoursText } from "../lib/review";
import { gapText, rowBar, type WeekRow } from "../lib/statsWeeks";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import { AreaMark } from "./AreaIconView";
import GoalText from "./GoalText";

/**
 * Stats, one week (JP, 2026-11-08): per area its ticked hours, a bar with the target marked, and
 * ✓ when kept or what it missed by, "! 1h short" outlined, "! 1h over" solid, in ink like the
 * area chips (never red, never colour alone). The target sits under the name.
 */
export default function WeekRows({ rows }: { rows: WeekRow[] }) {
  const { m } = useI18n();
  return (
    <ul style={S.weekRows}>
      {rows.map(({ cat, mins, kept, gap }) => {
        const bar = rowBar(cat.limit, mins);
        const pct = (f: number) => `${Math.min(1, f) * 100}%`;
        return (
          <li key={cat.id} style={S.weekRow}>
            <span style={S.weekRowName}>
              <AreaMark icon={cat.icon} color={cat.color} size={15} />
              <span style={S.weekRowNameText}>{cat.name}</span>
            </span>
            <span aria-hidden="true" style={{ ...S.countBar, alignSelf: "center" }}>
              <span style={{ ...S.countBarFill, width: pct(bar.fill), background: cat.color }} />
              {bar.over > 0 && <span style={{ ...S.countBarExtra, left: pct(bar.fill), width: pct(bar.over) }} />}
              {bar.marks.map((f, i) => (
                <span key={i} style={{ ...S.countBarMark, left: pct(f) }} />
              ))}
            </span>
            <span style={S.weekRowValue}>
              <span style={S.srOnly}>{describeArea(cat, mins, m.lib.describe)}</span>
              <span aria-hidden="true" style={S.reviewHours}>
                {hoursText(mins, m.lib)} h
              </span>
              {kept ? (
                <span aria-hidden="true" style={S.reviewKept}>
                  ✓{/* past an "at least": how far above (JP, 2026-11-08) */}
                  {cat.limit.kind === "floor" && mins > cat.limit.min && (
                    <span style={{ ...S.countStatus, ...S.countCalm, marginLeft: 6, fontWeight: 400 }}>
                      {m.lib.count.above(fmtDur(mins - cat.limit.min, m.lib.lang))}
                    </span>
                  )}
                </span>
              ) : (
                gap && (
                  <span
                    style={{
                      ...S.countStatus,
                      marginLeft: 0,
                      ...(gap.kind === "short" ? S.countUnder : gap.kind === "over" ? S.countOver : S.countCalm),
                    }}
                  >
                    {gap.kind !== "toGo" && (
                      <span aria-hidden="true" style={S.countBang}>
                        !
                      </span>
                    )}
                    {gapText(gap, m.lib)}
                  </span>
                )
              )}
            </span>
            <span style={S.weekRowGoal}>
              <GoalText limit={cat.limit} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
