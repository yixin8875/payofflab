import { EXPIRIES, type Ticker } from "../data/tickers";
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
): { mid: number; bid: number; ask: number; iv: number } {
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

export function buildChain(ticker: Ticker, expiryIso: string, rows = 11): ChainRow[] {
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];
  const step = ticker.strikeStep;
  const base = roundStrike(ticker.spot, step);
  const out: ChainRow[] = [];
  for (let i = -Math.floor(rows / 2); i <= Math.floor(rows / 2); i++) {
    const strike = Number((base + i * step).toFixed(2));
    if (strike <= 0) continue;
    const seed = hash(`${ticker.symbol}-${expiry.iso}-${strike}`);
    const c = quote(ticker, "call", strike, expiry.dte);
    const p = quote(ticker, "put", strike, expiry.dte);
    out.push({
      strike,
      call: {
        bid: c.bid,
        ask: c.ask,
        volume: Math.round((seed % 900) + 20),
        oi: Math.round((seed % 4200) + 240),
        iv: Number((c.iv * 100).toFixed(1)),
        delta: Number(bsDelta("call", ticker.spot, strike, dteYears(expiry.dte), c.iv).toFixed(2)),
      },
      put: {
        bid: p.bid,
        ask: p.ask,
        volume: Math.round(((seed >> 5) % 800) + 15),
        oi: Math.round(((seed >> 7) % 3800) + 180),
        iv: Number((p.iv * 100).toFixed(1)),
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
): Leg {
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];
  counter += 1;
  return {
    id: `leg-${counter}`,
    kind,
    side,
    qty,
    strike,
    expiry: expiry.iso,
    dte: expiry.dte,
    fill,
  };
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
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];
  const fill =
    kind === "stock" ? ticker.spot : side === 1 ? quote(ticker, kind, strike, expiry.dte).ask : quote(ticker, kind, strike, expiry.dte).bid;
  return makeLeg(kind, side, qty, strike, expiryIso, Number(fill.toFixed(2)));
}
