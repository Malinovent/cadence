// The balanced-week rules (S1.3) are a per-device preference, like hiding the tray: stored in
// localStorage, not synced. Defaults: floors 80% met, ceilings passed by at most 10%.
import { clampRules, DEFAULT_RULES, type BalanceRules } from "../lib/balancedWeeks";

export const BALANCE_RULES_KEY = "cadence:ui:balanceRules";

export function readBalanceRules(): BalanceRules {
  try {
    const raw = localStorage.getItem(BALANCE_RULES_KEY);
    return raw ? clampRules(JSON.parse(raw)) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function writeBalanceRules(r: BalanceRules): void {
  try {
    localStorage.setItem(BALANCE_RULES_KEY, JSON.stringify(clampRules(r)));
  } catch {
    // storage unavailable: the rules just won't persist
  }
}
