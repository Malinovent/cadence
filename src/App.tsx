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
import QuestToast from "./components/QuestToast";
import QuestFinale from "./components/QuestFinale";
import BlockSheet from "./components/BlockSheet";
import WeekReview from "./components/WeekReview";
import TemplatePreview from "./components/TemplatePreview";
import { previewChange } from "./lib/templatePreview";
import { readPhoneView, writePhoneView, type PhoneView } from "./state/phoneViewPrefs";
import { hasReview, weekReview, type WeekReview as Review } from "./lib/review";
import { relabelDefaults } from "./lib/onboarding";
import type { Guide } from "./lib/guide";
import { useOnboarding } from "./state/useOnboarding";
import { undoAvailable, type UndoOffer } from "./lib/undo";
import { shouldWelcome } from "./lib/welcome";
import { addedNote, applyStarter, STARTERS, starterText } from "./lib/starters";
import { readWelcomeAnswered, writeWelcomeAnswered } from "./state/welcomePrefs";
import SlotMenu from "./components/SlotMenu";
import type { SlotTap } from "./lib/slotMenu";
import { useInteraction } from "./interaction/useInteraction";
import { applyDayTemplate, applyTemplate, moveBlock as moveBlockTo, type WeekIndex } from "./lib/actions";
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
import { playSound, unlockSoundOnFirstGesture } from "./state/sound";
import { readDayHours, writeDayHours } from "./state/dayHoursPrefs";
import { gridBounds } from "./lib/dayHours";
import type { Bounds } from "./lib/placement";
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
  const [undo, setUndo] = useState<UndoOffer | null>(null);
  const [review, setReview] = useState<Review | null>(null); // roll forward: how that week went // a week just replaced or rolled forward
  const [phoneDay, setPhoneDay] = useState(() => defaultDay(0, new Date())); // phone: the one day shown, Mon = 0
  // the phone: one day or the whole week at a glance (JP, 2026-11-08)
  const [phoneView, setPhoneViewState] = useState<PhoneView>(readPhoneView);
  const setPhoneView = (v: PhoneView) => {
    setPhoneViewState(v);
    writePhoneView(v);
  };
  // a template, starter week or day template being previewed before it's used (JP, 2026-11-08)
  const [pending, setPending] = useState<
    | { kind: "week" | "starter"; id: string; week: WeekIndex; welcome?: boolean }
    | { kind: "day"; id: string; week: WeekIndex; day: number }
    // saving: what's saved, its name and which day, before it is (JP, 2026-11-08)
    | { kind: "saveWeek"; week: WeekIndex; name: string }
    | { kind: "saveDay"; week: WeekIndex; day: number; name: string }
    | null
  >(null);
  // the hours the calendar shows (Settings → Your day, per device), widened to hold every block
  const [dayHours, setDayHoursState] = useState<Bounds>(readDayHours);
  const setDayHours = (h: Bounds) => {
    setDayHoursState(h);
    writeDayHours(h);
  };
  const bounds = gridBounds(dayHours, data.weeks);
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
      else if (d.kind === "place") live.placeBlock(activeWeek, d.catId, d.day, d.start);
      else if (d.kind === "attach") actions.attachTask(d.taskId, d.blockId);
      else live.moveBlock(activeWeek, d.id, d.day, d.start);
    },
    onResize: (id, edge, origStart, origMins, deltaSlots) =>
      live.resize(activeWeek, id, edge, origStart, origMins, deltaSlots),
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

  // one tap that replaces a week, or deletes a block: do it, and keep what was there so it can be undone
  const withUndo = (text: string, run: () => void) => {
    const before = store.getSnapshot().data;
    run();
    const after = store.getSnapshot().data;
    if (after !== before) setUndo({ before, after, text });
  };
  // a block deleted (phone sheet, desktop right-click, touch popup) can be undone (JP, 2026-11-07)
  const deleteBlock = (id: string) => {
    const before = store.getSnapshot().data;
    withUndo(m.undo.deleted, () => actions.removeBlock(id));
    if (store.getSnapshot().data !== before) playSound("remove");
  };
  // what the person does makes a small sound (JP, 2026-11-07; Settings → Sounds turns them off):
  // a block placed, a block or task ticked or unticked, a block deleted
  useEffect(() => unlockSoundOnFirstGesture(), []);
  // ...and blocks land, move and resize within the hours the calendar shows (Settings → Your day)
  const live: typeof actions = {
    ...actions,
    placeBlock: (...a: Parameters<typeof actions.placeBlock>) => {
      const [w, catId, day, start, mins, deps] = a;
      const before = store.getSnapshot().data;
      actions.placeBlock(w, catId, day, start, mins, { bounds, ...deps });
      if (store.getSnapshot().data !== before) playSound("place");
    },
    moveBlock: (...a: Parameters<typeof actions.moveBlock>) => {
      const [w, id, day, start, deps] = a;
      actions.moveBlock(w, id, day, start, { bounds, ...deps });
    },
    resize: (...a: Parameters<typeof actions.resize>) => {
      const [w, id, edge, origStart, origMins, deltaSlots, deps] = a;
      actions.resize(w, id, edge, origStart, origMins, deltaSlots, { bounds, ...deps });
    },
    toggleDone: (week: WeekIndex, id: string) => {
      actions.toggleDone(week, id);
      const b = store.getSnapshot().data.weeks[week].find((x) => x.id === id);
      if (b && !b.buffer) playSound(b.done ? "tick" : "untick");
    },
    toggleTask: (id: string) => {
      actions.toggleTask(id);
      const t = store.getSnapshot().data.tasks.find((x) => x.id === id);
      if (t) playSound(t.done ? "tick" : "untick");
    },
    removeBlock: deleteBlock,
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
    onEarned: (how) => playSound(how === "finale" ? "finale" : "step", 180),
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
  // ...with a turn-of-the-page sound and how that week went; a balanced one gets its fanfare
  const onAdvance = () => {
    const r = weekReview(data, readBalanceRules(), m.lib);
    withUndo(m.undo.rolled, () => actions.advanceWeek());
    changeWeek(0);
    playSound("roll");
    if (hasReview(r)) {
      setReview(r);
      if (r.balanced) playSound("fanfare", 320);
    }
  };

  // editor day chips: move the block; on phone the view follows it, if it actually moved
  const onMoveToDay = (p: Block, day: number) => {
    const moved = moveBlockTo(data, activeWeek, p.id, day, p.start, { bounds }) !== data;
    live.moveBlock(activeWeek, p.id, day, p.start);
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
    actions: live,
  };
  const showSide = !isPhone && !panelHidden;
  const editingBlock = editingId ? (data.weeks[activeWeek].find((b) => b.id === editingId) ?? null) : null;
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

  // the day a day template starts on: the phone's day, else today (Monday for Week 2)
  const shownDay = isPhone ? phoneDay : defaultDay(activeWeek, now);
  // the preview of what a template will do; "Use it" does exactly that, with Undo
  const templatePreview = (() => {
    if (!pending) return null;
    const weekName = m.week.names[pending.week];
    const close = () => setPending(null);
    if (pending.kind === "saveWeek" || pending.kind === "saveDay") {
      const isDay = pending.kind === "saveDay";
      const day = pending.kind === "saveDay" ? pending.day : undefined;
      const p = previewChange(data, data, pending.week, day);
      const count = data.templates.filter((t) => !!t.day === isDay).length + 1;
      const placeholder = isDay ? m.footer.dayTemplateName(count) : m.footer.templateName(count);
      const hasBlocks = (d: number) => data.weeks[pending.week].some((b) => b.day === d);
      return (
        <TemplatePreview
          title={isDay ? m.preview.saveDay : m.preview.saveWeek}
          where={day === undefined ? m.preview.from(weekName) : m.preview.fromDay(weekName, m.preview.days[day])}
          replaces={m.preview.keeps}
          preview={p}
          addedNote={null}
          hours={bounds}
          day={day}
          onDay={pending.kind === "saveDay" ? (d) => setPending({ ...pending, day: d }) : undefined}
          dayDisabled={(d) => !hasBlocks(d)}
          name={{ value: pending.name, placeholder, onChange: (v) => setPending({ ...pending, name: v }) }}
          useLabel={m.preview.save}
          useDisabled={p.blocks.length === 0}
          onUse={() => {
            const name = pending.name.trim() || placeholder;
            close();
            if (pending.kind === "saveDay") actions.saveDayTemplate(pending.week, pending.day, name);
            else actions.saveTemplate(pending.week, name);
          }}
          onCancel={close}
          phone={isPhone}
        />
      );
    }
    if (pending.kind === "day") {
      const tpl = data.templates.find((t) => t.id === pending.id);
      if (!tpl) return null;
      const dayName = m.preview.days[pending.day];
      const p = previewChange(
        data,
        applyDayTemplate(data, pending.week, pending.id, pending.day),
        pending.week,
        pending.day,
      );
      return (
        <TemplatePreview
          title={tpl.name}
          where={m.preview.intoDay(weekName, dayName)}
          replaces={m.preview.replacesDay(p.replaces, dayName)}
          preview={p}
          addedNote={null}
          hours={bounds}
          day={pending.day}
          onDay={(d) => setPending({ ...pending, day: d })}
          onUse={() => {
            const { id, week, day } = pending;
            close();
            withUndo(m.undo.replacedDay(dayName), () => actions.applyDayTemplate(week, id, day));
            changeWeek(week);
            setPhoneDay(day);
          }}
          onCancel={close}
          phone={isPhone}
        />
      );
    }
    const starter = pending.kind === "starter" ? STARTERS.find((s) => s.id === pending.id) : undefined;
    const tpl = pending.kind === "week" ? data.templates.find((t) => t.id === pending.id) : undefined;
    const title = starter ? starterText(starter, m.lib).name : tpl?.name;
    if (!title) return null;
    const after = starter
      ? applyStarter(data, pending.week, pending.id, { lang })
      : applyTemplate(data, pending.week, pending.id);
    const p = previewChange(data, after, pending.week);
    return (
      <TemplatePreview
        title={title}
        where={m.preview.into(weekName)}
        replaces={m.preview.replacesWeek(p.replaces, weekName)}
        preview={p}
        addedNote={p.added.length ? addedNote(p.added, m.lib) : null}
        hours={bounds}
        onUse={() => {
          const { id, week, kind } = pending;
          close();
          replaceWeek(week, () =>
            kind === "starter" ? actions.applyStarter(week, id, { lang }) : actions.applyTemplate(week, id),
          );
          if (pending.welcome) answerWelcome();
          changeWeek(week);
        }}
        onCancel={close}
        phone={isPhone}
      />
    );
  })();

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
          templates={data.templates.filter((t) => !t.day)}
          blocksInWeek1={data.weeks[0].length}
          onUse={(id) => setPending({ kind: "week", id, week: 0, welcome: true })}
          onStarter={(id) => setPending({ kind: "starter", id, week: 0, welcome: true })}
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
                  fresh={onb.fresh}
                  onCrossedOff={onb.crossedOff}
                  onInView={onb.setBoardInView}
                />
              )}
              <WeekBar
                week={activeWeek}
                setWeek={changeWeek}
                season={season(data.cats, data.history, new Date(), readBalanceRules())}
                footnote={m.week.ticked(done.done, done.total)}
                onShowPanel={!isPhone && panelHidden ? () => setHidden(false) : null}
              />
              {isPhone && (
                <div role="group" aria-label={m.phoneView.label} style={S.phoneViewToggle}>
                  {(["day", "week"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={phoneView === v}
                      onClick={() => {
                        setPhoneView(v);
                        setSlotTap(null);
                      }}
                      style={{ ...S.kindBtn, ...S.setSeg, ...(phoneView === v ? S.kindBtnActive : {}) }}
                    >
                      {m.phoneView[v]}
                    </button>
                  ))}
                </div>
              )}
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
                actions={live}
                onMoveToDay={onMoveToDay}
                onEmptyTap={setSlotTap}
                slotMark={slotTap}
                bounds={bounds}
                {...(isPhone && phoneView === "week"
                  ? { rowH: 24, narrow: true }
                  : isPhone
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
                onApplyTemplate={(id) => setPending({ kind: "week", id, week: activeWeek })}
                onApplyStarter={(id) => setPending({ kind: "starter", id, week: activeWeek })}
                onApplyDay={(id) => setPending({ kind: "day", id, week: activeWeek, day: shownDay })}
                onSaveWeek={() => setPending({ kind: "saveWeek", week: activeWeek, name: "" })}
                onSaveDay={() => {
                  // the day shown when it has blocks, else the first that has some
                  const has = (d: number) => data.weeks[activeWeek].some((b) => b.day === d);
                  const day = has(shownDay) ? shownDay : ([0, 1, 2, 3, 4, 5, 6].find(has) ?? shownDay);
                  setPending({ kind: "saveDay", week: activeWeek, day, name: "" });
                }}
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
              bounds={bounds}
              onPick={(catId) => {
                live.placeBlock(activeWeek, catId, slotTap.day, slotTap.start);
                setSlotTap(null);
              }}
              onClose={closeSlotMenu}
            />
          )}
        </>
      )}
      {/* phone: the block being edited, in a sheet over the day */}
      {view === "calendar" && isPhone && editingBlock && (
        <BlockSheet
          key={editingBlock.id}
          block={editingBlock}
          cats={data.cats}
          tasks={data.tasks}
          weeks={data.weeks}
          onClose={() => setEditingId(null)}
          onDelete={() => {
            setEditingId(null);
            deleteBlock(editingBlock.id);
          }}
          onMoveToDay={(day) => onMoveToDay(editingBlock, day)}
          actions={live}
        />
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
          dayHours={dayHours}
          onDayHours={setDayHours}
        />
      )}
      {onb.guide && !onb.intro && (
        <Coach key={JSON.stringify(onb.guide)} {...coachFor(onb.guide)} onClose={onb.endGuide} />
      )}
      {/* a step just done away from the board; five of five gets the finale (JP, 2026-11-07) */}
      {onb.news && !onb.intro && !onb.finale && (
        <QuestToast
          key={onb.news.id}
          items={onb.news.items}
          done={onb.done}
          next={onb.next}
          onShow={onb.show}
          onClose={onb.closeNews}
          phone={isPhone}
        />
      )}
      {templatePreview}
      {review && <WeekReview review={review} onClose={() => setReview(null)} phone={isPhone} />}
      {onb.finale && !onb.guide && !onb.intro && (
        <QuestFinale colors={data.cats.map((c) => c.color)} onClose={onb.endFinale} phone={isPhone} />
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
