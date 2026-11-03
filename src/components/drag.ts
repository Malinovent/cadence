import type { MutableRefObject } from "react";

// what is being dragged with the HTML5 drag API: a tray category or a placed block
export type DragInfo = { type: "tray"; catId: string } | { type: "move"; id: string };
export type DragRef = MutableRefObject<DragInfo | null>;
