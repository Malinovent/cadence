import { useRef, useState, type ChangeEvent } from "react";
import AccountSync, { type AccountSyncProps } from "./AccountSync";
import { downloadText } from "../lib/download";
import { droppedLine, importSummaryLine } from "../lib/format";
import type { CadenceData } from "../lib/model";
import { loadPremigrationCopy, PREMIGRATION_KEYS } from "../lib/storage";
import { buildExport, exportFilename, NOT_A_BACKUP, parseImport, type ImportResult } from "../lib/transfer";
import { clampRules, DEFAULT_RULES, type BalanceRules } from "../lib/balancedWeeks";
import { readBalanceRules, writeBalanceRules } from "../state/balanceRules";
import { S } from "../styles";

const BEFORE_UPDATES = [
  {
    key: PREMIGRATION_KEYS.guardrails,
    file: "cadence-backup-before-guardrails.json",
    line: "A copy of your data from before targets became floors, ceilings and ranges is kept on this device.",
  },
  {
    key: PREMIGRATION_KEYS.tasks,
    file: "cadence-backup-before-tasks.json",
    line: "A copy of your data from before the November tasks update is kept on this device.",
  },
] as const;

type Status =
  | { kind: "idle" }
  | { kind: "pending"; result: Extract<ImportResult, { ok: true }> }
  | { kind: "error"; message: string }
  | { kind: "success" };

const row = { display: "flex", gap: 10, flexWrap: "wrap" } as const;
const note = { fontStyle: "italic", fontSize: 13 } as const;

export default function SettingsView({
  data,
  onReplace,
  sync,
}: {
  data: CadenceData;
  onReplace: (next: CadenceData) => void;
  /** null when sync is not configured: the "Account & sync" section is hidden */
  sync: AccountSyncProps | null;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    if (status.kind !== "pending") setStatus({ kind: "idle" });
    downloadText(JSON.stringify(buildExport(data), null, 2), exportFilename(new Date()));
  };

  const onPickClick = () => {
    setStatus({ kind: "idle" });
    fileRef.current?.click();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ""; // allow picking the same file again
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ kind: "error", message: NOT_A_BACKUP });
      return;
    }
    const result = parseImport(text);
    setStatus(result.ok ? { kind: "pending", result } : { kind: "error", message: result.error });
  };

  const onConfirm = () => {
    if (status.kind !== "pending") return;
    onReplace(status.result.data);
    setStatus({ kind: "success" });
  };

  const dropped = status.kind === "pending" ? droppedLine(status.result.dropped) : null;
  // untouched copies kept before an update migrated the saved data (S1.2 guardrails, S1.5 tasks)
  const [copies] = useState(() =>
    BEFORE_UPDATES.map((c) => ({ ...c, text: loadPremigrationCopy(c.key) })).filter(
      (c): c is (typeof BEFORE_UPDATES)[number] & { text: string } => c.text !== null,
    ),
  );

  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>Your data</h2>
      <div style={S.catIntro}>Keep a copy of your weeks, or bring them in from another browser.</div>
      <div style={{ ...row, marginTop: 16 }}>
        <button style={{ ...S.catAdd, marginTop: 0 }} onClick={onExport}>
          ↓ Export my data
        </button>
        <button style={{ ...S.catAdd, marginTop: 0 }} onClick={onPickClick}>
          ↑ Import from file
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={onFile} />
      </div>
      {copies.map((c) => (
        <div key={c.key} style={{ ...note, color: "#7a6e5e", marginTop: 12 }}>
          {c.line}{" "}
          <button
            style={{ ...S.catDel, fontStyle: "normal", textDecoration: "underline", padding: 0 }}
            onClick={() => downloadText(c.text, c.file)}
          >
            Download it
          </button>
        </div>
      ))}

      {status.kind === "pending" && (
        <div style={{ ...S.streakCard, textAlign: "left", padding: 14, marginTop: 16 }}>
          <div style={S.catIntro}>{importSummaryLine(status.result.summary)}</div>
          {dropped && <div style={{ ...note, color: "#9a8d7d", marginTop: 4 }}>{dropped}</div>}
          <div style={{ ...S.resetWarn, marginTop: 8 }}>This replaces everything in Cadence on this device.</div>
          <div style={{ ...row, marginTop: 10 }}>
            <button style={{ ...S.resetConfirm, background: "#1FA98A" }} onClick={onConfirm}>
              Yes, replace
            </button>
            <button style={S.resetCancel} onClick={() => setStatus({ kind: "idle" })}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {status.kind === "error" && <div style={{ ...note, color: "#b54", marginTop: 12 }}>{status.message}</div>}
      {status.kind === "success" && (
        <div style={{ ...note, color: "#1FA98A", marginTop: 12 }}>Imported. Your week is back.</div>
      )}

      <BalanceRulesSection />

      {sync && <AccountSync {...sync} />}
    </div>
  );
}

/** S1.3: when a week counts as balanced. Saved on this device only. */
function BalanceRulesSection() {
  const [rules, setRules] = useState(readBalanceRules);
  const set = (patch: Partial<BalanceRules>) => {
    const next = clampRules({ ...rules, ...patch });
    setRules(next);
    writeBalanceRules(next);
  };
  const changed = rules.floorPct !== DEFAULT_RULES.floorPct || rules.ceilingOverPct !== DEFAULT_RULES.ceilingOverPct;
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={S.statsTitle}>Balanced weeks</h2>
      <div style={S.catIntro}>
        A week counts as balanced when every floor is met at least this much and no ceiling is passed by more than this.
        Only ticked blocks count. Saved on this device.
      </div>
      <div style={{ ...row, marginTop: 12, alignItems: "flex-end" }}>
        <label style={S.catField}>
          <span>Floors met (%)</span>
          <input type="number" min="0" max="100" step="5" value={rules.floorPct} onChange={(e) => set({ floorPct: +e.target.value })} style={S.catNum} />
        </label>
        <label style={S.catField}>
          <span>Ceilings passed by (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="5"
            value={rules.ceilingOverPct}
            onChange={(e) => set({ ceilingOverPct: +e.target.value })}
            style={S.catNum}
          />
        </label>
        {changed && (
          <button style={{ ...S.catDel, fontSize: 13, textDecoration: "underline" }} onClick={() => set(DEFAULT_RULES)}>
            Back to 80% and 10%
          </button>
        )}
      </div>
    </div>
  );
}

