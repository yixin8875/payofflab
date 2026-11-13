import { useEffect, useMemo, useRef, useState } from "react";
import { compactMoney, money } from "../lib/format";

export type ScenarioPoint = { move: number; current: number; scenario: number };

const COLORS = {
  current: "#a39d94",
  scenario: "#0364d3",
  grid: "#eeebe5",
  axis: "#767169",
};

function moveLabel(v: number) {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)}%`;
}

export function ScenarioChart({
  points,
  spotPct,
  height = 300,
}: {
  points: ScenarioPoint[];
  spotPct: number;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(760);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.max(320, entries[0]?.contentRect.width ?? 760));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { mn, mx } = useMemo(() => {
    const values = points.flatMap((p) => [p.current, p.scenario]);
    let lo = Math.min(...values, 0);
    let hi = Math.max(...values, 0);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.14;
    return { mn: lo - pad, mx: hi + pad };
  }, [points]);

  const padL = 8;
  const padR = 64;
  const padT = 18;
  const padB = 30;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(120, height - padT - padB);
  const lo = points[0]?.move ?? -20;
  const hi = points[points.length - 1]?.move ?? 20;

  const sx = (move: number) => padL + ((move - lo) / (hi - lo)) * chartW;
  const sy = (value: number) => padT + (1 - (value - mn) / (mx - mn)) * chartH;

  const path = (key: "current" | "scenario") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.move).toFixed(1)} ${sy(p[key]).toFixed(1)}`)
      .join(" ");

  const scenarioPath = path("scenario");
  const areaPath = `${scenarioPath} L${sx(hi).toFixed(1)} ${sy(0).toFixed(1)} L${sx(lo).toFixed(
    1,
  )} ${sy(0).toFixed(1)} Z`;

  const yTicks = Array.from({ length: 5 }, (_, i) => mn + ((mx - mn) * i) / 4);
  const xTicks = [-20, -10, 0, 10, 20].filter((v) => v >= lo && v <= hi);

  const markerAt = points.reduce(
    (best, point) => (Math.abs(point.move - spotPct) < Math.abs(best.move - spotPct) ? point : best),
    points[0] ?? { move: spotPct, current: 0, scenario: 0 },
  );
  const markerX = sx(Math.min(hi, Math.max(lo, spotPct)));

  const hoverPoint = hover !== null ? points[hover] : null;

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const move = lo + ((event.clientX - rect.left - padL) / chartW) * (hi - lo);
    let best = 0;
    let distance = Infinity;
    points.forEach((point, index) => {
      const d = Math.abs(point.move - move);
      if (d < distance) {
        distance = d;
        best = index;
      }
    });
    setHover(best);
  };

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="组合盈亏情景图"
      >
        {yTicks.map((value) => (
          <g key={value}>
            <line
              x1={padL}
              x2={padL + chartW}
              y1={sy(value)}
              y2={sy(value)}
              stroke={COLORS.grid}
              strokeDasharray="2 4"
            />
            <text
              x={width - 6}
              y={sy(value) + 3.5}
              textAnchor="end"
              fontSize="11"
              fill={COLORS.axis}
              className="tnum"
            >
              {compactMoney(value)}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          x2={padL + chartW}
          y1={sy(0)}
          y2={sy(0)}
          stroke="#d2cec8"
          strokeWidth="1"
        />

        <path d={areaPath} fill={COLORS.scenario} fillOpacity="0.05" />

        {xTicks.map((value) => (
          <text
            key={value}
            x={sx(value)}
            y={height - 11}
            textAnchor="middle"
            fontSize="11"
            fill={COLORS.axis}
            className="tnum"
          >
            {moveLabel(value)}
          </text>
        ))}

        <path
          d={path("current")}
          fill="none"
          stroke={COLORS.current}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path d={scenarioPath} fill="none" stroke={COLORS.scenario} strokeWidth="2" />

        <line
          x1={markerX}
          x2={markerX}
          y1={padT - 4}
          y2={padT + chartH}
          stroke="#6f6a63"
          strokeDasharray="3 4"
          strokeOpacity="0.45"
        />
        <circle cx={markerX} cy={sy(markerAt.scenario)} r="3.5" fill={COLORS.scenario} />

        <g>
          <rect
            x={Math.min(Math.max(padL, markerX - 30), padL + chartW - 60)}
            y={padT - 15}
            width="60"
            height="17"
            rx="4"
            fill="#ffffff"
            stroke="#e3e0da"
          />
          <text
            x={Math.min(Math.max(padL, markerX - 30), padL + chartW - 60) + 30}
            y={padT - 3.5}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#6f6a63"
            className="tnum"
          >
            {moveLabel(spotPct)}
          </text>
        </g>

        {hoverPoint && (
          <g>
            <line
              x1={sx(hoverPoint.move)}
              x2={sx(hoverPoint.move)}
              y1={padT}
              y2={padT + chartH}
              stroke="#1c1b19"
              strokeOpacity="0.18"
            />
            <circle
              cx={sx(hoverPoint.move)}
              cy={sy(hoverPoint.current)}
              r="3"
              fill={COLORS.current}
            />
            <circle
              cx={sx(hoverPoint.move)}
              cy={sy(hoverPoint.scenario)}
              r="3"
              fill={COLORS.scenario}
            />
          </g>
        )}
      </svg>

      {hoverPoint && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-white/95 px-2.5 py-2 text-[12px] shadow-pop"
          style={{ left: Math.min(Math.max(8, sx(hoverPoint.move) - 62), width - 150) }}
        >
          <div className="font-semibold text-text tnum">标的 {moveLabel(hoverPoint.move)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-dim">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.scenario }} />
            情景
            <span className="ml-auto tnum text-text">{money(hoverPoint.scenario, { sign: true })}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-dim">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.current }} />
            当前
            <span className="ml-auto tnum text-text">{money(hoverPoint.current, { sign: true })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
