import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { gexAxisLabel, gexLabel, strikeLabel, type GexStrike } from "../lib/gex";

const COLORS = {
  positive: "#0b7a52",
  negative: "#bf3b2b",
  grid: "#eeebe5",
  axis: "#9c978f",
  spot: "#6f6a63",
  flip: "#0364d3",
};

export function GexChart({
  strikes,
  spot,
  flip,
  height = 300,
}: {
  strikes: GexStrike[];
  spot: number;
  flip: number | null;
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
      if (row.net < min) min = row.net;
      if (row.net > max) max = row.net;
    }
    const span = Math.max(Math.abs(min), Math.abs(max), 1);
    return {
      lo: min < 0 ? min - span * 0.08 : -span * 0.04,
      hi: max > 0 ? max + span * 0.08 : span * 0.04,
    };
  }, [strikes]);

  const padL = 6;
  const padR = 56;
  const padT = 18;
  const padB = 28;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(120, height - padT - padB);
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
    { length: 5 },
    (_, index) => bounds.lo + ((bounds.hi - bounds.lo) * index) / 4,
  );
  const xTickIndexes = useMemo(() => {
    const wanted = Math.min(7, strikes.length);
    const indexes = new Set<number>();
    for (let index = 0; index < wanted; index += 1) {
      indexes.add(Math.round((index * (strikes.length - 1)) / Math.max(1, wanted - 1)));
    }
    return [...indexes].sort((a, b) => a - b);
  }, [strikes.length]);

  const spotX = strikes.length ? priceX(spot) : padL;
  const flipInRange =
    flip != null &&
    strikes.length > 0 &&
    flip >= strikes[0].strike &&
    flip <= strikes[strikes.length - 1].strike;
  const flipX = flipInRange && flip != null ? priceX(flip) : null;

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left - padL) / step);
    setHover(Math.max(0, Math.min(strikes.length - 1, index)));
  };

  const hovered = hover != null ? strikes[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="按行权价的 Gamma 敞口柱状图"
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
              fontSize="10"
              fill={COLORS.axis}
              className="tnum"
            >
              {gexAxisLabel(value)}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          x2={padL + chartW}
          y1={zeroY}
          y2={zeroY}
          stroke="#d2cec8"
        />

        {strikes.map((row, index) => {
          const x = xAt(index);
          const top = Math.min(zeroY, yAt(row.net));
          const barHeight = Math.max(1, Math.abs(yAt(row.net) - zeroY));
          const active = hover === null || hover === index;
          return (
            <rect
              key={row.strike}
              x={x - barWidth / 2}
              y={top}
              width={barWidth}
              height={barHeight}
              rx={barWidth > 3 ? 1.5 : 0}
              fill={row.net >= 0 ? COLORS.positive : COLORS.negative}
              opacity={active ? 0.88 : 0.45}
            />
          );
        })}

        {xTickIndexes.map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 9}
            textAnchor="middle"
            fontSize="10"
            fill={COLORS.axis}
            className="tnum"
          >
            {strikeLabel(strikes[index].strike)}
          </text>
        ))}

        <line
          x1={spotX}
          x2={spotX}
          y1={padT - 5}
          y2={padT + chartH}
          stroke={COLORS.spot}
          strokeDasharray="3 4"
        />
        <text
          x={Math.min(Math.max(padL, spotX - 30), padL + chartW - 60)}
          y={padT - 8}
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill={COLORS.spot}
          className="tnum"
        >
          现价 {strikeLabel(spot)}
        </text>

        {flipX != null && (
          <>
            <line
              x1={flipX}
              x2={flipX}
              y1={padT - 5}
              y2={padT + chartH}
              stroke={COLORS.flip}
              strokeDasharray="5 4"
              strokeOpacity="0.7"
            />
            <text
              x={Math.min(Math.max(padL, flipX - 32), padL + chartW - 64)}
              y={Math.abs(flipX - spotX) < 76 ? padT + 11 : padT - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={COLORS.flip}
              className="tnum"
            >
              Flip {strikeLabel(flip ?? 0)}
            </text>
          </>
        )}

        {hovered && (
          <line
            x1={xAt(hover ?? 0)}
            x2={xAt(hover ?? 0)}
            y1={padT}
            y2={padT + chartH}
            stroke="#1c1b19"
            strokeOpacity="0.16"
          />
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[168px] rounded-lg border border-line bg-white/95 px-2.5 py-2 text-[11px] shadow-pop"
          style={{ left: Math.min(Math.max(8, xAt(hover ?? 0) - 84), width - 180) }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-text tnum">
              行权价 {strikeLabel(hovered.strike)}
            </span>
            <span
              className={`tnum font-semibold ${hovered.net >= 0 ? "text-profit" : "text-loss"}`}
            >
              {gexLabel(hovered.net, { sign: true })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-dim">
            <span>看涨</span>
            <span className="tnum text-text">{gexLabel(hovered.call, { sign: true })}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-dim">
            <span>看跌</span>
            <span className="tnum text-text">{gexLabel(hovered.put, { sign: true })}</span>
          </div>
          <div className="mt-1 border-t border-line-subtle pt-1 text-[10px] text-faint tnum">
            OI {hovered.callOi.toLocaleString("en-US")} 看涨 /{" "}
            {hovered.putOi.toLocaleString("en-US")} 看跌
          </div>
        </div>
      )}
    </div>
  );
}
