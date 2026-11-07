export type LegKind = "call" | "put" | "stock";

export type Leg = {
  id: string;
  kind: LegKind;
  side: 1 | -1;
  qty: number;
  strike: number;
  expiry: string;
  dte: number;
  fill: number;
};

export type Instrument = {
  symbol: string;
  name: string;
  spot: number;
  change: number;
  changePct: number;
  iv: number;
  ivRank: number;
  strikeStep: number;
  expiries: { iso: string; label: string; dte: number }[];
};

export const r = 0.0402;
export const q = 0.0103;

export function normCdf(x: number): number {
  // West's rational approximation of the normal CDF.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function normPdf(x: number): number {
  return 0.3989422804 * Math.exp((-x * x) / 2);
}

function d1d2(S: number, K: number, T: number, sigma: number) {
  const sqrtT = Math.sqrt(Math.max(T, 1e-6));
  const d1 =
    (Math.log(Math.max(S, 1e-6) / Math.max(K, 1e-6)) + (r - q + (sigma * sigma) / 2) * T) /
    (sigma * sqrtT);
  return { d1, d2: d1 - sigma * sqrtT, sqrtT };
}

export function bsPrice(kind: "call" | "put", S: number, K: number, T: number, sigma: number): number {
  if (T <= 0.0001) {
    return kind === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }
  const { d1, d2 } = d1d2(S, K, T, sigma);
  const disc = Math.exp(-r * T);
  const div = Math.exp(-q * T);
  if (kind === "call") return Math.max(S * div * normCdf(d1) - K * disc * normCdf(d2), 0);
  return Math.max(K * disc * normCdf(-d2) - S * div * normCdf(-d1), 0);
}

export function ivFor(kind: LegKind, K: number, S: number, baseIv: number): number {
  if (kind === "stock") return baseIv;
  const m = Math.log(Math.max(K, 1) / S);
  const skew = kind === "put" ? 0.55 : 0.35;
  return Math.max(0.05, baseIv * (1 + skew * m * m * 24));
}

export function legPrice(leg: Leg, S: number, T: number, baseIv: number): number {
  if (leg.kind === "stock") return S;
  return bsPrice(leg.kind, S, leg.strike, T, ivFor(leg.kind, leg.strike, S, baseIv));
}

export function expiryPayoff(leg: Leg, S: number): number {
  const dir = leg.side * leg.qty * 100;
  if (leg.kind === "stock") return dir * (S - leg.fill);
  const intrinsic = leg.kind === "call" ? Math.max(S - leg.strike, 0) : Math.max(leg.strike - S, 0);
  return dir * (intrinsic - leg.fill);
}

export function payoffAt(legs: Leg[], S: number): number {
  return legs.reduce((sum, leg) => sum + expiryPayoff(leg, S), 0);
}

export function markAt(legs: Leg[], S: number, T: number, baseIv: number): number {
  return legs.reduce((sum, leg) => {
    const value = legPrice(leg, S, T, baseIv);
    return sum + leg.side * leg.qty * 100 * (value - leg.fill);
  }, 0);
}

export function netCash(legs: Leg[]): number {
  return legs.reduce((sum, leg) => sum + leg.side * leg.qty * 100 * leg.fill, 0);
}

export function greeks(legs: Leg[], S: number, T: number, baseIv: number) {
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  let rho = 0;
  for (const leg of legs) {
    const dir = leg.side * leg.qty * 100;
    if (leg.kind === "stock") {
      delta += dir;
      rho += dir * (S * T * Math.exp(-r * T)) / 100;
      continue;
    }
    const K = leg.strike;
    const sigma = ivFor(leg.kind, K, S, baseIv);
    const { d1, d2, sqrtT } = d1d2(S, K, Math.max(T, 1e-6), sigma);
    const disc = Math.exp(-r * T);
    const div = Math.exp(-q * T);
    const call = leg.kind === "call";
    const dl = call ? div * normCdf(d1) : -div * normCdf(-d1);
    const gm = (div * normPdf(d1)) / (S * sigma * sqrtT);
    const th = call
      ? (-S * div * normPdf(d1) * sigma) / (2 * sqrtT) -
        r * K * disc * normCdf(d2) +
        q * S * div * normCdf(d1)
      : (-S * div * normPdf(d1) * sigma) / (2 * sqrtT) +
        r * K * disc * normCdf(-d2) -
        q * S * div * normCdf(-d1);
    const vg = (S * div * normPdf(d1) * sqrtT) / 100;
    const rh = ((call ? 1 : -1) * K * T * disc * normCdf(call ? d2 : -d2)) / 100;
    delta += dir * dl;
    gamma += dir * gm;
    theta += dir * (th / 365);
    vega += dir * vg;
    rho += dir * rh;
  }
  return { delta, gamma, theta, vega, rho };
}

