import { useState, type ReactNode } from "react";
import { importSummaryLine } from "../lib/format";
import { authProviders, statusSentence } from "../lib/syncUi";
import { proLink } from "../lib/legal";
import type { AuthResult, ConflictChoice, SyncConflict, SyncSession, SyncStatus } from "../sync/engine";
import { ink, S } from "../styles";
import SetRow from "./SetRow";
import SignInForm, { type SignInActions } from "./SignInForm";
import { useI18n } from "../i18n/I18nProvider";

export type AccountSyncProps = SignInActions & {
  session: SyncSession | null;
  /** the email has Pro (sync); null while not known */
  pro: boolean | null;
  status: SyncStatus;
  conflict: SyncConflict | null;
  recovery: boolean;
  recheckPro(): void;
  signOut(): Promise<void>;
  deleteAccount(): Promise<AuthResult>;
  resolveConflict(choice: ConflictChoice): void;
};

const row = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
} as const;
const errorLine = {
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--c-danger)",
  marginTop: 10,
} as const;
const off = (disabled: boolean) => (disabled ? { opacity: 0.5, cursor: "default" } : {});

// the providers set up in Supabase (docs/SIGNIN_SETUP.md); none: email and password only
export const PROVIDERS = authProviders(import.meta.env.VITE_AUTH_PROVIDERS);

// Settings → Data and account → Sync (SPEC "Phase 4 design: sync" → "UI"). Rendered only when sync is configured.
/** `children`: the rows that sit between Sync and the quiet Delete my account (export, import). */
export default function AccountSync({ children, ...p }: AccountSyncProps & { children?: ReactNode }) {
  const { m, lang } = useI18n();
  const buyPro = proLink(import.meta.env.VITE_SITE_URL, lang);
  const [busy, setBusy] = useState<"signout" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // delete my account: asked first, then said plainly once it's done (JP, 2026-11-07)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [open, setOpen] = useState(false); // the sign-in form, opened from the Sync row

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
  const signInOpen = open;

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
      ) : null}
      {p.session && p.pro === false && (
        <div style={S.setPanel}>
          <div style={{ ...S.streakCard, textAlign: "left", padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.account.proTitle}</div>
            <div style={S.catIntro}>{m.account.proBody}</div>
            <div style={{ ...row, marginTop: 10 }}>
              {buyPro && (
                <a href={buyPro} target="_blank" rel="noopener" style={{ ...S.resetConfirm, textDecoration: "none" }}>
                  {m.account.proGet}
                </a>
              )}
              <button type="button" style={S.resetCancel} onClick={p.recheckPro}>
                {m.account.proRecheck}
              </button>
            </div>
            <div style={{ ...S.catIntro, marginTop: 10 }}>
              {m.account.proOtherEmail(p.session.email ?? m.account.yourAccount)}
            </div>
          </div>
        </div>
      )}
      {p.session ? null : (
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
              <SignInForm
                providers={PROVIDERS}
                recovery={false}
                autoFocus
                signIn={p.signIn}
                signUp={p.signUp}
                sendReset={p.sendReset}
                setPassword={p.setPassword}
                signInWith={p.signInWith}
              />
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
                  style={{
                    ...S.resetConfirm,
                    background: ink,
                    ...off(busy !== null),
                  }}
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
            style={{
              ...S.setRowBtn,
              minHeight: 44,
              fontSize: 13,
              color: "var(--c-muted)",
            }}
            onClick={() => setConfirmDelete(true)}
            disabled={busy !== null}
          >
            {m.account.delete}
          </button>
        ))}
    </>
  );
}
