import { useEffect, useMemo, useRef, useState } from "react";
import { gexAxisLabel, gexLabel, type GexExpiryRow } from "../lib/gex";

const COLORS = {
  positive: "#059669",
  negative: "#dc2626",
  grid: "#f0f0f0",
  axis: "#737373",
};

const MAX_BARS = 16;

/** Net GEX by expiry: where along the curve the gamma actually sits. */
export function GexTermChart({
  rows,
  height = 150,
}: {
  rows: GexExpiryRow[];
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(520);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.max(280, entries[0]?.contentRect.width ?? 520));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shown = useMemo(() => rows.slice(0, MAX_BARS), [rows]);
  const bounds = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const row of shown) {
      if (row.net < min) min = row.net;
      if (row.net > max) max = row.net;
    }
    const span = Math.max(Math.abs(min), Math.abs(max), 1);
    return {
      lo: min < 0 ? min - span * 0.1 : -span * 0.05,
      hi: max > 0 ? max + span * 0.1 : span * 0.05,
    };
  }, [shown]);

  if (!shown.length) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-[12px] text-muted-foreground">
        当前筛选下没有可用的到期日数据。
      </div>
    );
  }

  const padL = 4;
  const padR = 52;
  const padT = 14;
  const padB = 26;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(80, height - padT - padB);
  const count = shown.length;
  const step = chartW / count;
  const barWidth = Math.max(4, Math.min(26, step * 0.58));

  const yAt = (value: number) =>
    padT + (1 - (value - bounds.lo) / (bounds.hi - bounds.lo)) * chartH;
  const zeroY = yAt(0);
  // Keep date labels from colliding on narrow panels.
  const labelEvery = Math.max(1, Math.ceil((count * 56) / chartW));

  const yTicks = Array.from(
    { length: 3 },
    (_, index) => bounds.lo + ((bounds.hi - bounds.lo) * index) / 2,
  );

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="按到期日的净 Gamma 期限结构"
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

        {shown.map((row, index) => {
          const x = padL + step * (index + 0.5);
          const top = Math.min(zeroY, yAt(row.net));
          const barHeight = Math.max(1, Math.abs(yAt(row.net) - zeroY));
          return (
            <g key={row.iso}>
              <rect
                x={x - barWidth / 2}
                y={top}
                width={barWidth}
                height={barHeight}
                rx={barWidth > 4 ? 1.5 : 0}
                fill={row.net >= 0 ? COLORS.positive : COLORS.negative}
                opacity="0.85"
              >
                <title>
                  {row.label} · {row.dte} 天 · 净 {gexLabel(row.net, { sign: true })}
                </title>
              </rect>
              {index % labelEvery === 0 && (
                <text
                  x={x}
                  y={height - 9}
                  textAnchor="middle"
                  fontSize="11"
                  fill={COLORS.axis}
                  className="tnum"
                >
                  {row.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
