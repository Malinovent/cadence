import type React from "react";
import { useRef, useState, type ChangeEvent } from "react";
import AccountSync, { type AccountSyncProps } from "./AccountSync";
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
}: {
  data: CadenceData;
  onReplace: (next: CadenceData) => void;
  /** null when sync is not configured: the "Account & sync" section is hidden */
  sync: AccountSyncProps | null;
  /** S1.11: show the early-bird thank-you */
  earlyBird?: boolean;
  /** Settings → About: show the onboarding again */
  onReplayIntro: () => void;
  /** the hours the calendar shows (Settings → Your day) */
  dayHours: Bounds;
  onDayHours: (h: Bounds) => void;
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

  // Settings in four groups with jump buttons at the top (JP, 2026-11-08)
  const jump = (id: string) => document.getElementById(`settings-${id}`)?.scrollIntoView({ block: "start" });
  return (
    <div style={S.catBody}>
      <nav aria-label={m.settings.groupsNav} style={S.settingsNav}>
        {GROUPS.map((g) => (
          <button key={g} type="button" onClick={() => jump(g)} style={S.settingsNavBtn}>
            {m.settings.groups[g]}
          </button>
        ))}
      </nav>

      <SettingsGroup id="week" title={m.settings.groups.week}>
        <DayHoursSection hours={dayHours} onHours={onDayHours} />
        <BalanceRulesSection />
      </SettingsGroup>

      <SettingsGroup id="look" title={m.settings.groups.look}>
        <LookSection />
        <SoundSection />
        <LanguageSection />
      </SettingsGroup>

      <SettingsGroup id="data" title={m.settings.groups.data}>
        {earlyBird && (
          <div style={S.earlyThanks} role="note">
            <span style={S.earlyBadge}>{m.header.earlyBird}</span>
            <span>{m.settings.earlyThanks}</span>
          </div>
        )}
        {sync && <AccountSync {...sync} />}
        <div style={{ marginTop: 24 }}>
          <h3 style={S.settingsSubtitle}>{m.settings.dataTitle}</h3>
          <div style={S.catIntro}>{m.settings.dataIntro}</div>
          <div style={{ ...row, marginTop: 16 }}>
            <button style={{ ...S.catAdd, marginTop: 0 }} onClick={onExport}>
              {m.settings.export}
            </button>
            <button style={{ ...S.catAdd, marginTop: 0 }} onClick={onPickClick}>
              {m.settings.import}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={onFile}
            />
          </div>
          {copies.map((c) => (
            <div key={c.key} style={{ ...note, color: "var(--c-muted)", marginTop: 12 }}>
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
            <div style={{ ...note, color: "var(--c-danger)", marginTop: 12 }}>{errorText(status.message)}</div>
          )}
          {status.kind === "success" && (
            <div style={{ ...note, color: "var(--c-done)", marginTop: 12 }}>{m.settings.imported}</div>
          )}
        </div>
      </SettingsGroup>

      <SettingsGroup id="help" title={m.settings.groups.help}>
        <AboutSection onReplayIntro={onReplayIntro} />
      </SettingsGroup>
    </div>
  );
}

const GROUPS = ["week", "look", "data", "help"] as const;

/** One group of Settings: a big title, its sections under it. */
function SettingsGroup({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} style={S.settingsGroup}>
      <h2 id={`settings-${id}-title`} style={S.statsTitle}>
        {title}
      </h2>
      {children}
    </section>
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
    <div style={{ marginTop: 22 }}>
      <h3 style={S.settingsSubtitle}>{m.settings.rulesTitle}</h3>
      <div style={S.catIntro}>{m.settings.rulesIntro}</div>
      <div style={{ ...row, marginTop: 12, alignItems: "flex-end" }}>
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
          <button style={{ ...S.catDel, fontSize: 13, textDecoration: "underline" }} onClick={() => set(DEFAULT_RULES)}>
            {m.settings.rulesBack}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The hours the calendar shows (JP, 2026-11-07): 7:00 to 23:00 unless chosen, at least four hours.
 * Blocks outside them still show (the calendar grows to hold them). Saved on this device.
 */
function DayHoursSection({ hours, onHours }: { hours: Bounds; onHours: (h: Bounds) => void }) {
  const { m, lang } = useI18n();
  const label = (t: number) => (t === 0 || t === 24 * 60 ? m.settings.midnight : fmtTime(t, lang));
  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={S.settingsSubtitle}>{m.settings.dayTitle}</h3>
      <div style={S.catIntro}>{m.settings.dayIntro}</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
        <label style={S.dayField}>
          <span style={S.dayFieldLabel}>{m.settings.dayStart}</span>
          <select
            value={hours[0]}
            onChange={(e) => onHours(withStart(hours, Number(e.target.value)))}
            style={S.daySelect}
          >
            {startChoices().map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
        </label>
        <label style={S.dayField}>
          <span style={S.dayFieldLabel}>{m.settings.dayEnd}</span>
          <select
            value={hours[1]}
            onChange={(e) => onHours(withEnd(hours, Number(e.target.value)))}
            style={S.daySelect}
          >
            {endChoices(hours[0]).map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** The app's look (JP, 2026-11-08): paper, night, high contrast or the device's. Saved on this device. */
function LookSection() {
  const { m } = useI18n();
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  const choose = (c: ThemeChoice) => {
    setChoice(c);
    writeTheme(c);
    applyTheme(c);
  };
  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={S.settingsSubtitle}>{m.settings.lookTitle}</h3>
      <div style={S.catIntro}>{m.settings.lookIntro}</div>
      <div
        style={{ ...S.kindGroup, marginTop: 12, display: "inline-flex", flexWrap: "wrap" }}
        role="group"
        aria-label={m.settings.lookTitle}
      >
        {THEME_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={choice === c}
            onClick={() => choose(c)}
            style={{ ...S.kindBtn, ...(choice === c ? S.kindBtnActive : {}) }}
          >
            {m.settings.looks[c]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sounds: one volume slider, 0 for none (JP, 2026-11-08). Half by default; saved on this device. */
function SoundSection() {
  const { m } = useI18n();
  const [vol, setVol] = useState(soundVolume);
  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={S.settingsSubtitle}>{m.settings.soundTitle}</h3>
      <div style={S.catIntro}>{m.settings.soundIntro}</div>
      <label style={S.volumeRow}>
        <span style={S.dayFieldLabel}>{m.settings.soundVolume}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={vol}
          aria-valuetext={vol === 0 ? m.settings.soundOff : `${vol}%`}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVol(v);
            setSoundVolume(v);
          }}
          onPointerUp={() => playSound("tick")} // hear the new level on release
          onKeyUp={() => playSound("tick")}
          style={S.volumeSlider}
        />
        <span style={S.volumeValue}>{vol === 0 ? m.settings.soundOff : `${vol}%`}</span>
      </label>
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
    <div style={{ marginTop: 22 }}>
      <h3 style={S.settingsSubtitle}>{m.settings.langTitle}</h3>
      <div style={S.catIntro}>{m.settings.langIntro}</div>
      <div
        style={{ ...S.kindGroup, marginTop: 12, display: "inline-flex" }}
        role="group"
        aria-label={m.settings.langTitle}
      >
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

/** What the app is, the introduction again, and the legal pages (once the site has its address). */
function AboutSection({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { m, lang } = useI18n();
  const links = legalLinks(import.meta.env.VITE_SITE_URL, lang);
  const help = helpLinks(
    import.meta.env.VITE_SITE_URL,
    import.meta.env.VITE_SUPPORT_EMAIL,
    lang,
    m.settings.helpSubject(APP_NAME),
  );
  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={S.settingsSubtitle}>{m.settings.aboutTitle}</h3>
      <div style={S.catIntro}>{m.settings.aboutText}</div>
      <div style={{ ...row, marginTop: 12, alignItems: "center" }}>
        <button type="button" style={{ ...S.catAdd, marginTop: 0 }} onClick={onReplayIntro}>
          {m.settings.replayIntro}
        </button>
        {links && (
          <>
            <a href={links.privacy} target="_blank" rel="noreferrer" style={S.aboutLink}>
              {m.settings.privacy}
            </a>
            <a href={links.terms} target="_blank" rel="noreferrer" style={S.aboutLink}>
              {m.settings.terms}
            </a>
          </>
        )}
      </div>
      {(help.faq || help.mail) && (
        <div style={{ marginTop: 20 }}>
          <h3 style={S.helpTitle}>{m.settings.helpTitle}</h3>
          <div style={S.catIntro}>{m.settings.helpText}</div>
          <div style={{ ...row, marginTop: 10, alignItems: "center" }}>
            {help.mail && (
              <a href={help.mail} style={{ ...S.catAdd, marginTop: 0, textDecoration: "none", color: "inherit" }}>
                {m.settings.helpMail}
              </a>
            )}
            {help.faq && (
              <a href={help.faq} target="_blank" rel="noreferrer" style={S.aboutLink}>
                {m.settings.helpFaq}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
