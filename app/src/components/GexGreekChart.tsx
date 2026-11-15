import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { gexAxisLabel, gexLabel, strikeLabel, type GexStrike } from "../lib/gex";

const COLORS = {
  positive: "#0b7a52",
  negative: "#bf3b2b",
  grid: "#eeebe5",
  axis: "#767169",
  spot: "#6f6a63",
};

export type GexGreek = "vanna" | "charm";

/** Per-strike bars for the second-order exposures computed in lib/gex. */
export function GexGreekChart({
  strikes,
  spot,
  metric,
  height = 160,
}: {
  strikes: GexStrike[];
  spot: number;
  metric: GexGreek;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(760);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.max(320, entries[0]?.contentRect.width ?? 760));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const row of strikes) {
      const value = row[metric];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const span = Math.max(Math.abs(min), Math.abs(max), 1);
    return {
      lo: min < 0 ? min - span * 0.08 : -span * 0.04,
      hi: max > 0 ? max + span * 0.08 : span * 0.04,
    };
  }, [strikes, metric]);

  const padL = 6;
  const padR = 56;
  const padT = 14;
  const padB = 24;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(80, height - padT - padB);
  const count = Math.max(1, strikes.length);
  const step = chartW / count;
  const barWidth = Math.max(1.5, step * 0.64);

  const xAt = (index: number) => padL + step * (index + 0.5);
  const yAt = (value: number) =>
    padT + (1 - (value - bounds.lo) / (bounds.hi - bounds.lo)) * chartH;
  const zeroY = yAt(0);

  const priceX = (price: number) => {
    if (strikes.length < 2) return xAt(0);
    if (price <= strikes[0].strike) return padL;
    const last = strikes[strikes.length - 1];
    if (price >= last.strike) return padL + chartW;
    for (let index = 1; index < strikes.length; index += 1) {
      const left = strikes[index - 1];
      const right = strikes[index];
      if (price <= right.strike) {
        const ratio = (price - left.strike) / (right.strike - left.strike || 1);
        return xAt(index - 1) + (xAt(index) - xAt(index - 1)) * ratio;
      }
    }
    return padL + chartW;
  };

  const yTicks = Array.from(
    { length: 3 },
    (_, index) => bounds.lo + ((bounds.hi - bounds.lo) * index) / 2,
  );
  const xTickIndexes = useMemo(() => {
    const wanted = Math.min(7, strikes.length);
    const indexes = new Set<number>();
    for (let index = 0; index < wanted; index += 1) {
      indexes.add(Math.round((index * (strikes.length - 1)) / Math.max(1, wanted - 1)));
    }
    return [...indexes].sort((a, b) => a - b);
  }, [strikes.length]);

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left - padL) / step);
    setHover(Math.max(0, Math.min(strikes.length - 1, index)));
  };

  const hovered = hover != null ? strikes[hover] : null;
  const unit = metric === "vanna" ? "每 1 个波动点" : "每天";

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={metric === "vanna" ? "按行权价的 Vanna 敞口" : "按行权价的 Charm 敞口"}
      >
        {yTicks.map((value) => (
          <g key={value}>
            <line
              x1={padL}
              x2={padL + chartW}
              y1={yAt(value)}
              y2={yAt(value)}
              stroke={COLORS.grid}
              strokeDasharray="2 4"
            />
            <text
              x={width - 5}
              y={yAt(value) + 3.5}
              textAnchor="end"
              fontSize="11"
              fill={COLORS.axis}
              className="tnum"
            >
              {gexAxisLabel(value)}
            </text>
          </g>
        ))}

        <line x1={padL} x2={padL + chartW} y1={zeroY} y2={zeroY} stroke="#d2cec8" />

        {strikes.map((row, index) => {
          const value = row[metric];
          const top = Math.min(zeroY, yAt(value));
          const barHeight = Math.max(1, Math.abs(yAt(value) - zeroY));
          const active = hover === null || hover === index;
          return (
            <rect
              key={row.strike}
              x={xAt(index) - barWidth / 2}
              y={top}
              width={barWidth}
              height={barHeight}
              rx={barWidth > 3 ? 1.5 : 0}
              fill={value >= 0 ? COLORS.positive : COLORS.negative}
              opacity={active ? 0.88 : 0.45}
            />
          );
        })}

        {xTickIndexes.map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill={COLORS.axis}
            className="tnum"
          >
            {strikeLabel(strikes[index].strike)}
          </text>
        ))}

        <line
          x1={priceX(spot)}
          x2={priceX(spot)}
          y1={padT - 4}
          y2={padT + chartH}
          stroke={COLORS.spot}
          strokeDasharray="3 4"
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[178px] rounded-xl border border-line bg-white/95 px-2.5 py-2 text-[12px] shadow-pop"
          style={{ left: Math.min(Math.max(8, xAt(hover ?? 0) - 89), width - 190) }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-text tnum">
              行权价 {strikeLabel(hovered.strike)}
            </span>
            <span
              className={`tnum font-semibold ${hovered[metric] >= 0 ? "text-profit" : "text-loss"}`}
            >
              {gexLabel(hovered[metric], { sign: true })}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-faint">{unit}</div>
        </div>
      )}
    </div>
  );
}
