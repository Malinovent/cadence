import { useState, type FormEvent } from "react";
import { importSummaryLine } from "../lib/format";
import { authErrorMessage, isValidCode, isValidEmail, statusSentence } from "../lib/syncUi";
import type { AuthResult, ConflictChoice, SyncConflict, SyncSession, SyncStatus } from "../sync/engine";
import { S } from "../styles";

export type AccountSyncProps = {
  session: SyncSession | null;
  status: SyncStatus;
  conflict: SyncConflict | null;
  sendCode(email: string): Promise<AuthResult>;
  verifyCode(email: string, code: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  resolveConflict(choice: ConflictChoice): void;
};

const row = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } as const;
const errorLine = { fontStyle: "italic", fontSize: 13, color: "#b54", marginTop: 10 } as const;
const smallTextBtn = { ...S.textBtn, fontSize: 12, fontWeight: 400, color: "#7a6e5e" } as const;
const off = (disabled: boolean) => (disabled ? { opacity: 0.5, cursor: "default" } : {});
const input = { ...S.tplNameInput, flex: "1 1 220px", maxWidth: 320 } as const;

type Step = { kind: "email" } | { kind: "code"; email: string };

// Settings → "Account & sync" (SPEC "Phase 4 design: sync" → "UI"). Rendered only when sync is configured.
export default function AccountSync(p: AccountSyncProps) {
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } else setError(authErrorMessage(r.reason));
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
    } else setError(authErrorMessage(r.reason));
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

  const sentence = statusSentence(p.status);

  return (
    <>
      <h2 style={{ ...S.statsTitle, marginTop: 36 }}>Account &amp; sync</h2>

      {p.conflict && (
        <div style={{ ...S.streakCard, textAlign: "left", padding: 14, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>This device and your account both have a schedule.</div>
          <div style={S.catIntro}>On this device: {importSummaryLine(p.conflict.local)}</div>
          <div style={S.catIntro}>In your account: {importSummaryLine(p.conflict.server)}</div>
          <div style={{ ...row, marginTop: 10 }}>
            <button style={{ ...S.resetConfirm, background: "#1FA98A" }} onClick={() => p.resolveConflict("local")}>
              Keep this device's
            </button>
            <button style={S.resetCancel} onClick={() => p.resolveConflict("server")}>
              Use my account's
            </button>
          </div>
        </div>
      )}

      {p.session ? (
        <>
          <div style={{ ...S.catIntro, ...(p.conflict ? { marginTop: 16 } : {}) }}>Signed in as {p.session.email ?? "your account"}.</div>
          {!p.conflict && sentence && <div style={S.catIntro}>{sentence}</div>}
          <div style={{ ...row, marginTop: 16 }}>
            <button style={{ ...S.resetCancel, ...off(busy !== null) }} onClick={onSignOut} disabled={busy !== null}>
              Sign out
            </button>
          </div>
        </>
      ) : step.kind === "email" ? (
        <>
          <div style={S.catIntro}>
            Sign in with your email to keep your weeks in sync between your phone and computer. No password.
          </div>
          <form style={{ ...row, marginTop: 16 }} onSubmit={onSend} noValidate>
            <input
              style={input}
              id="cadence-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy !== null}
            />
            <button
              type="submit"
              style={{ ...S.catAdd, marginTop: 0, ...off(busy !== null || !isValidEmail(email)) }}
              disabled={busy !== null || !isValidEmail(email)}
            >
              {busy === "send" ? "Sending…" : "Send me a code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <div style={S.catIntro}>Check your email. Tap the link, or type the code here:</div>
          <form style={{ ...row, marginTop: 16 }} onSubmit={onVerify} noValidate>
            <input
              style={{ ...input, flex: "0 1 140px", fontFamily: "'Spline Sans Mono', monospace", letterSpacing: "0.2em" }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              aria-label="Sign-in code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy !== null}
            />
            <button
              type="submit"
              style={{ ...S.resetConfirm, background: "#1FA98A", ...off(busy !== null || !isValidCode(code)) }}
              disabled={busy !== null || !isValidCode(code)}
            >
              {busy === "verify" ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div style={{ marginTop: 10 }}>
            <button style={smallTextBtn} onClick={onDifferentEmail} disabled={busy !== null}>
              Use a different email
            </button>
          </div>
        </>
      )}

      {error && <div style={errorLine}>{error}</div>}
    </>
  );
}
