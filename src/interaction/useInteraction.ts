import { useEffect, useRef, useState } from "react";
import type { DragSource, GridHit } from "../lib/gesture";
import { domEnv, IDLE, InteractionEngine, type EngineState, type ResizeEdge } from "./engine";

export type InteractionHandlers = {
  onDrop: (source: DragSource, hit: GridHit) => void;
  onResize: (id: string, edge: ResizeEdge, origStart: number, origMins: number, deltaSlots: number) => void;
};

export type Interaction = { state: EngineState; engine: InteractionEngine };

// One engine for the calendar (tray + grid share it). `state` re-renders only when the
// press/drag target changes, not on every pointer move; the ghost moves outside React.
export function useInteraction(handlers: InteractionHandlers): Interaction {
  const [state, setState] = useState<EngineState>(IDLE);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  const [engine] = useState(
    () =>
      new InteractionEngine(
        {
          onChange: setState,
          onDrop: (source, hit) => handlersRef.current.onDrop(source, hit),
          onResize: (id, edge, origStart, origMins, delta) => handlersRef.current.onResize(id, edge, origStart, origMins, delta),
        },
        domEnv(window),
      ),
  );
  useEffect(() => {
    engine.mount();
    return () => engine.unmount();
  }, [engine]);
  return { state, engine };
}
