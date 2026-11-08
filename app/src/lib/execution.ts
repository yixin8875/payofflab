import { readSettings } from "../desktop/settings";
import { daysUntil, type LiveQuote } from "./live";
import { legPrice, type Leg } from "./options";
import type { SavedTrade } from "./store";

/** All-in per-contract cost for one side: commission plus exchange/regulatory fees. */
export const DEFAULT_FEE_PER_CONTRACT = 0.69;

export function feePerContract(): number {
  const value = readSettings().commissionPerContract;
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_FEE_PER_CONTRACT;
}

/** Entry or exit fees for the open contracts in a leg list. */
export function sideFees(legs: Leg[]): number {
  const contracts = legs.reduce(
    (sum, leg) => sum + (leg.kind === "stock" ? 0 : Math.max(0, leg.qty)),
    0,
  );
  return contracts * feePerContract();
}

/**
 * The price you would actually get closing this leg now: a long sells at the
 * bid, a short buys back at the ask. Falls back to the mid when a side is
 * missing, and to the supplied mark when there is no live quote.
 */
export function closePrice(
  leg: Leg,
  quote: LiveQuote | undefined,
  fallback: number,
): number {
  if (leg.kind === "stock" || !quote) return fallback;
  const side = leg.side === 1 ? quote.bid : quote.ask;
  if (!(side > 0)) return fallback;
  return Math.max(0, side);
}

export type MarginKind = "defined" | "naked" | "none";

export type MarginEstimate = {
  /** Estimated buying power held by the option legs, in dollars. */
  requirement: number;
  kind: MarginKind;
  /** True when the trade holds stock; stock margin is not included. */
  stockExcluded: boolean;
  /** True when legs span expiries, so cover was not netted across dates. */
  crossExpiry: boolean;
};

type PricedLeg = Leg & { price: number };

function priceOf(leg: Leg, spot: number, iv: number): number {
  if (leg.kind === "stock") return spot;
  return legPrice(leg, spot, Math.max(daysUntil(leg.expiry), 0.5) / 365, iv);
}

/** Reg T naked call estimate: 20% of spot minus out-of-the-money amount, 10% floor. */
function nakedCall(spot: number, strike: number, premium: number, qty: number): number {
  const otm = Math.max(strike - spot, 0);
  const per = Math.max(0.2 * spot - otm + premium, 0.1 * spot + premium);
  return Math.max(0, per) * 100 * qty;
}

/** Reg T naked put estimate: 20% of spot minus out-of-the-money amount, 10% of strike floor. */
function nakedPut(spot: number, strike: number, premium: number, qty: number): number {
  const otm = Math.max(spot - strike, 0);
  const per = Math.max(0.2 * spot - otm + premium, 0.1 * strike + premium);
  return Math.max(0, per) * 100 * qty;
}

type Pool = { leg: PricedLeg; open: number };

/**
 * Match short contracts against long contracts of the same kind and expiry.
 * A matched pair holds the strike width less its net credit; an unmatched
 * long holds its premium, and an unmatched short falls back to Reg T.
 */
function matchKind(
  shorts: PricedLeg[],
  longs: PricedLeg[],
  spot: number,
  kind: "call" | "put",
): { requirement: number; naked: number } {
  const pool: Pool[] = longs.map((leg) => ({ leg, open: leg.qty }));
  let requirement = 0;
  let naked = 0;

  for (const short of shorts) {
    let remaining = short.qty;
    const candidates = [...pool]
      .filter((entry) => entry.open > 0)
      .sort((a, b) => {
        const widthOf = (entry: Pool) =>
          kind === "call"
            ? Math.max(entry.leg.strike - short.strike, 0)
            : Math.max(short.strike - entry.leg.strike, 0);
        return widthOf(a) - widthOf(b);
      });

    for (const entry of candidates) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, entry.open);
      const width =
        kind === "call"
          ? Math.max(entry.leg.strike - short.strike, 0)
          : Math.max(short.strike - entry.leg.strike, 0);
      const credit = (short.price - entry.leg.price) * 100 * take;
      requirement += Math.max(0, width * 100 * take - credit);
      entry.open -= take;
      remaining -= take;
    }

    if (remaining > 0) {
      naked += remaining;
      requirement +=
        kind === "call"
          ? nakedCall(spot, short.strike, short.price, remaining)
          : nakedPut(spot, short.strike, short.price, remaining);
    }
  }

  for (const entry of pool) {
    if (entry.open <= 0) continue;
    requirement += entry.open * 100 * entry.leg.price;
  }

  return { requirement, naked };
}

/**
 * Buying-power estimate for the option legs. Defined-risk structures hold
 * their strike width less credit; naked shorts use the Reg T formula. Stock
 * and cross-expiry cover are excluded, so this is a conservative estimate,
 * not a broker's exact requirement.
 */
export function estimateMargin(
  legs: Leg[],
  spot: number,
  iv: number,
): MarginEstimate {
  const priced: PricedLeg[] = legs
    .filter((leg) => leg.qty > 0 && leg.kind !== "stock")
    .map((leg) => ({ ...leg, price: priceOf(leg, spot, iv) }));

  const stockExcluded = legs.some((leg) => leg.kind === "stock" && leg.qty > 0);

  if (!priced.length) {
    return {
      requirement: 0,
      kind: "none",
      stockExcluded,
      crossExpiry: false,
    };
  }

  const expiries = new Set(priced.map((leg) => leg.expiry));
  const stockContracts = legs.reduce(
    (sum, leg) => sum + (leg.kind === "stock" ? leg.side * leg.qty : 0),
    0,
  );
  // Long stock covers short calls one-for-one; the stock's own margin is out of scope.
  let stockCover = Math.max(0, stockContracts);

  let requirement = 0;
  let naked = 0;

  for (const iso of expiries) {
    const group = priced.filter((leg) => leg.expiry === iso);
    const shortCalls = group.filter((leg) => leg.kind === "call" && leg.side === -1);
    const longCalls = group.filter((leg) => leg.kind === "call" && leg.side === 1);
    const shortPuts = group.filter((leg) => leg.kind === "put" && leg.side === -1);
    const longPuts = group.filter((leg) => leg.kind === "put" && leg.side === 1);

    let calls = shortCalls;
    if (stockCover > 0 && shortCalls.length) {
      const coverable = Math.min(
        stockCover,
        shortCalls.reduce((sum, leg) => sum + leg.qty, 0),
      );
      stockCover -= coverable;
      // Covered calls need no option margin here; the stock position is not counted.
      let left = coverable;
      calls = shortCalls.map((leg) => {
        if (left <= 0) return leg;
        const take = Math.min(left, leg.qty);
        left -= take;
        return { ...leg, qty: leg.qty - take };
      });
    }

    const callResult = matchKind(
      calls.filter((leg) => leg.qty > 0),
      longCalls,
      spot,
      "call",
    );
    const putResult = matchKind(shortPuts, longPuts, spot, "put");
    requirement += callResult.requirement + putResult.requirement;
    naked += callResult.naked + putResult.naked;
  }

  return {
    requirement: Math.max(0, Math.round(requirement)),
    kind: naked > 0 ? "naked" : "defined",
    stockExcluded,
    crossExpiry: expiries.size > 1,
  };
}

export function tradeMargin(
  trade: SavedTrade,
  spot: number,
  iv: number,
): MarginEstimate {
  return estimateMargin(trade.legs, spot, iv);
}
