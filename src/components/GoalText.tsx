import type { Limit, LimitKind } from "../lib/guardrail";
import { fmtDur, fmtNum } from "../lib/time";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

// the kinds' signs (JP, 2026-11-08, option A): beside the words, never instead of them
export const SIGN: Record<LimitKind, string> = { floor: "≥", ceiling: "≤", range: "↔" };

/**
 * An area's weekly target, number first: "≥ 4 h at least", the sign and number bold in ink, the
 * key word plain (JP, 2026-11-08). The same in the Areas list and in Stats.
 */
export default function GoalText({ limit: l }: { limit: Limit }) {
  const { m, lang } = useI18n();
  // "4h", "1.5h"; a range carries its unit once, "2–5h"
  const amount =
    l.kind === "range"
      ? `${fmtNum(l.min, lang)}–${fmtDur(l.max, lang)}`
      : fmtDur(l.kind === "floor" ? l.min : l.max, lang);
  return (
    <>
      <span aria-hidden="true" style={S.areaSign}>
        {SIGN[l.kind]}
      </span>
      <strong style={S.areaGoalAmount}>{amount}</strong> {m.categories.kinds[l.kind].word}
    </>
  );
}
