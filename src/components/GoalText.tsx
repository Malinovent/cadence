import { fmtH, type Limit, type LimitKind } from "../lib/guardrail";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

// the kinds' signs (JP, 2026-11-08, option A): beside the words, never instead of them
export const SIGN: Record<LimitKind, string> = { floor: "≥", ceiling: "≤", range: "↔" };

/**
 * An area's weekly target, number first: "≥ 4 h at least", the sign and number bold in ink, the
 * key word plain (JP, 2026-11-08). The same in the Areas list and in Stats.
 */
export default function GoalText({ limit: l }: { limit: Limit }) {
  const { m } = useI18n();
  const amount =
    l.kind === "range"
      ? m.categories.span(fmtH(l.min), fmtH(l.max))
      : m.categories.hours(fmtH(l.kind === "floor" ? l.min : l.max));
  return (
    <>
      <span aria-hidden="true" style={S.areaSign}>
        {SIGN[l.kind]}
      </span>
      <strong style={S.areaGoalAmount}>{amount}</strong> {m.categories.kinds[l.kind].word}
    </>
  );
}
