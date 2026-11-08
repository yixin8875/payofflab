import type { LiveChain, LiveQuote } from "./live";

/**
 * A compact view of the live implied-volatility surface. Values are decimals
 * (0.18 = 18%). The 25-delta points use the nearest listed strike by delta,
 * not a fitted interpolated surface, which keeps the reading reproducible.
 */

export type VolExpiry = {
  iso: string;
  label: string;
  dte: number;
  /** Average of the call and put IV at the strike nearest spot. */
  atm: number | null;
  call25: number | null;
  put25: number | null;
  /** 25-delta call IV minus 25-delta put IV, in vol points (decimal). */
  rr: number | null;
  /** Average wing IV minus ATM IV, in vol points (decimal). */
  fly: number | null;
  quotes: number;
  atmStrike: number | null;
};

export type VolPoint = {
  strike: number;
  iv: number;
  delta: number;
  kind: "call" | "put";
};

export type VolSurface = {
  spot: number;
  iv30: number;
  asOf: string;
  expiries: VolExpiry[];
  front: VolExpiry | null;
  back: VolExpiry | null;
  /** Back-month ATM minus front-month ATM, in vol points. */
  slope: number | null;
};

type Slot = {
  strike: number;
  call?: LiveQuote;
  put?: LiveQuote;
};

function slotsFor(chain: LiveChain, iso: string): Slot[] {
  const byStrike = new Map<number, Slot>();
  for (const [key, quote] of chain.quotes) {
    const [keyIso, kind, strikeText] = key.split("|");
    if (keyIso !== iso || (kind !== "call" && kind !== "put")) continue;
    const strike = Number(strikeText);
    if (!Number.isFinite(strike) || strike <= 0) continue;
    const slot = byStrike.get(strike) ?? { strike };
    slot[kind] = quote;
    byStrike.set(strike, slot);
  }
  return [...byStrike.values()].sort((a, b) => a.strike - b.strike);
}

function usable(quote: LiveQuote | undefined): quote is LiveQuote {
  return Boolean(quote && quote.iv > 0 && Number.isFinite(quote.iv));
}

