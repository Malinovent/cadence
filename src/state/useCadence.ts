import { useMemo, useState, useSyncExternalStore } from "react";
import * as A from "../lib/actions";
import * as T from "../lib/tasks";
import type { SyncMeta } from "../lib/meta";
import type { CadenceData } from "../lib/model";
import { createCadenceStore, type CadenceStore } from "./store";

// wrap a pure action as a user edit: (data, ...args) -> (...args). The store applies it
// synchronously and bumps meta.updatedAt once (no React updater, so StrictMode can't double it).
const bindAction =
  (store: CadenceStore) =>
  <Args extends unknown[]>(fn: (d: CadenceData, ...args: Args) => CadenceData) =>
  (...args: Args): void =>
    store.edit((d) => fn(d, ...args));

const makeActions = (store: CadenceStore) => {
  const b = bindAction(store);
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
    addTask: b(T.addTask),
    toggleTask: b(T.toggleTask),
    removeTask: b(T.removeTask),
    setTaskArea: b(T.setTaskArea),
    attachTask: b(T.attachTask),
    placeTask: b(T.placeTask),
    detachTask: b(T.detachTask),
    returnEnded: b(T.returnEnded),
    replaceAll: b(A.replaceAll),
  };
};

export type CadenceActions = ReturnType<typeof makeActions>;

// data + per-key persistence (in the store) + bound user actions; `store` is for useSync
export function useCadence(): { data: CadenceData; meta: SyncMeta; actions: CadenceActions; store: CadenceStore } {
  const [store] = useState(() => createCadenceStore());
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const actions = useMemo(() => makeActions(store), [store]);
  return { data: snap.data, meta: snap.meta, actions, store };
}
