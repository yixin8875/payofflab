export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const MINUS = "−";

export function money(v: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const { cents = false, sign = false } = opts;
  const abs = Math.abs(v);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const prefix = v < 0 ? MINUS : sign && v > 0 ? "+" : "";
  return `${prefix}$${body}`;
}

export function compactMoney(v: number): string {
  const abs = Math.abs(v);
  const prefix = v < 0 ? MINUS : "";
  if (abs >= 1000) {
    const k = abs / 1000;
    const body = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "");
    return `${prefix}$${body}k`;
  }
  return `${prefix}$${abs.toFixed(0)}`;
}

export function pct(v: number, digits = 1): string {
  const s = (v * 100).toFixed(digits);
  return `${v < 0 ? MINUS : ""}${s.replace("-", "")}%`;
}

export function signedPct(v: number, digits = 1): string {
  const s = (v * 100).toFixed(digits);
  const sign = v > 0 ? "+" : v < 0 ? MINUS : "";
  return `${sign}${s.replace("-", "")}%`;
}

export function num(v: number, digits = 2): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function price(v: number, digits = 2): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function clampText(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