function nearestAtm(slots: Slot[], spot: number): Slot | null {
  let best: Slot | null = null;
  let bestDistance = Infinity;
  for (const slot of slots) {
    if (!usable(slot.call) && !usable(slot.put)) continue;
    const distance = Math.abs(slot.strike - spot);
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  return best;
}

function averageIv(call: LiveQuote | undefined, put: LiveQuote | undefined): number | null {
  const values = [call, put].filter(usable).map((quote) => quote.iv);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Pick the listed quote whose absolute delta is closest to the target. CBOE
 * puts carry negative delta, so compare against the absolute value.
 */
function nearestDelta(
  slots: Slot[],
  kind: "call" | "put",
  target: number,
): LiveQuote | null {
  let best: LiveQuote | null = null;
  let bestDistance = Infinity;
  for (const slot of slots) {
    const quote = kind === "call" ? slot.call : slot.put;
    if (!usable(quote)) continue;
    const delta = Math.abs(quote.delta);
    if (!Number.isFinite(delta) || delta < 0.03 || delta > 0.72) continue;
    const distance = Math.abs(delta - target);
    if (distance < bestDistance) {
      best = quote;
      bestDistance = distance;
    }
  }
  return best;
}

function quoteCount(slots: Slot[]): number {
  let count = 0;
  for (const slot of slots) {
    if (usable(slot.call)) count += 1;
    if (usable(slot.put)) count += 1;
  }
  return count;
}

export function computeVolSurface(chain: LiveChain): VolSurface {
  const spot = chain.spot > 0 ? chain.spot : 0;
  const rows: VolExpiry[] = [];

  for (const expiry of chain.expiries) {
    const slots = slotsFor(chain, expiry.iso);
    if (!slots.length) continue;
    const atmSlot = nearestAtm(slots, spot);
    const atm = atmSlot ? averageIv(atmSlot.call, atmSlot.put) : null;
    const call25 = nearestDelta(slots, "call", 0.25)?.iv ?? null;
    const put25 = nearestDelta(slots, "put", 0.25)?.iv ?? null;
    const rr = call25 != null && put25 != null ? call25 - put25 : null;
    const fly =
      atm != null && call25 != null && put25 != null
        ? (call25 + put25) / 2 - atm
        : null;

    rows.push({
      iso: expiry.iso,
      label: expiry.label,
      dte: expiry.dte,
      atm,
      call25,
      put25,
      rr,
      fly,
      quotes: quoteCount(slots),
      atmStrike: atmSlot?.strike ?? null,
    });
  }

  rows.sort((a, b) => a.dte - b.dte);
  const withAtm = rows.filter((row) => row.atm != null);
  const front = withAtm[0] ?? null;
  // A 2-year LEAPS prints a very different vol regime from the front month, so
  // the term slope uses the expiry nearest 90 DTE (the usual 30d/90d read).
  // If no listed expiry reaches 30 DTE, fall back to the furthest one available.
  const beyondMonth = withAtm.filter((row) => row.dte >= 30);
  const back =
    withAtm.length > 1
      ? (beyondMonth.length
          ? [...beyondMonth].sort(
              (a, b) => Math.abs(a.dte - 90) - Math.abs(b.dte - 90),
            )[0]
          : withAtm[withAtm.length - 1])
      : null;
  const slope =
    front?.atm != null && back?.atm != null && back !== front
      ? back.atm - front.atm
      : null;

  return {
    spot,
    iv30: chain.iv30,
    asOf: chain.asOf,
    expiries: rows,
    front,
    back,
    slope,
  };
}

/**
 * Out-of-the-money smile for one expiry: puts below spot, calls above spot.
 * This avoids plotting the same volatility twice at each strike and is the
 * usual way to read a single-expiry skew.
 */
export function computeSkew(
  chain: LiveChain,
  iso: string,
  maxPoints = 31,
): VolPoint[] {
  const slots = slotsFor(chain, iso);
  if (!slots.length) return [];
  const atm = nearestAtm(slots, chain.spot);
  const atmStrike = atm?.strike ?? chain.spot;
  const points: VolPoint[] = [];

  for (const slot of slots) {
    if (chain.spot > 0 && Math.abs(slot.strike - chain.spot) > chain.spot * 0.28) {
      continue;
    }
    const usePut = slot.strike < atmStrike;
    const primary = usePut ? slot.put : slot.call;
    const fallback = usePut ? slot.call : slot.put;
    const quote = usable(primary) ? primary : fallback;
    if (!usable(quote)) continue;
    const kind: "call" | "put" = usable(primary)
      ? usePut
        ? "put"
        : "call"
      : usePut
        ? "call"
        : "put";
    points.push({
      strike: slot.strike,
      iv: quote.iv,
      delta: quote.delta,
      kind,
    });
  }

  points.sort((a, b) => a.strike - b.strike);
  if (points.length <= maxPoints) return points;

  return [...points]
    .sort(
      (a, b) =>
        Math.abs(a.strike - chain.spot) - Math.abs(b.strike - chain.spot),
    )
    .slice(0, maxPoints)
    .sort((a, b) => a.strike - b.strike);
}

/** Format a decimal vol difference (0.07) as signed points ("+7.0 点"). */
export function volPoints(value: number): string {
  // Round first so a tiny negative (e.g. -0.0004) never prints as "−0.0".
  const tenths = Math.round(value * 1000) / 10;
  const sign = tenths > 0 ? "+" : tenths < 0 ? "−" : "";
  return `${sign}${Math.abs(tenths).toFixed(1)} 点`;
}

export function termShape(slope: number | null): string {
  if (slope == null) return "数据不足";
  if (slope > 0.005) return "正向期限结构";
  if (slope < -0.005) return "倒挂期限结构";
  return "平坦期限结构";
}
