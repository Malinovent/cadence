import { useState, type FormEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { authErrorMessage, isValidEmail, isValidPassword } from "../lib/syncUi";
import type { AuthResult, OAuthProvider } from "../sync/engine";
import { S } from "../styles";

export type SignInActions = {
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  sendReset(email: string): Promise<AuthResult>;
  setPassword(password: string): Promise<AuthResult>;
  signInWith(provider: OAuthProvider): Promise<AuthResult>;
};

type Props = SignInActions & {
  providers: OAuthProvider[];
  /** arrived from a reset link: only "Choose a new password" */
  recovery: boolean;
  autoFocus?: boolean;
};

type Step = "signin" | "signup" | "forgot" | "checkEmail" | "resetSent";
type Busy = "submit" | OAuthProvider | null;

const col = { display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 } as const;
const input = { ...S.tplNameInput, width: "100%", boxSizing: "border-box" } as const;
const primary = { ...S.resetConfirm, background: "var(--c-done)", minHeight: 44 } as const;
const quiet = { ...S.textBtn, fontSize: 13, fontWeight: 400, color: "var(--c-muted)", padding: "6px 0" } as const;
const errorLine = { fontStyle: "italic", fontSize: 13, color: "var(--c-danger)" } as const;
const off = (disabled: boolean) => (disabled ? { opacity: 0.5, cursor: "default" } : {});

/**
 * Sign-in (JP, 2026-11-17): Google / Apple, or an email and password account; create one, or get
 * a link to choose a new password. Used by the sign-in page and Settings → Sync.
 */
export default function SignInForm(p: Props) {
  const { m } = useI18n();
  const a = m.account;
  const [step, setStep] = useState<Step>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const go = (next: Step) => {
    setStep(next);
    setError(null);
    setPassword("");
    setShow(false);
  };

  const run = async (call: () => Promise<AuthResult>, onOk?: () => void) => {
    setError(null);
    setBusy("submit");
    const r = await call();
    setBusy(null);
    if (r.ok) onOk?.();
    else setError(authErrorMessage(r.reason, m.lib));
  };

  const onProvider = async (provider: OAuthProvider) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const r = await p.signInWith(provider); // leaves the page; busy until it does
    if (!r.ok) {
      setBusy(null);
      setError(authErrorMessage(r.reason, m.lib));
    }
  };

  const mode = p.recovery ? "newPassword" : step;
  const needsEmail = mode === "signin" || mode === "signup" || mode === "forgot";
  const needsPassword = mode === "signin" || mode === "signup" || mode === "newPassword";
  const newPw = mode === "signup" || mode === "newPassword";
  const canSubmit =
    busy === null &&
    (!needsEmail || isValidEmail(email)) &&
    (!needsPassword || (newPw ? isValidPassword(password) : password.length > 0));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "signin") void run(() => p.signIn(email.trim(), password));
    else if (mode === "signup") void run(() => p.signUp(email.trim(), password), () => go("checkEmail"));
    else if (mode === "forgot") void run(() => p.sendReset(email.trim()), () => go("resetSent"));
    else if (mode === "newPassword") void run(() => p.setPassword(password));
  };

  if (mode === "checkEmail" || mode === "resetSent")
    return (
      <div style={col}>
        <div role="status" style={{ ...S.catIntro, marginTop: 0 }}>
          {mode === "checkEmail" ? a.checkEmail : a.resetSent}
        </div>
        <button type="button" style={{ ...quiet, alignSelf: "flex-start" }} onClick={() => go("signin")}>
          {a.backToSignIn}
        </button>
      </div>
    );

  const [idle, working] = {
    signin: [a.signIn, a.signingIn],
    signup: [a.createConfirm, a.creating],
    forgot: [a.resetSend, a.sending],
    newPassword: [a.savePassword, a.saving],
  }[mode];
  const submitLabel = busy === "submit" ? working : idle;

  return (
    <div style={col}>
      {mode === "newPassword" && <div style={{ fontSize: 15, fontWeight: 700 }}>{a.newTitle}</div>}
      {mode !== "newPassword" && p.providers.length > 0 && (
        <>
          {p.providers.map((provider) => (
            <button
              key={provider}
              type="button"
              style={{ ...S.resetCancel, minHeight: 44, ...off(busy !== null) }}
              onClick={() => onProvider(provider)}
              disabled={busy !== null}
            >
              {provider === "google" ? a.withGoogle : a.withApple}
            </button>
          ))}
          <div aria-hidden="true" style={{ ...S.catIntro, marginTop: 0, textAlign: "center" }}>
            {a.or}
          </div>
        </>
      )}
      <form style={col} onSubmit={onSubmit} noValidate>
        {needsEmail && (
          <input
            style={input}
            type="email"
            autoComplete="email"
            autoFocus={p.autoFocus}
            placeholder={a.emailPlaceholder}
            aria-label={a.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy !== null}
          />
        )}
        {needsPassword && (
          <div style={{ position: "relative" }}>
            <input
              style={{ ...input, paddingRight: 64 }}
              type={show ? "text" : "password"}
              autoComplete={newPw ? "new-password" : "current-password"}
              autoFocus={p.autoFocus && !needsEmail}
              placeholder={newPw ? a.newPassword : a.password}
              aria-label={newPw ? a.newPassword : a.password}
              aria-describedby={newPw ? "pw-hint" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy !== null}
            />
            <button
              type="button"
              aria-pressed={show}
              style={{ ...quiet, position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}
              onClick={() => setShow((v) => !v)}
            >
              {show ? a.hide : a.show}
            </button>
          </div>
        )}
        {newPw && (
          <div id="pw-hint" style={{ ...S.catIntro, marginTop: 0, fontSize: 12 }}>
            {a.passwordHint}
          </div>
        )}
        <button type="submit" style={{ ...primary, ...off(!canSubmit) }} disabled={!canSubmit}>
          {submitLabel}
        </button>
      </form>
      {error && (
        <div role="alert" style={errorLine}>
          {error}
        </div>
      )}
      {mode === "signin" && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <button type="button" style={quiet} onClick={() => go("forgot")}>
            {a.forgot}
          </button>
          <button type="button" style={quiet} onClick={() => go("signup")}>
            {a.create}
          </button>
        </div>
      )}
      {(mode === "signup" || mode === "forgot") && (
        <button type="button" style={{ ...quiet, alignSelf: "flex-start" }} onClick={() => go("signin")}>
          {mode === "signup" ? a.haveAccount : a.backToSignIn}
        </button>
      )}
    </div>
  );
}
