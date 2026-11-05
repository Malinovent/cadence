import { statusBadge } from "../lib/syncUi";
import type { SyncStatus } from "../sync/engine";
import { S } from "../styles";

// S1.4: no Tasks view any more, tasks live in the areas-and-tasks panel beside the grid
export type View = "calendar" | "stats" | "categories" | "settings";
const VIEWS: View[] = ["calendar", "stats", "categories", "settings"];

export default function Header({
  view,
  setView,
  syncStatus,
  earlyBird = false,
}: {
  view: View;
  setView: (v: View) => void;
  /** set only when sync is configured and signed in; null hides the status line */
  syncStatus: SyncStatus | null;
  /** S1.11: the signed-in email bought the early-bird offer */
  earlyBird?: boolean;
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
        <h1 style={S.logo}>
          Cadence
          {earlyBird && <span style={S.earlyBadge}>Early bird</span>}
        </h1>
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
      ) : (
        nav
      )}
    </header>
  );
}
