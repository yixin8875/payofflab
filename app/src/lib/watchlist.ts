import { useEffect, useState } from "react";

export type WatchGroup = {
  id: string;
  name: string;
  symbols: string[];
};

const KEY = "payoff:watchlist";
export const WATCHLIST_EVENT = "payoff:watchlist-changed";
const MAX_GROUPS = 24;
const MAX_SYMBOLS = 80;
const MAX_NAME = 20;

const DEFAULT_GROUPS: WatchGroup[] = [
  { id: "g_index", name: "指数 ETF", symbols: ["SPY", "QQQ"] },
  { id: "g_growth", name: "科技与成长", symbols: ["AAPL", "NVDA", "TSLA", "AMD", "META", "AMZN"] },
];

function uid() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function cleanSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function isSymbol(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z][A-Z0-9.\-]{0,11}$/.test(value);
}

function isGroup(value: unknown): value is WatchGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Partial<WatchGroup>;
  return (
    typeof group.id === "string" &&
    typeof group.name === "string" &&
    Array.isArray(group.symbols) &&
    group.symbols.every(isSymbol)
  );
}

export function readWatchlist(): WatchGroup[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GROUPS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_GROUPS;
    // An empty array is a valid state: the user deleted every group.
    return parsed.filter(isGroup).slice(0, MAX_GROUPS);
  } catch {
    return DEFAULT_GROUPS;
  }
}

function persist(groups: WatchGroup[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(groups));
  } catch {
    // Storage can be full or unavailable; the in-memory view still updates.
  }
  window.dispatchEvent(new Event(WATCHLIST_EVENT));
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
}

export function addGroup(name: string, symbol = ""): WatchGroup | null {
  const label = cleanName(name);
  if (!label) return null;
  const groups = readWatchlist();
  if (groups.length >= MAX_GROUPS) return null;
  const next: WatchGroup = { id: uid(), name: label, symbols: [] };
  const code = cleanSymbol(symbol);
  if (isSymbol(code)) next.symbols.push(code);
  persist([...groups, next]);
  return next;
}

export function renameGroup(id: string, name: string) {
  const label = cleanName(name);
  if (!label) return;
  persist(readWatchlist().map((group) => (group.id === id ? { ...group, name: label } : group)));
}

export function deleteGroup(id: string) {
  persist(readWatchlist().filter((group) => group.id !== id));
}

/** Adds a symbol to a group. Returns false for invalid codes or duplicates. */
export function addSymbol(groupId: string, symbol: string): boolean {
  const code = cleanSymbol(symbol);
  if (!isSymbol(code)) return false;
  const groups = readWatchlist();
  const group = groups.find((item) => item.id === groupId);
  if (!group || group.symbols.includes(code) || group.symbols.length >= MAX_SYMBOLS) return false;
  persist(
    groups.map((item) =>
      item.id === groupId ? { ...item, symbols: [...item.symbols, code] } : item,
    ),
  );
  return true;
}

export function removeSymbol(groupId: string, symbol: string) {
  const code = cleanSymbol(symbol);
  persist(
    readWatchlist().map((group) =>
      group.id === groupId
        ? { ...group, symbols: group.symbols.filter((item) => item !== code) }
        : group,
    ),
  );
}

/** Returns true when the symbol was added, false when it was removed. */
export function toggleSymbol(groupId: string, symbol: string): boolean {
  const code = cleanSymbol(symbol);
  const group = readWatchlist().find((item) => item.id === groupId);
  if (!group) return false;
  if (group.symbols.includes(code)) {
    removeSymbol(groupId, code);
    return false;
  }
  addSymbol(groupId, code);
  return true;
}

export function groupsForSymbol(groups: WatchGroup[], symbol: string): WatchGroup[] {
  const code = cleanSymbol(symbol);
  return groups.filter((group) => group.symbols.includes(code));
}

export function countSymbols(groups: WatchGroup[]): number {
  return new Set(groups.flatMap((group) => group.symbols)).size;
}

export function useWatchlist() {
  const [groups, setGroups] = useState<WatchGroup[]>(() => readWatchlist());

  useEffect(() => {
    const sync = () => setGroups(readWatchlist());
    window.addEventListener(WATCHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return groups;
}
