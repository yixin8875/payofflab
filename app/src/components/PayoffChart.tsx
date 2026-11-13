import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compactMoney, money, price } from "../lib/format";
import { payoffAt, markAt, type Leg } from "../lib/options";

type Props = {
  legs: Leg[];
  spot: number;
  iv: number;
  dte: number;
  expiryLabel: string;
  mode: "pnl" | "pct";
  envelope: number; // 0, 1 or 2 sigma
  height?: number;
  interactive?: boolean;
};

const COLORS = {
  expiry: "#bf3b2b",
  today: "#0364d3",
  profit: "#0b7a52",
  loss: "#bf3b2b",
  grid: "#eeebe5",
  axis: "#767169",
};

function niceTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const steps = [1, 2, 2.5, 5, 10];
  let stepSize = pickStep(raw / mag, steps) * mag;
  if (stepSize === 0) stepSize = raw;
  const start = Math.ceil(lo / stepSize) * stepSize;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += stepSize) out.push(Number(v.toFixed(2)));
  return out;
}

function pickStep(v: number, options: number[]): number {
  for (const o of options) if (v <= o) return o;
  return options[options.length - 1];
}

export function PayoffChart({
  legs,
  spot,
  iv,
  dte,
  expiryLabel,
  mode,
  envelope,
  height = 420,
  interactive = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 720;
      setWidth(Math.max(280, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const strikes = legs.filter((l) => l.kind !== "stock").map((l) => l.strike);
    const lo = Math.min(spot * 0.9, ...strikes.map((s) => s * 0.94));
    const hi = Math.max(spot * 1.1, ...strikes.map((s) => s * 1.06));
    const n = 260;
    const T = Math.max(dte, 0) / 365;
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const p = lo + ((hi - lo) * i) / n;
      return { p, exp: payoffAt(legs, p), now: markAt(legs, p, T, iv) };
    });
    const values = pts.flatMap((d) => [d.exp, d.now]);
    let mn = Math.min(...values, 0);
    let mx = Math.max(...values, 0);
    if (mn === mx) {
      mn -= 1;
      mx += 1;
    }
    const pad = (mx - mn) * 0.14;
    mn -= pad;
    mx += pad;
    return { lo, hi, pts, mn, mx };
  }, [legs, spot, iv, dte]);

  const { lo, hi, pts, mn, mx } = model;
  const padL = 10;
  const padR = mode === "pnl" ? 58 : 50;
  const padT = 26;
  const padB = 34;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(120, height - padT - padB);

  const sx = useCallback((p: number) => padL + ((p - lo) / (hi - lo)) * chartW, [lo, hi, chartW]);
  const sy = useCallback((v: number) => padT + (1 - (v - mn) / (mx - mn)) * chartH, [mn, mx, chartH]);

  const conv = (v: number) => (mode === "pct" ? (v / spot) * 100 : v);
  const fmtAxis = (v: number) =>
    mode === "pct" ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)}%` : compactMoney(v);

  const line = (key: "exp" | "now") =>
    pts.map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.p).toFixed(1)} ${sy(conv(d[key])).toFixed(1)}`).join(" ");

  const areaFor = (key: "exp" | "now", positive: boolean) => {
    const zeroY = sy(0);
    let d = "";
    let started = false;
    for (const pt of pts) {
      const v = conv(pt[key]);
      const inRegion = positive ? v >= 0 : v < 0;
      if (inRegion) {
        const x = sx(pt.p).toFixed(1);
        const y = sy(v).toFixed(1);
        d += started ? ` L${x} ${y}` : `M${x} ${y}`;
        started = true;
      } else if (started) {
        const x = sx(pt.p).toFixed(1);
        d += ` L${x} ${zeroY.toFixed(1)} Z`;
        started = false;
      }
    }
    if (started) d += ` L${sx(hi).toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return d;
  };

  const expPath = line("exp");
  const nowPath = line("now");
  const yTicks = niceTicks(mode === "pct" ? mn / spot * 100 : mn, mode === "pct" ? mx / spot * 100 : mx, 5);
  const xTicks = niceTicks(lo, hi, width > 620 ? 7 : 5);

  // breakeven: first sign change of the expiry curve
  const breakevens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (Math.sign(a.exp) !== Math.sign(b.exp) && Math.sign(a.exp) !== 0) {
      const t = Math.abs(a.exp) / (Math.abs(a.exp) + Math.abs(b.exp));
      breakevens.push(a.p + (b.p - a.p) * t);
    }
  }

  const sigmaBand = iv * Math.sqrt(Math.max(dte, 1) / 365);
  const bandHalf = spot * (Math.exp(sigmaBand * Math.max(envelope, 0)) - 1);
  const bandLo = sx(spot - bandHalf);
  const bandHi = sx(spot + bandHalf);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x - padL) / chartW;
    const p = lo + t * (hi - lo);
    setHover(Math.min(hi, Math.max(lo, p)));
  };

  const hoverPoint = hover !== null ? {
    p: hover,
    exp: payoffAt(legs, hover),
    now: markAt(legs, hover, Math.max(dte, 0) / 365, iv),
  } : null;

  const spotLabel = `$${price(spot)}`;

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${expiryLabel} 盈亏图`}
      >
        <defs>
          <linearGradient id="expZero" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {envelope > 0 && (
          <rect
            x={bandLo}
            y={padT}
            width={Math.max(2, bandHi - bandLo)}
            height={chartH}
            fill="#0364d3"
            fillOpacity="0.055"
          />
        )}

        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={padL}
              x2={padL + chartW}
              y1={sy(t)}
              y2={sy(t)}
              stroke={COLORS.grid}
              strokeDasharray="2 4"
            />
            <text
              x={width - 6}
              y={sy(t) + 3.5}
              textAnchor="end"
              fontSize="11"
              fill={COLORS.axis}
              className="tnum"
            >
              {fmtAxis(t)}
            </text>
          </g>
        ))}

        <line x1={padL} x2={padL + chartW} y1={sy(0)} y2={sy(0)} stroke="#d2cec8" strokeWidth="1" />

        <path d={areaFor("exp", true)} fill={COLORS.profit} fillOpacity="0.07" />
        <path d={areaFor("exp", false)} fill={COLORS.loss} fillOpacity="0.06" />

        {xTicks.map((t) => (
          <text
            key={`x${t}`}
            x={sx(t)}
            y={height - 12}
            textAnchor="middle"
            fontSize="11"
            fill={COLORS.axis}
            className="tnum"
          >
            {price(t, t < 100 ? 1 : 0)}
          </text>
        ))}

        {legs
          .filter((l) => l.kind !== "stock")
          .map((l) => (
            <g key={l.id}>
              <line
                x1={sx(l.strike)}
                x2={sx(l.strike)}
                y1={padT + chartH + 4}
                y2={padT + chartH + 9}
                stroke={COLORS.axis}
                strokeOpacity="0.5"
              />
            </g>
          ))}

        <line
          x1={sx(spot)}
          x2={sx(spot)}
          y1={padT - 6}
          y2={padT + chartH}
          stroke="#6f6a63"
          strokeDasharray="3 4"
          strokeOpacity="0.45"
        />

        <path d={nowPath} fill="none" stroke={COLORS.today} strokeWidth="1.7" />
        <path d={expPath} fill="none" stroke={COLORS.expiry} strokeWidth="1.7" />

        {breakevens.map((b, i) => (
          <g key={`be${i}`}>
            <line
              x1={sx(b)}
              x2={sx(b)}
              y1={sy(0) - 8}
              y2={sy(0) + 8}
              stroke="#6f6a63"
              strokeOpacity="0.5"
            />
            <circle cx={sx(b)} cy={sy(0)} r="3" fill="#fbfaf8" stroke="#6f6a63" strokeWidth="1.4" />
            <text
              x={sx(b) + (i % 2 === 0 ? 8 : -8)}
              y={sy(0) + 4}
              textAnchor={i % 2 === 0 ? "start" : "end"}
              fontSize="11"
              fill={COLORS.axis}
              className="tnum"
            >
              {price(b)}
            </text>
          </g>
        ))}

        <g>
          <rect
            x={sx(spot) - 32}
            y={padT - 24}
            width="64"
            height="18"
            rx="4"
            fill="#ffffff"
            stroke="#e3e0da"
          />
          <text
            x={sx(spot)}
            y={padT - 11}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#6f6a63"
            className="tnum"
          >
            {spotLabel}
          </text>
        </g>

        {hoverPoint && (
          <g>
            <line
              x1={sx(hoverPoint.p)}
              x2={sx(hoverPoint.p)}
              y1={padT}
              y2={padT + chartH}
              stroke="#1c1b19"
              strokeOpacity="0.2"
            />
            <circle cx={sx(hoverPoint.p)} cy={sy(conv(hoverPoint.exp))} r="3" fill={COLORS.expiry} />
            <circle cx={sx(hoverPoint.p)} cy={sy(conv(hoverPoint.now))} r="3" fill={COLORS.today} />
          </g>
        )}
      </svg>

      {hoverPoint && interactive && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-white/95 px-2.5 py-2 text-[12px] shadow-pop"
          style={{
            left: Math.min(Math.max(8, sx(hoverPoint.p) - 62), width - 140),
          }}
        >
          <div className="font-semibold text-text tnum">${price(hoverPoint.p)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-dim">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.today }} />
            今日 <span className="ml-auto tnum text-text">{money(hoverPoint.now, { sign: true })}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-dim">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.expiry }} />
            到期 <span className="ml-auto tnum text-text">{money(hoverPoint.exp, { sign: true })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
