import { useEffect, useState } from "react";
import CategoriesView from "./components/CategoriesView";
import Header, { type View } from "./components/Header";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import StatsView from "./components/StatsView";
import TasksView from "./components/TasksView";
import WeekGrid from "./components/WeekGrid";
import { useInteraction } from "./interaction/useInteraction";
import { moveBlock, type WeekIndex } from "./lib/actions";
import { ROW_H_PHONE } from "./lib/constants";
import { defaultDay } from "./lib/dayview";
import { resolveDrop } from "./lib/gesture";
import { isRemoteApply } from "./lib/syncUi";
import type { Block, CadenceData } from "./lib/model";
import type { StatsRange } from "./lib/stats";
import { useCadence } from "./state/useCadence";
import { useIsPhone } from "./state/useIsPhone";
import { useSync } from "./sync/useSync";
import { FONT_IMPORT, S } from "./styles";

export default function App() {
  const { data, actions, store } = useCadence();
  // Supabase sync (no-op when not configured): header status, Settings "Account & sync", conflict banner
  const sync = useSync(store);
  const [view, setView] = useState<View>("calendar");
  const [activeWeek, setActiveWeek] = useState<WeekIndex>(0); // 0 = this week, 1 = next week
  const [statsRange, setStatsRange] = useState<StatsRange>("month");
  const [editingId, setEditingId] = useState<string | null>(null); // block open in the inline editor
  const [armedCatId, setArmedCatId] = useState<string | null>(null); // tap-to-place: armed tray category
  const [phoneDay, setPhoneDay] = useState(() => defaultDay(0, new Date())); // phone: the one day shown, Mon = 0
  const isPhone = useIsPhone();

  // drag-and-drop and resize for the tray and the grid (Pointer Events, see src/interaction)
  const interaction = useInteraction({
    onDrop: (source, hit) => {
      const d = resolveDrop(source, hit);
      if (d.kind === "tag") actions.addTag(d.blockId, d.catId);
      else if (d.kind === "place") actions.placeBlock(activeWeek, d.catId, d.day, d.start);
      else actions.moveBlock(activeWeek, d.id, d.day, d.start);
    },
    onResize: (id, edge, origStart, origMins, deltaSlots) =>
      actions.resize(activeWeek, id, edge, origStart, origMins, deltaSlots),
  });

  // a server copy replaced the data: the open editor and an armed tray item may point at stale ids
  useEffect(() => {
    let prev = store.getSnapshot().data;
    return store.subscribe(() => {
      const { data: next, meta } = store.getSnapshot();
      const remote = isRemoteApply(prev, next, meta);
      prev = next;
      if (!remote) return;
      setEditingId(null);
      setArmedCatId(null);
    });
  }, [store]);

  // Escape disarms tap-to-place
  useEffect(() => {
    if (!armedCatId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmedCatId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armedCatId]);

  // changing view or week disarms tap-to-place
  const changeView = (v: View) => {
    setView(v);
    setArmedCatId(null);
  };
  const changeWeek = (w: WeekIndex) => {
    setActiveWeek(w);
    setArmedCatId(null);
  };

  // week 2 becomes week 1, and the view jumps back to it
  const onAdvance = () => {
    actions.advanceWeek();
    changeWeek(0);
  };

  // editor day chips: move the block; on phone the view follows it, if it actually moved
  const onMoveToDay = (p: Block, day: number) => {
    const moved = moveBlock(data, activeWeek, p.id, day, p.start) !== data;
    actions.moveBlock(activeWeek, p.id, day, p.start);
    if (isPhone && moved && p.day !== day) setPhoneDay(day);
  };

  // an import replaces everything; drop UI state that may point at old blocks
  const onReplace = (next: CadenceData) => {
    actions.replaceAll(next);
    setEditingId(null);
    changeWeek(0);
  };

  return (
    <div style={S.root}>
      <style>{FONT_IMPORT}</style>
      <Header view={view} setView={changeView} syncStatus={sync.configured && sync.session ? sync.status : null} />
      {view === "calendar" && sync.conflict && (
        <div style={S.conflictBanner}>
          <span>This device and your account both have a schedule.</span>
          <button style={S.textBtn} onClick={() => changeView("settings")}>
            Choose which to keep →
          </button>
        </div>
      )}
      {view === "calendar" && (
        <div className="cadence-body" style={S.body}>
          <Sidebar
            data={data}
            week={activeWeek}
            setWeek={changeWeek}
            interaction={interaction}
            armedCatId={armedCatId}
            onArm={setArmedCatId}
            actions={actions}
            onAdvance={onAdvance}
          />
          <WeekGrid
            week={activeWeek}
            blocks={data.weeks[activeWeek]}
            cats={data.cats}
            editingId={editingId}
            setEditingId={setEditingId}
            interaction={interaction}
            armedCatId={armedCatId}
            onPlaced={() => setArmedCatId(null)}
            actions={actions}
            onMoveToDay={onMoveToDay}
            {...(isPhone ? { rowH: ROW_H_PHONE, days: [phoneDay], phone: { day: phoneDay, setDay: setPhoneDay } } : {})}
          />
        </div>
      )}
      {view === "stats" && (
        <StatsView data={data} range={statsRange} setRange={setStatsRange} resetStats={actions.resetStats} />
      )}
      {view === "tasks" && <TasksView tasks={data.tasks} actions={actions} />}
      {view === "categories" && <CategoriesView cats={data.cats} actions={actions} />}
      {view === "settings" && <SettingsView data={data} onReplace={onReplace} sync={sync.configured ? sync : null} />}
    </div>
  );
}
