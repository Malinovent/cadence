import { useState, type FormEvent, type ReactNode } from "react";
import { importSummaryLine } from "../lib/format";
import { authErrorMessage, isValidCode, isValidEmail, statusSentence } from "../lib/syncUi";
import type { AuthResult, ConflictChoice, SyncConflict, SyncSession, SyncStatus } from "../sync/engine";
import { ink, S } from "../styles";
import SetRow from "./SetRow";
import { useI18n } from "../i18n/I18nProvider";

export type AccountSyncProps = {
  session: SyncSession | null;
  status: SyncStatus;
  conflict: SyncConflict | null;
  sendCode(email: string): Promise<AuthResult>;
  verifyCode(email: string, code: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<AuthResult>;
  resolveConflict(choice: ConflictChoice): void;
};

const row = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } as const;
const errorLine = { fontStyle: "italic", fontSize: 13, color: "var(--c-danger)", marginTop: 10 } as const;
const smallTextBtn = { ...S.textBtn, fontSize: 12, fontWeight: 400, color: "var(--c-muted)" } as const;
const off = (disabled: boolean) => (disabled ? { opacity: 0.5, cursor: "default" } : {});
const input = { ...S.tplNameInput, flex: "1 1 220px", maxWidth: 320 } as const;

type Step = { kind: "email" } | { kind: "code"; email: string };

