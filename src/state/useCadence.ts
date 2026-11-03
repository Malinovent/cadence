import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import * as A from "../lib/actions";
import type { CadenceData } from "../lib/model";
import { loadData, saveKey, STORAGE_KEYS } from "../lib/storage";

// wrap a pure action so it runs inside a state updater: (data, ...args) -> (...args)
const bindAction =
  (setData: Dispatch<SetStateAction<CadenceData>>) =>
  <Args extends unknown[]>(fn: (d: CadenceData, ...args: Args) => CadenceData) =>
  (...args: Args): void =>
    setData((d) => fn(d, ...args));

const makeActions = (setData: Dispatch<SetStateAction<CadenceData>>) => {
  const b = bindAction(setData);
  return {
    placeBlock: b(A.placeBlock),
    moveBlock: b(A.moveBlock),
    resize: b(A.resize),
    addTag: b(A.addTag),
    removeTag: b(A.removeTag),
    updateBlock: b(A.updateBlock),
    removeBlock: b(A.removeBlock),
    toggleDone: b(A.toggleDone),
    saveTemplate: b(A.saveTemplate),
    applyTemplate: b(A.applyTemplate),
    deleteTemplate: b(A.deleteTemplate),
    advanceWeek: b(A.advanceWeek),
    resetStats: b(A.resetStats),
    updateCat: b(A.updateCat),
    addCat: b(A.addCat),
    removeCat: b(A.removeCat),
    replaceAll: b(A.replaceAll),
  };
};

export type CadenceActions = ReturnType<typeof makeActions>;

export function useCadence(): { data: CadenceData; actions: CadenceActions } {
  const [data, setData] = useState<CadenceData>(() => loadData());
  // slices still identical to what was loaded are not rewritten on mount
  const loaded = useRef(data);

  useEffect(() => {
    if (data.cats !== loaded.current.cats) saveKey(STORAGE_KEYS.cats, data.cats);
  }, [data.cats]);
  useEffect(() => {
    if (data.weeks !== loaded.current.weeks) saveKey(STORAGE_KEYS.weeks, data.weeks);
  }, [data.weeks]);
  useEffect(() => {
    if (data.templates !== loaded.current.templates) saveKey(STORAGE_KEYS.templates, data.templates);
  }, [data.templates]);
  useEffect(() => {
    if (data.history !== loaded.current.history) saveKey(STORAGE_KEYS.history, data.history);
  }, [data.history]);
  useEffect(() => {
    if (data.streaks !== loaded.current.streaks) saveKey(STORAGE_KEYS.streaks, data.streaks);
  }, [data.streaks]);

  const actions = useMemo(() => makeActions(setData), []);
  return { data, actions };
}
