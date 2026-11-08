import type { Leg } from "./options";
import { isLeg } from "./store";

export type StrategyDraft = {
  name: string;
  symbol: string;
  expiry: string;
  legs: Leg[];
};

const SYMBOL = /^[A-Z][A-Z0-9.\-]{0,11}$/;
const EXPIRY = /^\d{4}-\d{2}-\d{2}$/;

/** Compact, shareable encoding of a scanner result for the builder URL. */
export function encodeDraft(draft: StrategyDraft): string {
  const json = JSON.stringify(draft);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDraft(raw: string | null | undefined): StrategyDraft | null {
  if (!raw) return null;
  try {
    const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Partial<StrategyDraft>;
    if (
      typeof draft.name !== "string" ||
      typeof draft.symbol !== "string" ||
      typeof draft.expiry !== "string" ||
      !Array.isArray(draft.legs) ||
      draft.legs.length === 0 ||
      draft.legs.length > 8
    ) {
      return null;
    }
    const symbol = draft.symbol.toUpperCase();
    if (!SYMBOL.test(symbol) || !EXPIRY.test(draft.expiry)) return null;
    const legs = draft.legs.filter(isLeg).slice(0, 8);
    if (legs.length !== draft.legs.length) return null;
    return {
      name: draft.name.slice(0, 80),
      symbol,
      expiry: draft.expiry,
      legs,
    };
  } catch {
    return null;
  }
}
