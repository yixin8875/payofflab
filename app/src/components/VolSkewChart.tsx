import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { pct, price } from "../lib/format";
import type { VolPoint } from "../lib/vol";

const COLORS = {
  line: "#0364d3",
  spot: "#6f6a63",
  call: "#0b7a52",
  put: "#bf3b2b",
  grid: "#eeebe5",
  axis: "#767169",
};

export function VolSkewChart({
  points,
  spot,
  atmStrike,
  height = 280,
}: {
  points: VolPoint[];
  spot: number;
  atmStrike: number | null;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(680);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.max(300, entries[0]?.contentRect.width ?? 680));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    const ivs = points.map((point) => point.iv).filter((value) => value > 0);
    const strikes = points.map((point) => point.strike);
    if (!ivs.length || !strikes.length) {
      return { xLo: 0, xHi: 1, yLo: 0, yHi: 1 };
    }
    const xLo = Math.min(...strikes, spot) * 0.99;
    const xHi = Math.max(...strikes, spot) * 1.01;
    const min = Math.min(...ivs);
    const max = Math.max(...ivs);
    const span = Math.max(max - min, 0.02);
    return {
      xLo,
      xHi: xHi > xLo ? xHi : xLo + 1,
      yLo: Math.max(0, min - span * 0.18),
      yHi: max + span * 0.18,
    };
  }, [points, spot]);

  const padL = 8;
  const padR = 46;
  const padT = 22;
  const padB = 28;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(120, height - padT - padB);

  const xAt = (strike: number) =>
    padL +
    ((strike - bounds.xLo) / (bounds.xHi - bounds.xLo)) * chartW;
  const yAt = (iv: number) =>
    padT + (1 - (iv - bounds.yLo) / (bounds.yHi - bounds.yLo)) * chartH;

  const yTicks = Array.from(
    { length: 5 },
    (_, index) => bounds.yLo + ((bounds.yHi - bounds.yLo) * index) / 4,
  );
  const xTicks = Array.from(
    { length: 5 },
    (_, index) => bounds.xLo + ((bounds.xHi - bounds.xLo) * index) / 4,
  );

  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${xAt(point.strike).toFixed(1)} ${yAt(point.iv).toFixed(1)}`,
    )
    .join(" ");

  const furthest = (kind: "call" | "put") => {
    let best: VolPoint | null = null;
    let distance = Infinity;
    for (const point of points) {
      if (point.kind !== kind) continue;
      const next = Math.abs(Math.abs(point.delta) - 0.25);
      if (next < distance) {
        best = point;
        distance = next;
      }
    }
    return best;
  };

  const call25 = furthest("call");
  const put25 = furthest("put");
  const spotX = xAt(spot);
  const atmX = atmStrike != null ? xAt(atmStrike) : null;

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let best = 0;
    let distance = Infinity;
    for (let index = 0; index < points.length; index += 1) {
      const next = Math.abs(xAt(points[index].strike) - x);
      if (next < distance) {
        best = index;
        distance = next;
      }
    }
    setHover(best);
  };

  const hovered = hover != null ? points[hover] : null;
  const formatStrike = (strike: number) => price(strike, strike < 100 ? 1 : 0);

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="单到期日看跌与看涨隐含波动率微笑曲线"
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
              {pct(value, 1)}
            </text>
          </g>
        ))}

        {xTicks.map((strike) => (
          <text
            key={strike}
            x={xAt(strike)}
            y={height - 9}
            textAnchor="middle"
            fontSize="11"
            fill={COLORS.axis}
            className="tnum"
          >
            {formatStrike(strike)}
          </text>
        ))}

        <line
          x1={spotX}
          x2={spotX}
          y1={padT - 4}
          y2={padT + chartH}
          stroke={COLORS.spot}
          strokeDasharray="3 4"
        />
        <text
          x={Math.min(Math.max(padL, spotX - 24), padL + chartW - 48)}
          y={padT - 7}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={COLORS.spot}
          className="tnum"
        >
          现价 {formatStrike(spot)}
        </text>

        {atmX != null && Math.abs(atmX - spotX) > 3 && (
          <line
            x1={atmX}
            x2={atmX}
            y1={padT - 4}
            y2={padT + chartH}
            stroke="#b8b2aa"
            strokeDasharray="2 4"
          />
        )}

        <path
          d={line}
          fill="none"
          stroke={COLORS.line}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <circle
            key={point.strike}
            cx={xAt(point.strike)}
            cy={yAt(point.iv)}
            r={2.2}
            fill="#fff"
            stroke={COLORS.line}
            strokeWidth={1.4}
          />
        ))}

        {[
          { point: call25, color: COLORS.call, label: "25Δ C" },
          { point: put25, color: COLORS.put, label: "25Δ P" },
        ].map(({ point, color, label }) =>
          point ? (
            <g key={label}>
              <circle
                cx={xAt(point.strike)}
                cy={yAt(point.iv)}
                r={4.5}
                fill="#fff"
                stroke={color}
                strokeWidth={2}
              />
              <text
                x={xAt(point.strike)}
                y={yAt(point.iv) - 9}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="650"
                fill={color}
                className="tnum"
              >
                {label}
              </text>
            </g>
          ) : null,
        )}

        {hovered && (
          <line
            x1={xAt(hovered.strike)}
            x2={xAt(hovered.strike)}
            y1={padT}
            y2={padT + chartH}
            stroke="#1c1b19"
            strokeOpacity="0.14"
          />
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[156px] rounded-xl border border-line bg-white/95 px-2.5 py-2 text-[12px] shadow-pop"
          style={{
            left: Math.min(
              Math.max(8, xAt(hovered.strike) - 78),
              width - 164,
            ),
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-text tnum">
              {formatStrike(hovered.strike)}
            </span>
            <span className="tnum text-faint">
              {hovered.kind === "call" ? "Call" : "Put"}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-dim">
            <span>IV</span>
            <span className="tnum text-text">{pct(hovered.iv, 1)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-dim">
            <span>Delta</span>
            <span className="tnum text-text">{hovered.delta.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
