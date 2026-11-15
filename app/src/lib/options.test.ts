import { describe, expect, it } from "vitest";
import { bsCharm, bsGamma, bsPrice, bsVanna, greeks, normPdf, q, r } from "./options";

const CASES: [number, number, number, number][] = [
  [100, 100, 0.25, 0.25],
  [754, 760, 7 / 365, 0.14],
  [50, 65, 2, 0.45],
  [4000, 3500, 0.02, 0.3],
];

/**
 * High-accuracy normal CDF used only to build reference prices. The library's
 * own CDF is a fast approximation whose ~1e-7 error is amplified by the
 * second differences below, so the numeric side needs a clean reference.
 */
const Phi = (x: number) => {
  if (x <= -8) return 0;
  if (x >= 8) return 1;
  const n = 2000;
  const lo = -8;
  const h = (x - lo) / n;
  let sum = normPdf(lo) + normPdf(x);
  for (let index = 1; index < n; index += 1) {
    sum += (index % 2 === 1 ? 4 : 2) * normPdf(lo + index * h);
  }
  return (h / 3) * sum;
};

const priceAcc = (
  kind: "call" | "put",
  S: number,
  K: number,
  T: number,
  sigma: number,
) => {
  if (T <= 0.0001) return kind === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const disc = Math.exp(-r * T);
  const div = Math.exp(-q * T);
  if (kind === "call") return S * div * Phi(d1) - K * disc * Phi(d2);
  return K * disc * Phi(-d2) - S * div * Phi(-d1);
};

const deltaAcc = (
  kind: "call" | "put",
  S: number,
  K: number,
  T: number,
  sigma: number,
) => {
  const h = S * 1e-4;
  return (priceAcc(kind, S + h, K, T, sigma) - priceAcc(kind, S - h, K, T, sigma)) / (2 * h);
};

const expectRel = (actual: number, expected: number, tol: number) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * tol + 1e-12);
};

describe("bsPrice", () => {
  it("obeys put-call parity with continuous dividend yield", () => {
    for (const [S, K, T, sigma] of CASES) {
      const call = bsPrice("call", S, K, T, sigma);
      const put = bsPrice("put", S, K, T, sigma);
      const expected = S * Math.exp(-q * T) - K * Math.exp(-r * T);
      expect(Math.abs(call - put - expected)).toBeLessThan(1e-6);
    }
  });

  it("tracks an independent high-accuracy price", () => {
    for (const [S, K, T, sigma] of CASES) {
      for (const kind of ["call", "put"] as const) {
        const diff = Math.abs(bsPrice(kind, S, K, T, sigma) - priceAcc(kind, S, K, T, sigma));
        // The rational CDF approximation carries a small absolute error that
        // scales with spot, so compare against the larger of the two bounds.
        expect(diff).toBeLessThanOrEqual(Math.max(2e-3, S * 2e-7));
      }
    }
  });

  it("falls back to intrinsic value at expiry", () => {
    expect(bsPrice("call", 120, 100, 0, 0.2)).toBeCloseTo(20, 6);
    expect(bsPrice("call", 80, 100, 0, 0.2)).toBe(0);
    expect(bsPrice("put", 80, 100, 0, 0.2)).toBeCloseTo(20, 6);
  });

  it("never returns a negative price", () => {
    for (const [S, K, T, sigma] of CASES) {
      expect(bsPrice("call", S, K, T, sigma)).toBeGreaterThanOrEqual(0);
      expect(bsPrice("put", S, K, T, sigma)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("bsGamma", () => {
  it("matches the second derivative of an accurate price", () => {
    for (const [S, K, T, sigma] of CASES) {
      const h = S * 1e-4;
      const numeric =
        (priceAcc("call", S + h, K, T, sigma) -
          2 * priceAcc("call", S, K, T, sigma) +
          priceAcc("call", S - h, K, T, sigma)) /
        (h * h);
      expectRel(bsGamma(S, K, T, sigma), numeric, 2e-3);
    }
  });

  it("peaks at the money", () => {
    const base = bsGamma(100, 100, 0.25, 0.25);
    expect(base).toBeGreaterThan(bsGamma(100, 95, 0.25, 0.25));
    expect(base).toBeGreaterThan(bsGamma(100, 105, 0.25, 0.25));
  });

  it("returns zero for invalid inputs", () => {
    expect(bsGamma(0, 100, 0.1, 0.2)).toBe(0);
    expect(bsGamma(100, 0, 0.1, 0.2)).toBe(0);
    expect(bsGamma(100, 100, 0, 0.2)).toBe(0);
    expect(bsGamma(100, 100, 0.1, 0)).toBe(0);
  });
});

describe("bsVanna", () => {
  it("matches the mixed derivative of an accurate price", () => {
    for (const [S, K, T, sigma] of CASES) {
      const h = S * 1e-4;
      const k = 1e-4;
      const numeric =
        (priceAcc("call", S + h, K, T, sigma + k) -
          priceAcc("call", S + h, K, T, sigma - k) -
          priceAcc("call", S - h, K, T, sigma + k) +
          priceAcc("call", S - h, K, T, sigma - k)) /
        (4 * h * k);
      expectRel(bsVanna(S, K, T, sigma), numeric, 1e-2);
    }
  });

  it("matches the vol sensitivity of call and put delta", () => {
    for (const [S, K, T, sigma] of CASES) {
      const h = 1e-3;
      const call = (deltaAcc("call", S, K, T, sigma + h) - deltaAcc("call", S, K, T, sigma - h)) / (2 * h);
      const put = (deltaAcc("put", S, K, T, sigma + h) - deltaAcc("put", S, K, T, sigma - h)) / (2 * h);
      expectRel(call, put, 1e-5);
      expectRel(bsVanna(S, K, T, sigma), call, 1e-2);
    }
  });

  it("returns zero for invalid inputs", () => {
    expect(bsVanna(100, 100, 0, 0.2)).toBe(0);
    expect(bsVanna(100, 100, 0.1, -0.2)).toBe(0);
  });
});

describe("bsCharm", () => {
  it("matches minus the derivative of delta with respect to expiry", () => {
    for (const [S, K, T, sigma] of CASES) {
      const h = 1e-4;
      for (const kind of ["call", "put"] as const) {
        const numeric =
          -(deltaAcc(kind, S, K, T + h, sigma) - deltaAcc(kind, S, K, T - h, sigma)) / (2 * h);
        expectRel(bsCharm(S, K, T, sigma, kind), numeric, 1e-2);
      }
    }
  });

  it("gives puts the extra dividend term over calls", () => {
    for (const [S, K, T, sigma] of CASES) {
      expect(bsCharm(S, K, T, sigma, "put")).toBeCloseTo(
        bsCharm(S, K, T, sigma) - q * Math.exp(-q * T),
        10,
      );
    }
  });

  it("returns zero for invalid inputs", () => {
    expect(bsCharm(100, 100, 0, 0.2)).toBe(0);
    expect(bsCharm(0, 100, 0.1, 0.2)).toBe(0);
  });
});

describe("greeks", () => {
  it("aggregates a long call with positive delta and gamma", () => {
    const result = greeks(
      [
        {
          id: "c",
          kind: "call",
          side: 1,
          qty: 1,
          strike: 100,
          expiry: "2026-01-01",
          dte: 30,
          fill: 3,
          iv: 0.25,
        },
      ],
      100,
      30 / 365,
      0.25,
    );
    expect(result.delta).toBeGreaterThan(0);
    expect(result.gamma).toBeGreaterThan(0);
    expect(result.vega).toBeGreaterThan(0);
    expect(result.theta).toBeLessThan(0);
  });
});
