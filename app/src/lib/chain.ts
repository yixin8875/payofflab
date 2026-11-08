import { EXPIRIES, type Expiry, type Ticker } from "../data/tickers";
import { liveExpiry, liveQuote, liveStrikes } from "./live";
import { bsPrice, ivFor, type Leg, type LegKind } from "./options";

export type ChainRow = {
  strike: number;
  call: { bid: number; ask: number; volume: number; oi: number; iv: number; delta: number };
  put: { bid: number; ask: number; volume: number; oi: number; iv: number; delta: number };
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function roundStrike(price: number, step: number, dir: "nearest" | "up" | "down" = "nearest") {
  const n = price / step;
  const v = dir === "up" ? Math.ceil(n) : dir === "down" ? Math.floor(n) : Math.round(n);
  return Number((v * step).toFixed(2));
}

export function dteYears(dte: number): number {
  return Math.max(dte, 0.5) / 365;
}

export function quote(
  ticker: Ticker,
  kind: LegKind,
  strike: number,
  dte: number,
  expiryIso?: string,
  useLive = true,
): { mid: number; bid: number; ask: number; iv: number } {
  if (useLive && expiryIso && kind !== "stock") {
    const live = liveQuote(ticker.symbol, kind, strike, expiryIso);
    if (live && (live.bid > 0 || live.ask > 0 || live.mid > 0)) {
      return {
        mid: Number(live.mid.toFixed(2)),
        bid: Number(live.bid.toFixed(2)),
        ask: Number(live.ask.toFixed(2)),
        iv: live.iv || ivFor(kind, strike, ticker.spot, ticker.iv),
      };
    }
  }
  const T = dteYears(dte);
  const iv = ivFor(kind, strike, ticker.spot, ticker.iv);
  const mid = bsPrice(kind === "stock" ? "call" : kind, ticker.spot, strike, T, iv);
  const spread = Math.max(0.02, mid * 0.012 + 0.01);
  return {
    mid: Number(mid.toFixed(2)),
    bid: Number(Math.max(0.01, mid - spread / 2).toFixed(2)),
    ask: Number((mid + spread / 2).toFixed(2)),
    iv,
  };
}

/** Live expiry dates when the chain has been fetched, otherwise the offline set. */
export function expiryFor(symbol: string, iso: string): Expiry {
  return liveExpiry(symbol, iso) ?? EXPIRIES.find((e) => e.iso === iso) ?? EXPIRIES[3];
}

/** Snap a model strike onto the nearest exchange-listed strike. */
export function snapStrike(symbol: string, iso: string, strike: number): number {
  const listed = liveStrikes(symbol, iso);
  if (!listed.length) return strike;
  let best = listed[0];
  for (const value of listed) {
    if (Math.abs(value - strike) < Math.abs(best - strike)) best = value;
  }
  return best;
}

export function buildChain(ticker: Ticker, expiryIso: string, rows = 11, useLive = true): ChainRow[] {
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];
  const step = ticker.strikeStep;
  const base = roundStrike(ticker.spot, step);
  const out: ChainRow[] = [];
  for (let i = -Math.floor(rows / 2); i <= Math.floor(rows / 2); i++) {
    const strike = Number((base + i * step).toFixed(2));
    if (strike <= 0) continue;
    const seed = hash(`${ticker.symbol}-${expiry.iso}-${strike}`);
    const c = quote(ticker, "call", strike, expiry.dte, expiry.iso, useLive);
    const p = quote(ticker, "put", strike, expiry.dte, expiry.iso, useLive);
    out.push({
      strike,
      call: {
        bid: c.bid,
        ask: c.ask,
        volume: Math.round((seed % 900) + 20),
        oi: Math.round((seed % 4200) + 240),
        iv: Number(c.iv.toFixed(4)),
        delta: Number(bsDelta("call", ticker.spot, strike, dteYears(expiry.dte), c.iv).toFixed(2)),
      },
      put: {
        bid: p.bid,
        ask: p.ask,
        volume: Math.round(((seed >> 5) % 800) + 15),
        oi: Math.round(((seed >> 7) % 3800) + 180),
        iv: Number(p.iv.toFixed(4)),
        delta: Number(bsDelta("put", ticker.spot, strike, dteYears(expiry.dte), p.iv).toFixed(2)),
      },
    });
  }
  return out;
}

function bsDelta(kind: "call" | "put", S: number, K: number, T: number, sigma: number): number {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (0.0402 - 0.0103 + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  let t = 1 / (1 + 0.2316419 * Math.abs(d1));
  const d = 0.3989423 * Math.exp((-d1 * d1) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const N = d1 > 0 ? 1 - p : p;
  return kind === "call" ? N : N - 1;
}

let counter = 0;
export function makeLeg(
  kind: LegKind,
  side: 1 | -1,
  qty: number,
  strike: number,
  expiryIso: string,
  fill: number,
  symbol = "",
  iv?: number,
): Leg {
  const expiry = expiryFor(symbol, expiryIso);
  counter += 1;
  const leg: Leg = {
    id: `leg-${counter}`,
    kind,
    side,
    qty,
    strike,
    expiry: expiry.iso,
    dte: expiry.dte,
    fill,
  };
  if (kind !== "stock" && iv != null && Number.isFinite(iv) && iv > 0) {
    leg.iv = Number(iv.toFixed(4));
  }
  return leg;
}

/** Price a leg off the synthetic chain so presets always arrive with a quote. */
export function pricedLeg(
  ticker: Ticker,
  kind: LegKind,
  side: 1 | -1,
  qty: number,
  strike: number,
  expiryIso: string,
): Leg {
  const expiry = expiryFor(ticker.symbol, expiryIso);
  const resolved = kind === "stock" ? strike : snapStrike(ticker.symbol, expiry.iso, strike);
  const q = kind === "stock" ? null : quote(ticker, kind, resolved, expiry.dte, expiry.iso);
  const fallback = q ? (side === 1 ? q.ask : q.bid) || q.mid : ticker.spot;
  const fill = kind === "stock" ? ticker.spot : Math.max(0.01, fallback);
  return makeLeg(
    kind,
    side,
    qty,
    resolved,
    expiryIso,
    Number(fill.toFixed(2)),
    ticker.symbol,
    q?.iv,
  );
}
