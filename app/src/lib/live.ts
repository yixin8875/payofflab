import { EXPIRIES, type Expiry } from "../data/tickers";
import type { ChainRow } from "./chain";

/** One option contract from CBOE's delayed quote feed. */
export type LiveQuote = {
  bid: number;
  ask: number;
  mid: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  oi: number;
  volume: number;
  last: number;
};

export type LiveChain = {
  symbol: string;
  spot: number;
  change: number;
  changePct: number;
  iv30: number;
  /** Local, human-readable timestamp of the delayed snapshot. */
  asOf: string;
  expiries: Expiry[];
  quotes: Map<string, LiveQuote>;
};

type CboeOption = {
  option?: string;
  bid?: number;
  ask?: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  open_interest?: number;
  volume?: number;
  last_trade_price?: number;
  theo?: number;
};

type CboePayload = {
  timestamp?: string;
  data?: {
    symbol?: string;
    current_price?: number;
    close?: number;
    prev_day_close?: number;
    price_change?: number;
    price_change_percent?: number;
    iv30?: number;
    last_trade_time?: string;
    options?: CboeOption[];
  };
};

const cache = new Map<string, LiveChain>();
const inflight = new Map<string, Promise<LiveChain>>();

const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const strikeKey = (strike: number) => strike.toFixed(3);

export const quoteKey = (iso: string, kind: "call" | "put", strike: number) =>
  `${iso}|${kind}|${strikeKey(strike)}`;

export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const expiry = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry - today) / 86_400_000);
}

function parseOcc(
  raw: string,
): { root: string; iso: string; kind: "call" | "put"; strike: number } | null {
  const match = raw.match(/(\d{6})([CP])(\d{8})$/);
  if (!match) return null;
  const [, date, right, strike] = match;
  const year = 2000 + Number(date.slice(0, 2));
  const iso = `${year}-${date.slice(2, 4)}-${date.slice(4, 6)}`;
  return {
    root: raw.slice(0, match.index),
    iso,
    kind: right === "C" ? "call" : "put",
    strike: Number(strike) / 1000,
  };
}

function quoteOf(raw: CboeOption): LiveQuote {
  const bid = Math.max(0, num(raw.bid));
  const ask = Math.max(0, num(raw.ask));
  const last = Math.max(0, num(raw.last_trade_price));
  const theo = Math.max(0, num(raw.theo));
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : last || theo || bid || ask;
  return {
    bid,
    ask,
    mid,
    iv: Math.max(0, num(raw.iv)),
    delta: num(raw.delta),
    gamma: num(raw.gamma),
    theta: num(raw.theta),
    vega: num(raw.vega),
    oi: Math.max(0, Math.round(num(raw.open_interest))),
    volume: Math.max(0, Math.round(num(raw.volume))),
    last,
  };
}

