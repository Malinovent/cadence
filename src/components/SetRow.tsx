import type React from "react";
import { S } from "../styles";

/** A setting: its name (and at most one short hint) on the left, its control on the right. */
export default function SetRow({
  label,
  hint,
  field = false,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  /** true when the control is one field: the whole row is its label */
  field?: boolean;
  children?: React.ReactNode;
}) {
  const Tag = field ? "label" : "div";
  return (
    <Tag style={S.setRow}>
      <span style={S.setLabel}>
        {label}
        {hint && <span style={S.setHint}>{hint}</span>}
      </span>
      {children}
    </Tag>
  );
}
