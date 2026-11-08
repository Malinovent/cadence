import type React from "react";
import type { ReviewLine } from "../lib/review";
import { AreaMark } from "./AreaIconView";
import GoalText from "./GoalText";
import { S } from "../styles";

/**
 * One short row per area (JP, 2026-11-08: "less verbose"): colour, name, hours, target, and a ✓
 * when it kept its time. The full sentence is each row's label for screen readers. Used by the
 * week review after roll forward and by Stats → Last week.
 */
export default function AreaRows({
  lines,
  itemStyle,
  delay,
}: {
  lines: ReviewLine[];
  itemStyle?: React.CSSProperties;
  delay?: (k: number) => string; // the review lands its rows one by one
}) {
  return (
    <ul style={S.areaRows}>
      {lines.map((l, k) => (
        <li
          key={l.catId}
          aria-label={l.text}
          style={{ ...S.areaRow, ...itemStyle, ...(delay ? { animationDelay: delay(k) } : {}) }}
        >
          <AreaMark icon={l.icon} color={l.color} size={15} />
          <span style={S.reviewName}>{l.name}</span>
          <span style={S.reviewHours}>{l.hours}</span>
          <span style={S.reviewLimit}>
            <GoalText limit={l.goal} />
          </span>
          <span aria-hidden="true" style={{ ...S.reviewKept, visibility: l.kept ? "visible" : "hidden" }}>
            ✓
          </span>
        </li>
      ))}
    </ul>
  );
}
