import { useCallback, useEffect, useRef, useState } from "react";
import CategoriesView from "./components/CategoriesView";
import Header, { type View } from "./components/Header";
import SettingsView from "./components/SettingsView";
import StatsView from "./components/StatsView";
import AreasPanel from "./components/AreasPanel";
import PhoneDock from "./components/PhoneDock";
import WeekBar from "./components/WeekBar";
import WeekFooter from "./components/WeekFooter";
import WeekGrid from "./components/WeekGrid";
import WelcomeBack from "./components/WelcomeBack";
import UndoBar from "./components/UndoBar";
import PurposePage from "./components/PurposePage";
import Coach, { type CoachAction } from "./components/Coach";
import Checklist from "./components/Checklist";
import { relabelDefaults } from "./lib/onboarding";
import type { Guide } from "./lib/guide";
import { useOnboarding } from "./state/useOnboarding";
import { undoAvailable, type UndoOffer } from "./lib/undo";
import { shouldWelcome } from "./lib/welcome";
import { STARTERS } from "./lib/starters";
import { readWelcomeAnswered, writeWelcomeAnswered } from "./state/welcomePrefs";
import SlotMenu from "./components/SlotMenu";
import type { SlotTap } from "./lib/slotMenu";
import { useInteraction } from "./interaction/useInteraction";
import { moveBlock, type WeekIndex } from "./lib/actions";
import { ROW_H_PHONE } from "./lib/constants";
import { defaultDay } from "./lib/dayview";
import { resolveDrop } from "./lib/gesture";
import { isRemoteApply } from "./lib/syncUi";
import type { Block, CadenceData } from "./lib/model";
import { completion, type StatsRange } from "./lib/stats";
import { season } from "./lib/balancedWeeks";
import { panelAreas } from "./lib/panel";
import { readBalanceRules } from "./state/balanceRules";
import { readPanelHidden, writePanelHidden } from "./state/panelPrefs";
import { returnEnded } from "./lib/tasks";
import { useCadence } from "./state/useCadence";
import { useIsPhone } from "./state/useIsPhone";
import { useNow } from "./state/useNow";
import { useSync } from "./sync/useSync";
import { useEarlyBird } from "./sync/useEarlyBird";
import { FONT_IMPORT, S } from "./styles";
import { useI18n } from "./i18n/I18nProvider";

