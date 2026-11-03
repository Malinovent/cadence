import { S } from "../styles";

export type View = "calendar" | "stats" | "categories" | "settings";
const VIEWS: View[] = ["calendar", "stats", "categories", "settings"];

export default function Header({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <header style={S.header}>
      <div>
        <h1 style={S.logo}>Cadence</h1>
        <p style={S.tagline}>Balance the week before the week balances you.</p>
      </div>
      <nav style={S.nav}>
        {VIEWS.map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ ...S.navBtn, ...(view === v ? S.navBtnActive : {}) }}>
            {v}
          </button>
        ))}
      </nav>
    </header>
  );
}
