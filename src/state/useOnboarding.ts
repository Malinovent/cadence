import { useEffect, useRef, useState } from "react";
import {
  CHECK_ITEMS,
  countIn,
  guideArea,
  nextGuide,
  progress,
  tickTarget,
  type CheckItem,
  type Guide,
} from "../lib/guide";
import type { CadenceData } from "../lib/model";
import { shouldOnboard } from "../lib/onboarding";
import { readChecklist, restartChecklist, writeChecklist, type ChecklistPrefs } from "./checklistPrefs";
import { readOnboarded, writeOnboarded } from "./onboardingPrefs";
import type { CadenceStore } from "./store";

type WeekIndex = 0 | 1;
/** a tab the phone tray should switch to; `n` changes each time, so asking twice works */
export type TabRequest = { tab: "areas" | "tasks"; n: number };

type Go = {
  calendar: () => void;
  areas: () => void;
  settings: () => void;
  showPanel: () => void; // unhide the desktop panel / unfold the phone tray
  day: (day: number) => void; // phone: show this day
};

/**
 * Onboarding path 1 + checklist (JP, 2026-11-07). New people get the purpose page, then one
 * guided step at a time in the real app: drag one area in, see its count, tick it. Then the
 * "Getting started" checklist takes over; each open item can show its own step.
 */
export function useOnboarding({
  store,
  data,
  week,
  isPhone,
  go,
}: {
  store: CadenceStore;
  data: CadenceData;
  week: WeekIndex;
  isPhone: boolean;
  go: Go;
}) {
  // judged once on opening: never edited here, nothing saved, not seen on this device
  const [intro, setIntro] = useState(() =>
    shouldOnboard({
      seen: readOnboarded(),
      lastEdit: store.getSnapshot().meta.updatedAt,
      data: store.getSnapshot().data,
    }),
  );
  const [check, setCheck] = useState<ChecklistPrefs>(() => {
    const saved = readChecklist();
    return intro ? restartChecklist(saved) : saved; // new people get the checklist after, from 0
  });
  const [guide, setGuide] = useState<Guide | null>(null);
  const [tab, setTab] = useState<TabRequest | null>(null);
  const askTab = (t: TabRequest["tab"]) => setTab((r) => ({ tab: t, n: (r?.n ?? 0) + 1 }));

  useEffect(() => writeChecklist(check), [check]);

  // what each change did, kept once earned: the checklist counts what's done from when it started
  const seen = useRef(data);
  useEffect(() => {
    const got = progress(seen.current, data);
    seen.current = data;
    if (CHECK_ITEMS.some((i) => got[i]))
      setCheck((c) => (CHECK_ITEMS.every((i) => !got[i] || c.done[i]) ? c : { ...c, done: { ...c.done, ...got } }));
  }, [data]);
  const done = check.done;

  // a step that has done its job moves on (the drag landed, the block got ticked...)
  useEffect(() => {
    if (!guide) return;
    const next = nextGuide(guide, data, done);
    if (next !== guide) setGuide(next);
  }, [guide, data, done]);

  const show = (item: CheckItem): void => {
    if (item === "place") {
      const catId = guideArea(data);
      if (!catId) return;
      go.calendar();
      go.showPanel();
      askTab("areas");
      setGuide({ step: "drag", catId, week, before: countIn(data, week, catId) });
    } else if (item === "tick") {
      const b = tickTarget(data, week);
      if (!b) return show("place"); // nothing to tick yet: place one first
      go.calendar();
      if (isPhone) go.day(b.day);
      setGuide({ step: "tick", blockId: b.id });
    } else if (item === "area") {
      go.areas();
      setGuide({ step: "area" });
    } else if (item === "task") {
      go.calendar();
      go.showPanel();
      askTab("tasks");
      setGuide({ step: "task" });
    } else {
      go.calendar();
      setGuide({ step: "template" });
    }
  };

  /** "Next" after the first block: point at its tick */
  const afterPlaced = () => {
    if (guide?.step !== "placed") return;
    const b = tickTarget(data, guide.week, guide.catId);
    if (!b) return setGuide(null);
    if (isPhone) go.day(b.day);
    setGuide({ step: "tick", blockId: b.id });
  };

  const leaveIntro = () => {
    writeOnboarded();
    setIntro(false);
  };

  return {
    intro,
    guide,
    endGuide: () => setGuide(null),
    tab,
    done,
    checklist: check,
    // the checklist takes over once the first block lands: not behind the purpose page, not during the drag
    checklistVisible: check.shown && !check.dismissed && !intro && guide?.step !== "drag",
    show,
    afterPlaced,
    /** purpose page → "Show me how": the guided first block */
    startTour: () => {
      leaveIntro();
      setCheck((c) => ({ ...c, shown: true, dismissed: false }));
      show("place");
    },
    /** purpose page → "Skip": the checklist waits in the calendar */
    skipIntro: () => {
      leaveIntro();
      setCheck((c) => ({ ...c, shown: true }));
    },
    signIn: () => {
      leaveIntro();
      go.settings();
    },
    /** Settings → About: the purpose page again, and the checklist back, starting over at 0 */
    replay: () => {
      setIntro(true);
      setCheck(restartChecklist);
    },
    /** a starter week or template was applied */
    markTried: () => setCheck((c) => (c.done.template ? c : { ...c, done: { ...c.done, template: true } })),
    closeChecklist: () => setCheck((c) => ({ ...c, dismissed: true })),
    toggleChecklist: () => setCheck((c) => ({ ...c, collapsed: !c.collapsed })),
  };
}