function asOfLabel(raw: string | undefined, fallback: string | undefined): string {
  const source = raw ?? fallback;
  if (!source) return "最近收盘";
  // CBOE timestamps are UTC without a zone marker.
  const parsed = new Date(`${source.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) return source;
  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseChain(payload: CboePayload, requested: string): LiveChain {
  const data = payload.data;
  if (!data || !Array.isArray(data.options)) {
    throw new Error("没有可用的在线期权数据");
  }
  const symbol = (data.symbol ?? requested).toUpperCase();
  const spot = num(data.current_price) || num(data.close) || num(data.prev_day_close);
  const change = num(data.price_change);
  const changePct = num(data.price_change_percent) / 100;
  const iv30 = num(data.iv30) / 100;

  const quotes = new Map<string, LiveQuote>();
  const expirySet = new Set<string>();

  for (const raw of data.options) {
    if (!raw.option) continue;
    const info = parseOcc(raw.option);
    if (!info) continue;
    // Skip adjusted series (e.g. "B1SPY...") that carry no tradeable quotes.
    if (info.root !== symbol) continue;
    if (daysUntil(info.iso) < 0) continue;
    quotes.set(quoteKey(info.iso, info.kind, info.strike), quoteOf(raw));
    expirySet.add(info.iso);
  }

  const expiries = [...expirySet]
    .map((iso) => {
      const [, m, d] = iso.split("-").map(Number);
      return { iso, label: `${m}月${d}日`, dte: daysUntil(iso) };
    })
    .filter((expiry) => expiry.dte >= 0)
    .sort((a, b) => a.dte - b.dte);

  if (!expiries.length) throw new Error("在线数据里没有未来到期日");

  return {
    symbol,
    spot,
    change,
    changePct,
    iv30,
    asOf: asOfLabel(payload.timestamp, data.last_trade_time),
    expiries,
    quotes,
  };
}

async function fetchPayload(symbol: string): Promise<CboePayload> {
  const path = `/api/global/delayed_quotes/options/${encodeURIComponent(symbol)}.json`;
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const text = await invoke<string>("fetch_option_chain", { symbol });
    return JSON.parse(text) as CboePayload;
  }
  const response = await fetch(`/cboe${path}`, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(
      response.status === 403 || response.status === 404
        ? "该标的没有在线期权数据"
        : `在线行情返回 ${response.status}`,
    );
  }
  return (await response.json()) as CboePayload;
}

export function cachedChain(symbol: string): LiveChain | undefined {
  return cache.get(symbol.toUpperCase());
}

export function loadLiveChain(symbol: string, force = false): Promise<LiveChain> {
  const key = symbol.toUpperCase();
  if (!force) {
    const hit = cache.get(key);
    if (hit) return Promise.resolve(hit);
    const pending = inflight.get(key);
    if (pending) return pending;
  }
  const promise = fetchPayload(key)
    .then((payload) => parseChain(payload, key))
    .then((chain) => {
      cache.set(key, chain);
      inflight.delete(key);
      return chain;
    })
    .catch((error: unknown) => {
      inflight.delete(key);
      throw error instanceof Error ? error : new Error("在线行情连接失败");
    });
  inflight.set(key, promise);
  return promise;
}

/** Expiries for a symbol: live dates when available, otherwise the offline set. */
export function expiriesFor(symbol: string): Expiry[] {
  return cache.get(symbol.toUpperCase())?.expiries ?? EXPIRIES;
}

export function liveExpiry(symbol: string, iso: string): Expiry | undefined {
  return cache.get(symbol.toUpperCase())?.expiries.find((e) => e.iso === iso);
}

export function liveQuote(
  symbol: string,
  kind: "call" | "put",
  strike: number,
  iso: string,
): LiveQuote | undefined {
  return cache.get(symbol.toUpperCase())?.quotes.get(quoteKey(iso, kind, strike));
}

/** Listed strikes for one expiry, used to snap presets onto real contracts. */
export function liveStrikes(symbol: string, iso: string): number[] {
  const chain = cache.get(symbol.toUpperCase());
  if (!chain) return [];
  const strikes = new Set<number>();
  for (const key of chain.quotes.keys()) {
    const [keyIso, , strikeText] = key.split("|");
    if (keyIso !== iso) continue;
    const strike = Number(strikeText);
    if (Number.isFinite(strike)) strikes.add(strike);
  }
  return [...strikes];
}

/** Nearest-to-spot rows for one expiry from the live feed. */
export function liveRows(chain: LiveChain, expiryIso: string, rows = 13): ChainRow[] {
  const byStrike = new Map<number, { call?: LiveQuote; put?: LiveQuote }>();
  for (const [key, quote] of chain.quotes) {
    const [iso, kind, strikeText] = key.split("|");
    if (iso !== expiryIso || (kind !== "call" && kind !== "put")) continue;
    const strike = Number(strikeText);
    if (!Number.isFinite(strike)) continue;
    const slot = byStrike.get(strike) ?? {};
    slot[kind] = quote;
    byStrike.set(strike, slot);
  }
  if (!byStrike.size) return [];

  const nearest = [...byStrike.entries()]
    .sort((a, b) => Math.abs(a[0] - chain.spot) - Math.abs(b[0] - chain.spot))
    .slice(0, rows)
    .sort((a, b) => a[0] - b[0]);

  const empty: LiveQuote = {
    bid: 0,
    ask: 0,
    mid: 0,
    iv: 0,
    delta: 0,
    gamma: 0,
    theta: 0,
    vega: 0,
    oi: 0,
    volume: 0,
    last: 0,
  };

  return nearest.map(([strike, slot]) => {
    const call = slot.call ?? empty;
    const put = slot.put ?? empty;
    return {
      strike,
      call: {
        bid: call.bid,
        ask: call.ask,
        volume: call.volume,
        oi: call.oi,
        iv: call.iv,
        delta: call.delta,
      },
      put: {
        bid: put.bid,
        ask: put.ask,
        volume: put.volume,
        oi: put.oi,
        iv: put.iv,
        delta: put.delta,
      },
    };
  });
}
