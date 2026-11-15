import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { gexAxisLabel, gexLabel, strikeLabel, type GexProfile } from "../lib/gex";

const COLORS = {
  positive: "#0b7a52",
  negative: "#bf3b2b",
  grid: "#eeebe5",
  axis: "#767169",
  spot: "#6f6a63",
  zero: "#0364d3",
};

/**
 * Net GEX as a function of a hypothetical spot price. The line crosses zero
 * where the current positioning would flip sign if price moved there.
 */
export function GexProfileChart({
  profile,
  height = 240,
}: {
  profile: GexProfile;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(760);
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const aboveId = `gex-profile-above-${uid}`;
  const belowId = `gex-profile-below-${uid}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.max(320, entries[0]?.contentRect.width ?? 760));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = profile.points;

  const bounds = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const point of points) {
      if (point.net < min) min = point.net;
      if (point.net > max) max = point.net;
    }
    const span = Math.max(Math.abs(min), Math.abs(max), 1);
    return {
      lo: min < 0 ? min - span * 0.08 : -span * 0.04,
      hi: max > 0 ? max + span * 0.08 : span * 0.04,
    };
  }, [points]);

  const count = points.length;
  const xTickIndexes = useMemo(() => {
    const wanted = Math.min(5, count);
    const indexes = new Set<number>();
    for (let index = 0; index < wanted; index += 1) {
      indexes.add(Math.round((index * (count - 1)) / Math.max(1, wanted - 1)));
    }
    return [...indexes].sort((a, b) => a - b);
  }, [count]);

  if (!points.length) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-lg border border-line-subtle bg-[#fbfaf8] text-[12px] text-dim">
        当前范围没有可用于 Profile 的 IV 数据。
      </div>
    );
  }

  const padL = 6;
  const padR = 58;
  const padT = 18;
  const padB = 26;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(100, height - padT - padB);

  const xAt = (index: number) => padL + (chartW * index) / Math.max(1, count - 1);
  const yAt = (value: number) =>
    padT + (1 - (value - bounds.lo) / (bounds.hi - bounds.lo)) * chartH;
  const zeroY = yAt(0);

  const spotX =
    padL + chartW * ((profile.current.price - profile.low) / (profile.high - profile.low || 1));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.net)}`)
    .join(" ");
  const areaPath =
    `M ${xAt(0)} ${zeroY} ` +
    points.map((point, index) => `L ${xAt(index)} ${yAt(point.net)}`).join(" ") +
    ` L ${xAt(count - 1)} ${zeroY} Z`;

  const yTicks = Array.from(
    { length: 5 },
    (_, index) => bounds.lo + ((bounds.hi - bounds.lo) * index) / 4,
  );

  const nearestCrossing = profile.crossings.length
    ? profile.crossings.reduce((best, value) =>
        Math.abs(value - profile.current.price) < Math.abs(best - profile.current.price)
          ? value
          : best,
      )
    : null;

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - padL) / chartW;
    setHover(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  };

  const hovered = hover != null ? points[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="假设标的价格下的净 Gamma 曲线"
      >
        <defs>
          <clipPath id={aboveId}>
            <rect x={padL} y={padT} width={chartW} height={Math.max(0, zeroY - padT)} />
          </clipPath>
          <clipPath id={belowId}>
            <rect
              x={padL}
              y={zeroY}
              width={chartW}
              height={Math.max(0, padT + chartH - zeroY)}
            />
          </clipPath>
        </defs>

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

        <path d={areaPath} fill={COLORS.positive} opacity="0.14" clipPath={`url(#${aboveId})`} />
        <path d={areaPath} fill={COLORS.negative} opacity="0.13" clipPath={`url(#${belowId})`} />
        <line x1={padL} x2={padL + chartW} y1={zeroY} y2={zeroY} stroke="#d2cec8" />
        <path d={linePath} fill="none" stroke="#1c1b19" strokeWidth="1.4" strokeOpacity="0.78" />

        {profile.crossings.map((crossing) => {
          if (crossing < profile.low || crossing > profile.high) return null;
          const x =
            padL + chartW * ((crossing - profile.low) / (profile.high - profile.low || 1));
          return (
            <line
              key={crossing}
              x1={x}
              x2={x}
              y1={padT}
              y2={padT + chartH}
              stroke={COLORS.zero}
              strokeDasharray="4 4"
              strokeOpacity="0.35"
            />
          );
        })}

        <line
          x1={spotX}
          x2={spotX}
          y1={padT - 5}
          y2={padT + chartH}
          stroke={COLORS.spot}
          strokeDasharray="3 4"
        />
        <text
          x={Math.min(Math.max(padL, spotX - 24), padL + chartW - 48)}
          y={padT - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={COLORS.spot}
          className="tnum"
        >
          现价
        </text>

        {nearestCrossing != null &&
          nearestCrossing >= profile.low &&
          nearestCrossing <= profile.high && (
            <text
              x={Math.min(
                Math.max(
                  padL,
                  padL +
                    chartW * ((nearestCrossing - profile.low) / (profile.high - profile.low || 1)) -
                    32,
                ),
                padL + chartW - 64,
              )}
              y={padT + chartH - 5}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={COLORS.zero}
              className="tnum"
            >
              零 Gamma {strikeLabel(nearestCrossing)}
            </text>
          )}

        {xTickIndexes.map((index) => {
          const first = index === 0;
          const last = index === count - 1;
          return (
            <text
              key={index}
              x={first ? padL : last ? padL + chartW : xAt(index)}
              y={height - 8}
              textAnchor={first ? "start" : last ? "end" : "middle"}
              fontSize="11"
              fill={COLORS.axis}
              className="tnum"
            >
              {strikeLabel(points[index].price)}
            </text>
          );
        })}

        <circle
          cx={spotX}
          cy={yAt(profile.current.net)}
          r="3"
          fill="#ffffff"
          stroke={COLORS.spot}
          strokeWidth="1.5"
        />

        {hovered && (
          <>
            <line
              x1={xAt(hover ?? 0)}
              x2={xAt(hover ?? 0)}
              y1={padT}
              y2={padT + chartH}
              stroke="#1c1b19"
              strokeOpacity="0.16"
            />
            <circle
              cx={xAt(hover ?? 0)}
              cy={yAt(hovered.net)}
              r="3"
              fill={hovered.net >= 0 ? COLORS.positive : COLORS.negative}
            />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[190px] rounded-xl border border-line bg-white/95 px-2.5 py-2 text-[12px] shadow-pop"
          style={{ left: Math.min(Math.max(8, xAt(hover ?? 0) - 95), width - 198) }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-text tnum">
              假设 ${strikeLabel(hovered.price)}
            </span>
            <span
              className={`tnum font-semibold ${hovered.net >= 0 ? "text-profit" : "text-loss"}`}
            >
              {gexLabel(hovered.net, { sign: true })}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-dim">
            <span>较现价</span>
            <span className="tnum text-text">
              {((hovered.price / profile.current.price - 1) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-dim">
            <span>看涨 / 看跌</span>
            <span className="tnum text-text">
              {gexLabel(hovered.call)} / {gexLabel(hovered.put)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
