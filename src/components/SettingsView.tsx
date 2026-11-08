import type React from "react";
import { useRef, useState, type ChangeEvent } from "react";
import AccountSync, { type AccountSyncProps } from "./AccountSync";
import SetRow from "./SetRow";
import { downloadText } from "../lib/download";
import { droppedLine, importSummaryLine } from "../lib/format";
import type { CadenceData } from "../lib/model";
import { loadPremigrationCopy, PREMIGRATION_KEYS } from "../lib/storage";
import {
  buildExport,
  exportFilename,
  NEWER_VERSION,
  NOT_A_BACKUP,
  parseImport,
  type ImportResult,
} from "../lib/transfer";
import { clampRules, DEFAULT_RULES, type BalanceRules } from "../lib/balancedWeeks";
import { readBalanceRules, writeBalanceRules } from "../state/balanceRules";
import { helpLinks, legalLinks } from "../lib/legal";
import { playSound, setSoundVolume, soundVolume } from "../state/sound";
import { applyTheme, readTheme, writeTheme } from "../state/themePrefs";
import { THEME_CHOICES, type ThemeChoice } from "../lib/theme";
import { endChoices, startChoices, withEnd, withStart } from "../lib/dayHours";
import type { Bounds } from "../lib/placement";
import { fmtTime } from "../lib/time";
import { APP_NAME } from "../appName";
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
  onReplayIntro,
  dayHours,
  onDayHours,
  onResetStats,
}: {
  data: CadenceData;
  onReplace: (next: CadenceData) => void;
  /** null when sync is not configured: the Sync row is hidden */
  sync: AccountSyncProps | null;
  /** S1.11: show the early-bird thank-you */
  earlyBird?: boolean;
  /** Settings → About: show the onboarding again */
  onReplayIntro: () => void;
  /** the hours the calendar shows (Settings → Your day) */
  dayHours: Bounds;
  onDayHours: (h: Bounds) => void;
  /** Settings → Data: clear the ticked history and balanced weeks (moved from Stats, JP 2026-11-08) */
  onResetStats: () => void;
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
  const errorText = (msg: string) =>
    msg === NOT_A_BACKUP ? m.settings.notBackup : msg === NEWER_VERSION ? m.settings.newerVersion : msg;
  // untouched copies kept before an update migrated the saved data (S1.2 guardrails, S1.5 tasks)
  const [copies] = useState(() =>
    BEFORE_UPDATES.map((c) => ({ ...c, text: loadPremigrationCopy(c.key) })).filter(
      (c): c is (typeof BEFORE_UPDATES)[number] & { text: string } => c.text !== null,
    ),
  );

  // Settings as short rows, in four groups (JP, 2026-11-08: "more readable")
  const dataRows = (
    <>
      <button type="button" style={S.setRowBtn} onClick={onExport}>
        <span style={S.setLabel}>{m.settings.export}</span>
        <span aria-hidden="true" style={S.setValue}>
          ↓
        </span>
      </button>
      <button type="button" style={S.setRowBtn} onClick={onPickClick}>
        <span style={S.setLabel}>{m.settings.import}</span>
        <span aria-hidden="true" style={S.setValue}>
          ↑
        </span>
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={onFile} />
      <ResetStatsRow onReset={onResetStats} />
      {(copies.length > 0 || status.kind !== "idle") && (
        <div style={S.setPanel}>
          {copies.map((c) => (
            <div key={c.key} style={{ ...note, color: "var(--c-muted)", marginTop: 8 }}>
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
            <div style={{ ...S.streakCard, textAlign: "left", padding: 14, marginTop: 8 }}>
              <div style={S.catIntro}>{importSummaryLine(status.result.summary, m.lib)}</div>
              {dropped && <div style={{ ...note, color: "var(--c-faint)", marginTop: 4 }}>{dropped}</div>}
              <div style={{ ...S.resetWarn, marginTop: 8 }}>{m.settings.replaceWarn}</div>
              <div style={{ ...row, marginTop: 10 }}>
                <button style={{ ...S.resetConfirm, background: "var(--c-done)" }} onClick={onConfirm}>
                  {m.settings.replaceYes}
                </button>
                <button style={S.resetCancel} onClick={() => setStatus({ kind: "idle" })}>
                  {m.settings.cancel}
                </button>
              </div>
            </div>
          )}
          {status.kind === "error" && (
            <div role="alert" style={{ ...note, color: "var(--c-danger)", marginTop: 8 }}>
              {errorText(status.message)}
            </div>
          )}
          {status.kind === "success" && (
            <div role="status" style={{ ...note, color: "var(--c-done)", marginTop: 8 }}>
              {m.settings.imported}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div style={S.catBody}>
      <SettingsGroup id="week" title={m.settings.groups.week}>
        <div style={S.setCard}>
          <DayHoursRows hours={dayHours} onHours={onDayHours} />
          <BalanceRulesRow />
        </div>
      </SettingsGroup>

      <SettingsGroup id="look" title={m.settings.groups.look}>
        <div style={S.setCard}>
          <LookRow />
          <SoundRow />
          <LanguageRow />
        </div>
        <p style={S.setFoot}>{m.settings.savedHere}</p>
      </SettingsGroup>

      <SettingsGroup id="data" title={m.settings.groups.data}>
        {earlyBird && (
          <div style={{ ...S.earlyThanks, marginTop: 0 }} role="note">
            <span style={S.earlyBadge}>{m.header.earlyBird}</span>
            <span>{m.settings.earlyThanks}</span>
          </div>
        )}
        <div style={S.setCard}>{sync ? <AccountSync {...sync}>{dataRows}</AccountSync> : dataRows}</div>
      </SettingsGroup>

      <SettingsGroup id="help" title={m.settings.groups.help}>
        <HelpRows onReplayIntro={onReplayIntro} />
        <p style={S.setFoot}>{m.settings.aboutText}</p>
      </SettingsGroup>
    </div>
  );
}

/** "Reset stats": asks first, since it can't be undone. */
function ResetStatsRow({ onReset }: { onReset: () => void }) {
  const { m } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        style={S.setRowBtn}
        aria-expanded={confirming}
        onClick={() => {
          setDone(false);
          setConfirming(!confirming);
        }}
      >
        <span style={S.setLabel}>{m.stats.reset}</span>
      </button>
      {(confirming || done) && (
        <div style={S.setPanel}>
          {done ? (
            <div role="status" style={{ ...note, color: "var(--c-muted)" }}>
              {m.stats.resetDone}
            </div>
          ) : (
            <>
              <div style={S.resetWarn}>{m.stats.resetWarn}</div>
              <div style={{ ...row, marginTop: 10 }}>
                <button
                  style={S.resetConfirm}
                  onClick={() => {
                    onReset();
                    setConfirming(false);
                    setDone(true);
                  }}
                >
                  {m.stats.resetYes}
                </button>
                <button style={S.resetCancel} onClick={() => setConfirming(false)}>
                  {m.stats.cancel}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** One group of Settings: its title, then its card of rows. */
function SettingsGroup({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`settings-${id}-title`} style={S.setGroup}>
      <h2 id={`settings-${id}-title`} style={S.setGroupTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** S1.3: when a week counts as balanced, summed up in one line; Edit opens the two numbers. */
function BalanceRulesRow() {
  const { m } = useI18n();
  const [rules, setRules] = useState(readBalanceRules);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<BalanceRules>) => {
    const next = clampRules({ ...rules, ...patch });
    setRules(next);
    writeBalanceRules(next);
  };
  const changed = rules.floorPct !== DEFAULT_RULES.floorPct || rules.ceilingOverPct !== DEFAULT_RULES.ceilingOverPct;
  return (
    <>
      <SetRow label={m.settings.rulesTitle} hint={m.settings.rulesSummary(rules.floorPct, rules.ceilingOverPct)}>
        <button type="button" aria-expanded={open} style={S.setLink} onClick={() => setOpen(!open)}>
          {open ? m.settings.close : m.settings.edit}
        </button>
      </SetRow>
      {open && (
        <div style={{ ...S.setPanel, ...row, alignItems: "flex-end" }}>
          <label style={S.catField}>
            <span>{m.settings.floorsMet}</span>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={rules.floorPct}
              onChange={(e) => set({ floorPct: +e.target.value })}
              style={S.catNum}
            />
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
            <button
              style={{ ...S.catDel, fontSize: 13, textDecoration: "underline" }}
              onClick={() => set(DEFAULT_RULES)}
            >
              {m.settings.rulesBack}
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * The hours the calendar shows (JP, 2026-11-07): 7:00 to 23:00 unless chosen, at least four hours.
 * Blocks outside them still show (the calendar grows to hold them). Saved on this device.
 */
function DayHoursRows({ hours, onHours }: { hours: Bounds; onHours: (h: Bounds) => void }) {
  const { m, lang } = useI18n();
  const label = (t: number) => (t === 0 || t === 24 * 60 ? m.settings.midnight : fmtTime(t, lang));
  return (
    <>
      <SetRow label={m.settings.dayStart} field>
        <select
          value={hours[0]}
          onChange={(e) => onHours(withStart(hours, Number(e.target.value)))}
          style={S.setSelect}
        >
          {startChoices().map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
      </SetRow>
      <SetRow label={m.settings.dayEnd} field>
        <select value={hours[1]} onChange={(e) => onHours(withEnd(hours, Number(e.target.value)))} style={S.setSelect}>
          {endChoices(hours[0]).map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
      </SetRow>
    </>
  );
}

/** Buttons where one is chosen (look, language). */
function Choice<T extends string>({
  label,
  value,
  options,
  onChoose,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; lang?: string }[];
  onChoose: (v: T) => void;
}) {
  return (
    <div style={{ ...S.kindGroup, flexWrap: "wrap" }} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.lang}
          aria-pressed={value === o.value}
          onClick={() => onChoose(o.value)}
          style={{ ...S.kindBtn, ...S.setSeg, ...(value === o.value ? S.kindBtnActive : {}) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The app's look (JP, 2026-11-08): paper, night, high contrast or the device's. Saved on this device. */
function LookRow() {
  const { m } = useI18n();
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  return (
    <SetRow label={m.settings.lookTitle}>
      <Choice
        label={m.settings.lookTitle}
        value={choice}
        options={THEME_CHOICES.map((c) => ({ value: c, label: m.settings.looks[c] }))}
        onChoose={(c) => {
          setChoice(c);
          writeTheme(c);
          applyTheme(c);
        }}
      />
    </SetRow>
  );
}

/** Sounds: one volume slider, 0 for none (JP, 2026-11-08). Half by default; saved on this device. */
function SoundRow() {
  const { m } = useI18n();
  const [vol, setVol] = useState(soundVolume);
  const text = vol === 0 ? m.settings.soundOff : `${vol}%`;
  return (
    <SetRow label={m.settings.soundTitle} field>
      <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 180px", maxWidth: 260 }}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={vol}
          aria-valuetext={text}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVol(v);
            setSoundVolume(v);
          }}
          onPointerUp={() => playSound("tick")} // hear the new level on release
          onKeyUp={() => playSound("tick")}
          style={S.volumeSlider}
        />
        <span style={S.volumeValue}>{text}</span>
      </span>
    </SetRow>
  );
}

/** S1.9: the language, following the device unless one is chosen. Saved on this device. */
function LanguageRow() {
  const { m, choice, setChoice } = useI18n();
  return (
    <SetRow label={m.settings.langTitle}>
      <Choice<LangChoice>
        label={m.settings.langTitle}
        value={choice}
        options={[
          { value: "auto", label: m.settings.langAuto },
          { value: "fr", label: m.settings.langNames.fr, lang: "fr" },
          { value: "en", label: m.settings.langNames.en, lang: "en" },
        ]}
        onChoose={setChoice}
      />
    </SetRow>
  );
}

const Chevron = () => (
  <span aria-hidden="true" style={S.setValue}>
    ›
  </span>
);

/** Help: questions, writing to us, the introduction again, and the legal pages (once the site has its address). */
function HelpRows({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { m, lang } = useI18n();
  const links = legalLinks(import.meta.env.VITE_SITE_URL, lang);
  const help = helpLinks(
    import.meta.env.VITE_SITE_URL,
    import.meta.env.VITE_SUPPORT_EMAIL,
    lang,
    m.settings.helpSubject(APP_NAME),
  );
  return (
    <div style={S.setCard}>
      {help.faq && (
        <a href={help.faq} target="_blank" rel="noreferrer" style={S.setRowBtn}>
          <span style={S.setLabel}>{m.settings.helpFaq}</span>
          <Chevron />
        </a>
      )}
      {help.mail && (
        <a href={help.mail} style={S.setRowBtn}>
          <span style={S.setLabel}>{m.settings.helpMail}</span>
          <Chevron />
        </a>
      )}
      <button type="button" style={S.setRowBtn} onClick={onReplayIntro}>
        <span style={S.setLabel}>{m.settings.replayIntro}</span>
        <Chevron />
      </button>
      {links && (
        <div style={S.setRow}>
          <a href={links.privacy} target="_blank" rel="noreferrer" style={S.aboutLink}>
            {m.settings.privacy}
          </a>
          <a href={links.terms} target="_blank" rel="noreferrer" style={S.aboutLink}>
            {m.settings.terms}
          </a>
        </div>
      )}
    </div>
  );
}
