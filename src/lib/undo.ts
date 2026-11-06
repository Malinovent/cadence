// Audit item 7: applying a template or starter week, or rolling forward, stays one tap, and can
// be undone. What's undone is the whole document as it was, so added areas and returned tasks
// come back too. That's only safe while nothing else has changed: the offer ends with any other
// edit, or a copy arriving from the account.
import type { CadenceData } from "./model";

export type UndoOffer = { before: CadenceData; after: CadenceData; text: string };

/** The offer still stands only while the data is exactly what the action left. */
export const undoAvailable = (offer: UndoOffer | null, current: CadenceData): offer is UndoOffer =>
  offer !== null && offer.after === current;