export default function App() {
  const { data, actions, store } = useCadence();
  // Supabase sync (no-op when not configured): header status, Settings "Account & sync", conflict banner
  const sync = useSync(store);
  const { m, lang } = useI18n();
  const earlyBird = useEarlyBird(sync.session?.email ?? null); // S1.11
  const [view, setView] = useState<View>("calendar");
  const [activeWeek, setActiveWeek] = useState<WeekIndex>(0); // 0 = this week, 1 = next week
  const [statsRange, setStatsRange] = useState<StatsRange>("month");
  const [editingId, setEditingId] = useState<string | null>(null); // block open in the inline editor
  const [armedCatId, setArmedCatId] = useState<string | null>(null); // tap-to-place: armed tray category
  const [slotTap, setSlotTap] = useState<SlotTap | null>(null); // S1.6: the add window, open on this slot
  // S1.7: the last edit as of opening (or a later one pulled from the account), never the
  // automatic changes made after opening; and the absence the prompt was last answered for
  const [lastEdit, setLastEdit] = useState(() => store.getSnapshot().meta.updatedAt);
  const [welcomeAnswered, setWelcomeAnswered] = useState(readWelcomeAnswered);
  const [undo, setUndo] = useState<UndoOffer | null>(null); // a week just replaced or rolled forward
  const [phoneDay, setPhoneDay] = useState(() => defaultDay(0, new Date())); // phone: the one day shown, Mon = 0
  const isPhone = useIsPhone();
  // S1.4: the areas-and-tasks panel hidden (desktop) or folded (phone); remembered on this device
  const [panelHidden, setPanelHidden] = useState(readPanelHidden);
  const setHidden = (hidden: boolean) => {
    setPanelHidden(hidden);
    writePanelHidden(hidden);
    if (hidden) setArmedCatId(null);
  };

  // drag-and-drop and resize for the tray and the grid (Pointer Events, see src/interaction)
  const interaction = useInteraction({
    onDrop: (source, hit) => {
      const d = resolveDrop(source, hit);
      if (!d) return;
      if (d.kind === "tag") actions.addTag(d.blockId, d.catId);
      else if (d.kind === "place") actions.placeBlock(activeWeek, d.catId, d.day, d.start);
      else if (d.kind === "attach") actions.attachTask(d.taskId, d.blockId);
      else actions.moveBlock(activeWeek, d.id, d.day, d.start);
    },
    onResize: (id, edge, origStart, origMins, deltaSlots) =>
      actions.resize(activeWeek, id, edge, origStart, origMins, deltaSlots),
  });

  // a server copy replaced the data: the open editor and an armed tray item may point at stale ids
  useEffect(() => {
    let prev = { data: store.getSnapshot().data, updatedAt: store.getSnapshot().meta.updatedAt };
    return store.subscribe(() => {
      const { data: next, meta } = store.getSnapshot();
      const remote = isRemoteApply(prev, next, meta);
      prev = { data: next, updatedAt: meta.updatedAt };
      if (!remote) return;
      setLastEdit((t) => Math.max(t, meta.updatedAt)); // an edit on another device counts
      setEditingId(null);
      setArmedCatId(null);
      setSlotTap(null);
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
    setSlotTap(null);
  };
  const changeWeek = (w: WeekIndex) => {
    setActiveWeek(w);
    setArmedCatId(null);
    setSlotTap(null);
  };

  // one tap that replaces a week: do it, and keep what was there so it can be undone
  const withUndo = (text: string, run: () => void) => {
    const before = store.getSnapshot().data;
    run();
    const after = store.getSnapshot().data;
    if (after !== before) setUndo({ before, after, text });
  };
  const replaceWeek = (week: WeekIndex, run: () => void) => {
    withUndo(m.undo.replaced(m.week.names[week]), run);
    onb.markTried(); // the checklist's "Try a starter week"
  };

  // a language picked (onboarding or Settings) while the areas are still the untouched defaults:
  // their names follow. Automatic, so not an edit.
  const shownLang = useRef(lang);
  useEffect(() => {
    if (shownLang.current === lang) return;
    shownLang.current = lang;
    store.adjust((d) => relabelDefaults(d, lang));
  }, [lang, store]);

  // onboarding (JP, 2026-11-07): purpose page, the guided first block, then the checklist
  const onb = useOnboarding({
    store,
    data,
    week: activeWeek,
    isPhone,
    go: {
      calendar: () => changeView("calendar"),
      areas: () => changeView("categories"),
      settings: () => changeView("settings"),
      showPanel: () => setHidden(false),
      day: (d) => setPhoneDay(d),
    },
  });
  const areaName = (id: string) => data.cats.find((c) => c.id === id)?.name || m.lib.panel.untitled;
  const device = isPhone ? "phone" : "desktop";
  const coachFor = (g: Guide): { target: string; title: string; body?: string; actions: CoachAction[] } => {
    const gotIt: CoachAction = { label: m.guide.gotIt, primary: true, onClick: onb.endGuide };
    switch (g.step) {
      case "drag":
        return {
          target: `area-${g.catId}`,
          title: m.guide.drag[device](areaName(g.catId)),
          body: m.guide.dragBody[device],
          actions: [{ label: m.guide.notNow, onClick: onb.endGuide }],
        };
      case "placed":
        return {
          target: `count-${g.catId}`,
          title: m.guide.placedTitle(areaName(g.catId)),
          body: m.guide.placedBody,
          actions: [{ label: m.guide.next, primary: true, onClick: onb.afterPlaced }],
        };
      case "tick":
        return { target: `tick-${g.blockId}`, title: m.guide.tickTitle, body: m.guide.tickBody, actions: [gotIt] };
      case "area":
        return { target: "areas-page", title: m.guide.areaTitle, body: m.guide.areaBody, actions: [gotIt] };
      case "task":
        return { target: "add-task", title: m.guide.taskTitle, body: m.guide.taskBody[device], actions: [gotIt] };
      default:
        return { target: "starters", title: m.guide.templateTitle, body: m.guide.templateBody, actions: [gotIt] };
    }
  };

  // week 2 becomes week 1, and the view jumps back to it
  const onAdvance = () => {
    withUndo(m.undo.rolled, () => actions.advanceWeek());
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

  // S1.5: as the clock passes the end of a block that wasn't ticked, its tasks go back to their
  // list. Automatic, so not an edit: a device opening with an old copy must not beat newer data.
  const now = useNow();
  useEffect(() => {
    store.adjust((d) => returnEnded(d, now));
  }, [store, now, data.tasks]);

  // calendar view: the panel's content (desktop side panel or phone dock) and the bars around the grid
  const done = completion(data, activeWeek);
  const panel = {
    areas: panelAreas(data, activeWeek, m.lib),
    data,
    now,
    interaction,
    armedCatId,
    onArm: setArmedCatId,
    onHide: () => setHidden(true),
    actions,
  };
  const showSide = !isPhone && !panelHidden;
  const welcome = shouldWelcome({
    lastEdit,
    now: now.getTime(),
    dismissedFor: welcomeAnswered,
    templates: data.templates.length + STARTERS.length,
  });
  const answerWelcome = () => {
    writeWelcomeAnswered(lastEdit);
    setWelcomeAnswered(lastEdit);
  };
  const closeSlotMenu = useCallback(() => setSlotTap(null), []);

  return (
    <div style={S.root}>
      <style>{FONT_IMPORT}</style>
      <Header
        view={view}
        setView={changeView}
        syncStatus={sync.configured && sync.session ? sync.status : null}
        earlyBird={earlyBird}
      />
      {view === "calendar" && sync.conflict && (
        <div style={S.conflictBanner}>
          <span>{m.conflict.banner}</span>
          <button style={S.textBtn} onClick={() => changeView("settings")}>
            {m.conflict.choose}
          </button>
        </div>
      )}
      {view === "calendar" && welcome && (
        <WelcomeBack
          templates={data.templates}
          blocksInWeek1={data.weeks[0].length}
          onUse={(id) => {
            replaceWeek(0, () => actions.applyTemplate(0, id));
            answerWelcome();
            changeWeek(0);
          }}
          onStarter={(id) => {
            replaceWeek(0, () => actions.applyStarter(0, id, { lang }));
            answerWelcome();
            changeWeek(0);
          }}
          onNotNow={answerWelcome}
        />
      )}
      {view === "calendar" && (
        <>
          <div style={showSide ? S.body : S.bodySolo}>
            {showSide && <AreasPanel {...panel} />}
            <main style={S.mainCol}>
              {onb.checklistVisible && (
                <Checklist
                  done={onb.done}
                  collapsed={onb.checklist.collapsed}
                  onToggle={onb.toggleChecklist}
                  onShow={onb.show}
                  onClose={onb.closeChecklist}
                />
              )}
              <WeekBar
                week={activeWeek}
                setWeek={changeWeek}
                season={season(data.cats, data.history, new Date(), readBalanceRules())}
                footnote={m.week.ticked(done.done, done.total)}
                onShowPanel={!isPhone && panelHidden ? () => setHidden(false) : null}
              />
              <WeekGrid
                week={activeWeek}
                blocks={data.weeks[activeWeek]}
                cats={data.cats}
                tasks={data.tasks}
                weeks={data.weeks}
                editingId={editingId}
                setEditingId={setEditingId}
                interaction={interaction}
                armedCatId={armedCatId}
                onPlaced={() => setArmedCatId(null)}
                actions={actions}
                onMoveToDay={onMoveToDay}
                onEmptyTap={setSlotTap}
                slotMark={slotTap}
                {...(isPhone
                  ? {
                      rowH: ROW_H_PHONE,
                      days: [phoneDay],
                      phone: {
                        day: phoneDay,
                        setDay: (d: number) => {
                          setPhoneDay(d);
                          setSlotTap(null);
                        },
                      },
                    }
                  : {})}
              />
              <WeekFooter
                data={data}
                week={activeWeek}
                actions={actions}
                onApplyTemplate={(id) => replaceWeek(activeWeek, () => actions.applyTemplate(activeWeek, id))}
                onApplyStarter={(id) => replaceWeek(activeWeek, () => actions.applyStarter(activeWeek, id, { lang }))}
                onAdvance={onAdvance}
              />
            </main>
          </div>
          {isPhone && <PhoneDock {...panel} folded={panelHidden} onShow={() => setHidden(false)} forceTab={onb.tab} />}
          {slotTap && (
            <SlotMenu
              key={`${slotTap.day}-${slotTap.start}`}
              tap={slotTap}
              blocks={data.weeks[activeWeek]}
              cats={data.cats}
              phone={isPhone}
              onPick={(catId) => {
                actions.placeBlock(activeWeek, catId, slotTap.day, slotTap.start);
                setSlotTap(null);
              }}
              onClose={closeSlotMenu}
            />
          )}
        </>
      )}
      {undoAvailable(undo, data) && (
        <UndoBar
          text={undo.text}
          onUndo={() => {
            actions.replaceAll(undo.before);
            setUndo(null);
          }}
          onDismiss={() => setUndo(null)}
        />
      )}
      {view === "stats" && (
        <StatsView data={data} range={statsRange} setRange={setStatsRange} resetStats={actions.resetStats} />
      )}
      {view === "categories" && <CategoriesView cats={data.cats} actions={actions} />}
      {view === "settings" && (
        <SettingsView
          data={data}
          onReplace={onReplace}
          sync={sync.configured ? sync : null}
          earlyBird={earlyBird}
          onReplayIntro={onb.replay}
        />
      )}
      {onb.guide && !onb.intro && (
        <Coach key={JSON.stringify(onb.guide)} {...coachFor(onb.guide)} onClose={onb.endGuide} />
      )}
      {onb.intro && (
        <PurposePage
          phone={isPhone}
          canSignIn={sync.configured && !sync.session}
          onStart={onb.startTour}
          onSkip={onb.skipIntro}
          onSignIn={onb.signIn}
        />
      )}
    </div>
  );
}