export type Analysis = {
  debit: number;
  premium: number;
  isCredit: boolean;
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  probProfit: number;
  expectedValue: number;
  theta: number;
  greeks: ReturnType<typeof greeks>;
  expectedMove: number;
  expectedMovePct: number;
  bestCase: string;
  worstCase: string;
  sentence: string;
  riskReward: string;
};

const fmt = (v: number) =>
  `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmt0 = (v: number) =>
  `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function analyse(
  legs: Leg[],
  instrument: Instrument,
  T: number,
  range?: { lo: number; hi: number },
): Analysis {
  const S = instrument.spot;
  const lo = range?.lo ?? S * 0.5;
  const hi = range?.hi ?? S * 1.5;
  const N = 900;
  const step = (hi - lo) / N;
  let min = Infinity;
  let max = -Infinity;
  let minAt = lo;
  let maxAt = lo;
  let sign = 0;
  const breakevens: number[] = [];
  let prob = 0;
  let ev = 0;
  const sigma = instrument.iv;
  const drift = r - q - (sigma * sigma) / 2;
  for (let i = 0; i <= N; i++) {
    const price = lo + i * step;
    const v = payoffAt(legs, price);
    if (v < min) {
      min = v;
      minAt = price;
    }
    if (v > max) {
      max = v;
      maxAt = price;
    }
    const s = Math.sign(v);
    if (sign !== 0 && s !== 0 && s !== sign) {
      // refine the crossing by bisection
      let a = price - step;
      let b = price;
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2;
        if (Math.sign(payoffAt(legs, m)) === sign) a = m;
        else b = m;
      }
      breakevens.push((a + b) / 2);
    }
    if (s !== 0) sign = s;
  }
  // stock and deep-ITM puts bottom out at zero, below the scanned range
  const atZero = payoffAt(legs, 0);
  if (atZero < min) {
    min = atZero;
    minAt = 0;
  } else if (atZero > max) {
    max = atZero;
    maxAt = 0;
  }
  // probability + expected value under the risk-neutral lognormal
  const sqrtT = Math.sqrt(Math.max(T, 1e-6));
  for (let i = 0; i <= N; i++) {
    const price = lo + i * step;
    if (price <= 0) continue;
    const z = (Math.log(price / S) - drift * T) / (sigma * sqrtT);
    const dens = normPdf(z) / (price * sigma * sqrtT);
    const v = payoffAt(legs, price);
    if (v > 0) prob += dens * step;
    ev += dens * step * v;
  }
  // edges decide whether a side runs on without a bound
  const leftSlope = payoffAt(legs, lo + step) - payoffAt(legs, lo);
  const rightSlope = payoffAt(legs, hi) - payoffAt(legs, hi - step);
  const unlimitedUp = rightSlope > 1;
  const unlimitedDown = leftSlope < -1;
  const maxProfit = unlimitedUp ? null : max;
  const maxLoss = unlimitedDown ? null : min;
  const g = greeks(legs, S, T, instrument.iv);
  const net = netCash(legs);
  const premium = netCash(legs.filter((l) => l.kind !== "stock"));
  const move = S * (Math.exp(instrument.iv * sqrtT) - 1);
  const be = breakevens;
  const beText = be.map((b) => fmt(b)).join(" · ");
  const sentence =
    be.length === 0
      ? "这个组合在任何价位都不会盈利。"
      : be.length === 1
        ? be[0] > S
          ? `标的价格高于 ${fmt(be[0])} 时开始盈利。`
          : `标的价格低于 ${fmt(be[0])} 时开始盈利。`
        : be.length === 2
          ? `标的价格在 ${fmt(be[0])} 与 ${fmt(be[1])} 之间时盈利。`
          : `在 ${beText} 之间的区间内盈利。`;
  const bestCase =
    unlimitedUp
      ? `盈利没有上限，标的越涨越好。`
      : maxProfit !== null && maxProfit > 0
        ? `最多盈利 ${fmt0(maxProfit)}，出现在 ${fmt0(maxAt)} 附近。`
        : "这个组合没有盈利空间。";
  const worstCase = unlimitedDown
    ? `亏损没有下限，标的越跌越差。`
    : maxLoss !== null && maxLoss < 0
      ? `最坏情况是亏损 ${fmt(Math.abs(maxLoss))}，${minAt > S ? "标的上行至" : "标的跌破"} ${fmt0(minAt)} 时出现。`
      : "理论上不会亏损。";
  const rr =
    maxProfit !== null && maxLoss !== null && maxLoss !== 0
      ? `1 : ${Math.abs(maxProfit / maxLoss).toFixed(2)}`
      : "—";
  return {
    debit: net,
    premium,
    isCredit: net < 0,
    maxProfit,
    maxLoss,
    breakevens: be,
    probProfit: Math.min(1, Math.max(0, prob)),
    expectedValue: ev,
    theta: g.theta,
    greeks: g,
    expectedMove: move,
    expectedMovePct: move / S,
    bestCase,
    worstCase,
    sentence,
    riskReward: rr,
  };
}