// Settings → Data and account → Sync (SPEC "Phase 4 design: sync" → "UI"). Rendered only when sync is configured.
/** `children`: the rows that sit between Sync and the quiet Delete my account (export, import). */
export default function AccountSync({ children, ...p }: AccountSyncProps & { children?: ReactNode }) {
  const { m } = useI18n();
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | "signout" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // delete my account: asked first, then said plainly once it's done (JP, 2026-11-07)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [open, setOpen] = useState(false); // the sign-in form, opened from the Sync row

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const addr = email.trim();
    if (!isValidEmail(addr)) return; // the button stays disabled until the address looks right
    setError(null);
    setBusy("send");
    const r = await p.sendCode(addr);
    setBusy(null);
    if (r.ok) {
      setCode("");
      setStep({ kind: "code", email: addr });
    } else setError(authErrorMessage(r.reason, m.lib));
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || step.kind !== "code") return;
    if (!isValidCode(code)) return; // the button stays disabled until a full code is typed
    setError(null);
    setBusy("verify");
    const r = await p.verifyCode(step.email, code.trim());
    setBusy(null);
    if (r.ok) {
      setStep({ kind: "email" });
      setCode("");
    } else setError(authErrorMessage(r.reason, m.lib));
  };

  const onDifferentEmail = () => {
    setStep({ kind: "email" });
    setEmail("");
    setCode("");
    setError(null);
  };

  const onSignOut = async () => {
    if (busy) return;
    setBusy("signout");
    await p.signOut();
    setBusy(null);
  };

  const onDelete = async () => {
    if (busy) return;
    setError(null);
    setBusy("delete");
    const r = await p.deleteAccount();
    setBusy(null);
    if (r.ok) {
      setConfirmDelete(false);
      setDeleted(true);
    } else setError(m.account.deleteFailed);
  };

  const sentence = statusSentence(p.status, m.lib);
  const signInOpen = open || step.kind === "code";

  // Settings → Data and account: one Sync row; signing in opens under it; Delete my account last and quiet
  return (
    <>
      {p.conflict && (
        <div style={{ ...S.setPanel, paddingTop: 14 }}>
          <div style={{ ...S.streakCard, textAlign: "left", padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.account.conflict}</div>
            <div style={S.catIntro}>{m.account.onDevice(importSummaryLine(p.conflict.local, m.lib))}</div>
            <div style={S.catIntro}>{m.account.inAccount(importSummaryLine(p.conflict.server, m.lib))}</div>
            <div style={{ ...row, marginTop: 10 }}>
              <button
                style={{ ...S.resetConfirm, background: "var(--c-done)" }}
                onClick={() => p.resolveConflict("local")}
              >
                {m.account.keepDevice}
              </button>
              <button style={S.resetCancel} onClick={() => p.resolveConflict("server")}>
                {m.account.useAccount}
              </button>
            </div>
          </div>
        </div>
      )}

      {p.session ? (
        <SetRow
          label={m.account.title}
          hint={
            <>
              {p.session.email ?? m.account.yourAccount}
              {!p.conflict && sentence && <span style={{ display: "block" }}>{sentence}</span>}
            </>
          }
        >
          <button
            type="button"
            style={{ ...S.setLink, ...off(busy !== null) }}
            onClick={onSignOut}
            disabled={busy !== null}
          >
            {m.account.signOut}
          </button>
        </SetRow>
      ) : (
        <>
          <SetRow label={m.account.title} hint={deleted ? m.account.deletedNote : m.account.hint}>
            {!signInOpen && (
              <button type="button" aria-expanded={false} style={S.setLink} onClick={() => setOpen(true)}>
                {m.account.start}
              </button>
            )}
          </SetRow>
          {signInOpen && (
            <div style={S.setPanel}>
              {step.kind === "email" ? (
                <>
                  <div style={{ ...S.catIntro, marginTop: 0 }}>{m.account.intro}</div>
                  <form style={{ ...row, marginTop: 10 }} onSubmit={onSend} noValidate>
                    <input
                      style={input}
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder={m.account.emailPlaceholder}
                      aria-label={m.account.email}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy !== null}
                    />
                    <button
                      type="submit"
                      style={{ ...S.catAdd, marginTop: 0, ...off(busy !== null || !isValidEmail(email)) }}
                      disabled={busy !== null || !isValidEmail(email)}
                    >
                      {busy === "send" ? m.account.sending : m.account.sendCode}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div style={{ ...S.catIntro, marginTop: 0 }}>{m.account.checkEmail}</div>
                  <form style={{ ...row, marginTop: 10 }} onSubmit={onVerify} noValidate>
                    <input
                      style={{
                        ...input,
                        flex: "0 1 140px",
                        fontFamily: "'Spline Sans Mono', monospace",
                        letterSpacing: "0.2em",
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={10}
                      aria-label={m.account.code}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={busy !== null}
                    />
                    <button
                      type="submit"
                      style={{
                        ...S.resetConfirm,
                        background: "var(--c-done)",
                        ...off(busy !== null || !isValidCode(code)),
                      }}
                      disabled={busy !== null || !isValidCode(code)}
                    >
                      {busy === "verify" ? m.account.signingIn : m.account.signIn}
                    </button>
                  </form>
                  <div style={{ marginTop: 10 }}>
                    <button style={smallTextBtn} onClick={onDifferentEmail} disabled={busy !== null}>
                      {m.account.differentEmail}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div role="alert" style={{ ...S.setPanel, ...errorLine, marginTop: 0 }}>
          {error}
        </div>
      )}

      {children}

      {p.session &&
        (confirmDelete ? (
          <div style={S.setPanel}>
            <div role="group" aria-labelledby="delete-title" style={S.deleteCard}>
              <div id="delete-title" style={{ fontSize: 15, fontWeight: 700 }}>
                {m.account.deleteTitle}
              </div>
              <div style={S.catIntro}>{m.account.deleteText}</div>
              <div style={{ ...row, marginTop: 12 }}>
                <button
                  type="button"
                  style={{ ...S.resetConfirm, background: ink, ...off(busy !== null) }}
                  onClick={onDelete}
                  disabled={busy !== null}
                >
                  {busy === "delete" ? m.account.deleting : m.account.deleteConfirm}
                </button>
                <button
                  type="button"
                  style={S.resetCancel}
                  onClick={() => {
                    setConfirmDelete(false);
                    setError(null);
                  }}
                  disabled={busy !== null}
                >
                  {m.account.deleteCancel}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            style={{ ...S.setRowBtn, minHeight: 44, fontSize: 13, color: "var(--c-muted)" }}
            onClick={() => setConfirmDelete(true)}
            disabled={busy !== null}
          >
            {m.account.delete}
          </button>
        ))}
    </>
  );
}
