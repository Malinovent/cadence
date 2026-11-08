import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHECK_ITEMS,
  countIn,
  earned,
  feedbackFor,
  guideArea,
  nextGuide,
  nextItem,
  progress,
  tickTarget,
  type CheckDone,
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
/** steps just done, for the toast; `id` changes each time, so the toast plays again */
export type QuestNews = { items: CheckItem[]; id: number };

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
  onEarned,
}: {
  store: CadenceStore;
  data: CadenceData;
  week: WeekIndex;
  isPhone: boolean;
  go: Go;
  onEarned?: (how: "finale" | "board" | "toast") => void; // a step was done: its sound
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

  // feedback for steps just done (JP, 2026-11-07): crossed off on the board when it's on screen,
  // a toast at the top when it isn't, the finale card at five of five
  const [fresh, setFresh] = useState<CheckItem[]>([]); // not crossed off on the board yet
  const [news, setNews] = useState<QuestNews | null>(null);
  const [finale, setFinale] = useState(false);
  const doneRef = useRef(check.done);
  const guideRef = useRef(guide);
  const boardInView = useRef(false); // reported by the board
  const onEarnedRef = useRef(onEarned);
  useEffect(() => {
    doneRef.current = check.done;
    guideRef.current = guide;
    onEarnedRef.current = onEarned;
  });

  /** Steps just done: kept for good, then shown the one way that fits. */
  const earn = useCallback((got: CheckDone) => {
    const items = earned(doneRef.current, got);
    if (items.length === 0) return;
    const now = { ...doneRef.current, ...got };
    doneRef.current = now; // a second step in the same moment sees this one
    setCheck((c) => ({ ...c, done: { ...c.done, ...got } }));
    setFresh((f) => [...f, ...items.filter((i) => !f.includes(i))]);
    const how = feedbackFor(now, boardInView.current, guideRef.current);
    onEarnedRef.current?.(how);
    if (how === "finale") {
      setNews(null);
      setFinale(true);
    } else if (how === "toast") {
      // a toast still showing takes the new step too (a starter week: placed and tried at once)
      setNews((n) => ({
        items: CHECK_ITEMS.filter((i) => items.includes(i) || n?.items.includes(i)), // in checklist order
        id: (n?.id ?? 0) + 1,
      }));
    }
  }, []);

  /** the board crossed these off */
  const crossedOff = useCallback((items: CheckItem[]) => setFresh((f) => f.filter((i) => !items.includes(i))), []);
  /** whether the board's list can be seen now (on screen, unfolded) */
  const setBoardInView = useCallback((v: boolean) => {
    boardInView.current = v;
  }, []);
  const closeNews = useCallback(() => setNews(null), []);

  // what each change did: the checklist counts what's done from when it started
  const seen = useRef(data);
  useEffect(() => {
    const got = progress(seen.current, data);
    seen.current = data;
    earn(got);
  }, [data, earn]);
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
      setFresh([]);
      setNews(null);
      setFinale(false);
    },
    /** a starter week or template was applied */
    markTried: () => earn({ template: true }),
    fresh,
    news,
    finale,
    next: nextItem(done),
    crossedOff,
    setBoardInView,
    closeNews,
    /** "Start planning": the finale and the checklist close for good on this device */
    endFinale: () => {
      setFinale(false);
      setFresh([]);
      setCheck((c) => ({ ...c, dismissed: true }));
    },
    closeChecklist: () => setCheck((c) => ({ ...c, dismissed: true })),
    toggleChecklist: () => setCheck((c) => ({ ...c, collapsed: !c.collapsed })),
  };
}
