import { statusBadge } from "../lib/syncUi";
import type { SyncStatus } from "../sync/engine";
import { S } from "../styles";

export type View = "calendar" | "stats" | "categories" | "settings";
const VIEWS: View[] = ["calendar", "stats", "categories", "settings"];

export default function Header({
  view,
  setView,
  syncStatus,
  onSignIn,
}: {
  view: View;
  setView: (v: View) => void;
  /** set only when sync is configured and signed in; null hides the status line */
  syncStatus: SyncStatus | null;
  /** set only when sync is configured and signed out; shows a "sign in to sync" link */
  onSignIn: (() => void) | null;
}) {
  const badge = syncStatus ? statusBadge(syncStatus) : null;
  const nav = (
    <nav style={S.nav}>
      {VIEWS.map((v) => (
        <button key={v} onClick={() => setView(v)} style={{ ...S.navBtn, ...(view === v ? S.navBtnActive : {}) }}>
          {v}
        </button>
      ))}
    </nav>
  );
  return (
    <header style={S.header}>
      <div>
        <h1 style={S.logo}>Cadence</h1>
        <p style={S.tagline}>Balance the week before the week balances you.</p>
      </div>
      {badge ? (
        <div style={S.navStack}>
          {nav}
          <button style={S.syncStatus} onClick={() => setView("settings")}>
            <span style={{ ...S.syncDot, background: badge.dot }} />
            {badge.label}
          </button>
        </div>
      ) : onSignIn ? (
        <div style={S.navStack}>
          {nav}
          <button style={S.signInBtn} onClick={onSignIn}>
            sign in to sync
          </button>
        </div>
      ) : (
        nav
      )}
    </header>
  );
}
