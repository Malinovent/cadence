import { useRef, useState, type ChangeEvent } from "react";
import AccountSync, { type AccountSyncProps } from "./AccountSync";
import { downloadText } from "../lib/download";
import { droppedLine, importSummaryLine } from "../lib/format";
import type { CadenceData } from "../lib/model";
import { loadPremigrationCopy, PREMIGRATION_KEYS } from "../lib/storage";
import { buildExport, exportFilename, NEWER_VERSION, NOT_A_BACKUP, parseImport, type ImportResult } from "../lib/transfer";
import { clampRules, DEFAULT_RULES, type BalanceRules } from "../lib/balancedWeeks";
import { readBalanceRules, writeBalanceRules } from "../state/balanceRules";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import type { LangChoice } from "../i18n/lang";

const BEFORE_UPDATES = [
  {
    key: PREMIGRATION_KEYS.guardrails,
    file: "cadence-backup-before-guardrails.json",
    line: "beforeGuardrails",
  },
  {
    key: PREMIGRATION_KEYS.tasks,
    file: "cadence-backup-before-tasks.json",
    line: "beforeTasks",
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
  earlyBird = false,
}: {
  data: CadenceData;
  onReplace: (next: CadenceData) => void;
  /** null when sync is not configured: the "Account & sync" section is hidden */
  sync: AccountSyncProps | null;
  /** S1.11: show the early-bird thank-you */
  earlyBird?: boolean;
}) {
  const { m } = useI18n();
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

  const dropped = status.kind === "pending" ? droppedLine(status.result.dropped, m.lib) : null;
  // the lib reports import errors in English; show them in the person's language
  const errorText = (msg: string) => (msg === NOT_A_BACKUP ? m.settings.notBackup : msg === NEWER_VERSION ? m.settings.newerVersion : msg);
  // untouched copies kept before an update migrated the saved data (S1.2 guardrails, S1.5 tasks)
  const [copies] = useState(() =>
    BEFORE_UPDATES.map((c) => ({ ...c, text: loadPremigrationCopy(c.key) })).filter(
      (c): c is (typeof BEFORE_UPDATES)[number] & { text: string } => c.text !== null,
    ),
  );

  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>{m.settings.dataTitle}</h2>
      <div style={S.catIntro}>{m.settings.dataIntro}</div>
      <div style={{ ...row, marginTop: 16 }}>
        <button style={{ ...S.catAdd, marginTop: 0 }} onClick={onExport}>
          {m.settings.export}
        </button>
        <button style={{ ...S.catAdd, marginTop: 0 }} onClick={onPickClick}>
          {m.settings.import}
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={onFile} />
      </div>
      {copies.map((c) => (
        <div key={c.key} style={{ ...note, color: "#7a6e5e", marginTop: 12 }}>
          {m.settings[c.line]}{" "}
          <button
            style={{ ...S.catDel, fontStyle: "normal", textDecoration: "underline", padding: 0 }}
            onClick={() => downloadText(c.text, c.file)}
          >
            {m.settings.download}
          </button>
        </div>
      ))}

      {status.kind === "pending" && (
        <div style={{ ...S.streakCard, textAlign: "left", padding: 14, marginTop: 16 }}>
          <div style={S.catIntro}>{importSummaryLine(status.result.summary, m.lib)}</div>
          {dropped && <div style={{ ...note, color: "#9a8d7d", marginTop: 4 }}>{dropped}</div>}
          <div style={{ ...S.resetWarn, marginTop: 8 }}>{m.settings.replaceWarn}</div>
          <div style={{ ...row, marginTop: 10 }}>
            <button style={{ ...S.resetConfirm, background: "#1FA98A" }} onClick={onConfirm}>
              {m.settings.replaceYes}
            </button>
            <button style={S.resetCancel} onClick={() => setStatus({ kind: "idle" })}>
              {m.settings.cancel}
            </button>
          </div>
        </div>
      )}
      {status.kind === "error" && <div style={{ ...note, color: "#b54", marginTop: 12 }}>{errorText(status.message)}</div>}
      {status.kind === "success" && (
        <div style={{ ...note, color: "#1FA98A", marginTop: 12 }}>{m.settings.imported}</div>
      )}

      <BalanceRulesSection />
      <LanguageSection />

      {earlyBird && (
        <div style={S.earlyThanks} role="note">
          <span style={S.earlyBadge}>{m.header.earlyBird}</span>
          <span>{m.settings.earlyThanks}</span>
        </div>
      )}
      {sync && <AccountSync {...sync} />}
    </div>
  );
}

/** S1.3: when a week counts as balanced. Saved on this device only. */
function BalanceRulesSection() {
  const { m } = useI18n();
  const [rules, setRules] = useState(readBalanceRules);
  const set = (patch: Partial<BalanceRules>) => {
    const next = clampRules({ ...rules, ...patch });
    setRules(next);
    writeBalanceRules(next);
  };
  const changed = rules.floorPct !== DEFAULT_RULES.floorPct || rules.ceilingOverPct !== DEFAULT_RULES.ceilingOverPct;
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={S.statsTitle}>{m.settings.rulesTitle}</h2>
      <div style={S.catIntro}>{m.settings.rulesIntro}</div>
      <div style={{ ...row, marginTop: 12, alignItems: "flex-end" }}>
        <label style={S.catField}>
          <span>{m.settings.floorsMet}</span>
          <input type="number" min="0" max="100" step="5" value={rules.floorPct} onChange={(e) => set({ floorPct: +e.target.value })} style={S.catNum} />
        </label>
        <label style={S.catField}>
          <span>{m.settings.ceilingsPassed}</span>
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
            {m.settings.rulesBack}
          </button>
        )}
      </div>
    </div>
  );
}


/** S1.9: the language, following the device unless one is chosen. Saved on this device. */
function LanguageSection() {
  const { m, choice, setChoice } = useI18n();
  const options: { value: LangChoice; label: string }[] = [
    { value: "auto", label: m.settings.langAuto },
    { value: "fr", label: m.settings.langNames.fr },
    { value: "en", label: m.settings.langNames.en },
  ];
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={S.statsTitle}>{m.settings.langTitle}</h2>
      <div style={S.catIntro}>{m.settings.langIntro}</div>
      <div style={{ ...S.kindGroup, marginTop: 12, display: "inline-flex" }} role="group" aria-label={m.settings.langTitle}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            lang={o.value === "auto" ? undefined : o.value}
            aria-pressed={choice === o.value}
            onClick={() => setChoice(o.value)}
            style={{ ...S.kindBtn, ...(choice === o.value ? S.kindBtnActive : {}) }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
