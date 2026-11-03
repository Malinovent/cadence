import { useRef, useState } from "react";
import CategoriesView from "./components/CategoriesView";
import type { DragInfo } from "./components/drag";
import Header, { type View } from "./components/Header";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import StatsView from "./components/StatsView";
import WeekGrid from "./components/WeekGrid";
import type { WeekIndex } from "./lib/actions";
import type { CadenceData } from "./lib/model";
import type { StatsRange } from "./lib/stats";
import { useCadence } from "./state/useCadence";
import { FONT_IMPORT, S } from "./styles";

export default function App() {
  const { data, actions } = useCadence();
  const [view, setView] = useState<View>("calendar");
  const [activeWeek, setActiveWeek] = useState<WeekIndex>(0); // 0 = this week, 1 = next week
  const [statsRange, setStatsRange] = useState<StatsRange>("month");
  const [editingId, setEditingId] = useState<string | null>(null); // block open in the inline editor
  const dragRef = useRef<DragInfo | null>(null);

  // week 2 becomes week 1, and the view jumps back to it
  const onAdvance = () => {
    actions.advanceWeek();
    setActiveWeek(0);
  };

  // an import replaces everything; drop UI state that may point at old blocks
  const onReplace = (next: CadenceData) => {
    actions.replaceAll(next);
    setEditingId(null);
    setActiveWeek(0);
  };

  return (
    <div style={S.root}>
      <style>{FONT_IMPORT}</style>
      <Header view={view} setView={setView} />
      {view === "calendar" && (
        <div style={S.body}>
          <Sidebar
            data={data}
            week={activeWeek}
            setWeek={setActiveWeek}
            dragRef={dragRef}
            actions={actions}
            onAdvance={onAdvance}
          />
          <WeekGrid
            week={activeWeek}
            blocks={data.weeks[activeWeek]}
            cats={data.cats}
            editingId={editingId}
            setEditingId={setEditingId}
            dragRef={dragRef}
            actions={actions}
          />
        </div>
      )}
      {view === "stats" && (
        <StatsView data={data} range={statsRange} setRange={setStatsRange} resetStats={actions.resetStats} />
      )}
      {view === "categories" && <CategoriesView cats={data.cats} actions={actions} />}
      {view === "settings" && <SettingsView data={data} onReplace={onReplace} />}
    </div>
  );
}
