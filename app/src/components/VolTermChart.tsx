import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { pct } from "../lib/format";
import { volPoints, type VolExpiry } from "../lib/vol";

const COLORS = {
  atm: "#0364d3",
  call: "#0b7a52",
  put: "#bf3b2b",
  grid: "#eeebe5",
  axis: "#767169",
};

const SERIES = [
  { key: "atm", label: "ATM", color: COLORS.atm },
  { key: "call25", label: "25Δ Call", color: COLORS.call },
  { key: "put25", label: "25Δ Put", color: COLORS.put },
] as const;

export function VolTermChart({
  rows,
  height = 300,
}: {
  rows: VolExpiry[];
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
    const values = rows.flatMap((row) =>
      SERIES.map((series) => row[series.key]).filter(
        (value): value is number => value != null && Number.isFinite(value),
      ),
    );
    if (!values.length) return { lo: 0, hi: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 0.02);
    return { lo: Math.max(0, min - span * 0.18), hi: max + span * 0.18 };
  }, [rows]);

  const padL = 8;
  const padR = 46;
  const padT = 18;
  const padB = 28;
  const chartW = Math.max(120, width - padL - padR);
  const chartH = Math.max(120, height - padT - padB);
  const count = Math.max(1, rows.length);
  const step = count > 1 ? chartW / (count - 1) : 0;

  const xAt = (index: number) =>
    count === 1 ? padL + chartW / 2 : padL + index * step;
  const yAt = (value: number) =>
    padT + (1 - (value - bounds.lo) / (bounds.hi - bounds.lo)) * chartH;

  const yTicks = Array.from(
    { length: 5 },
    (_, index) => bounds.lo + ((bounds.hi - bounds.lo) * index) / 4,
  );

  const xTickIndexes = useMemo(() => {
    const wanted = Math.min(6, rows.length);
    if (wanted <= 1) return rows.length ? [0] : [];
    const indexes = new Set<number>();
    for (let index = 0; index < wanted; index += 1) {
      indexes.add(Math.round((index * (rows.length - 1)) / (wanted - 1)));
    }
    return [...indexes].sort((a, b) => a - b);
  }, [rows.length]);

  const pathFor = (key: (typeof SERIES)[number]["key"]) => {
    let path = "";
    let open = false;
    rows.forEach((row, index) => {
      const value = row[key];
      if (value == null || !Number.isFinite(value)) {
        open = false;
        return;
      }
      const x = xAt(index).toFixed(1);
      const y = yAt(value).toFixed(1);
      path += `${open ? " L" : " M"}${x} ${y}`;
      open = true;
    });
    return path.trim();
  };

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!rows.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - padL;
    const index =
      count === 1 ? 0 : Math.round(Math.min(chartW, Math.max(0, x)) / step);
    setHover(Math.max(0, Math.min(rows.length - 1, index)));
  };

  const hovered = hover != null ? rows[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="各到期日的 ATM 与 25 Delta 隐含波动率期限结构"
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

        {SERIES.map((series) => (
          <path
            key={series.key}
            d={pathFor(series.key)}
            fill="none"
            stroke={series.color}
            strokeWidth={series.key === "atm" ? 2.4 : 1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {rows.map((row, index) =>
          SERIES.map((series) => {
            const value = row[series.key];
            if (value == null) return null;
            return (
              <circle
                key={`${row.iso}:${series.key}`}
                cx={xAt(index)}
                cy={yAt(value)}
                r={series.key === "atm" ? 2.8 : 2.2}
                fill="#fff"
                stroke={series.color}
                strokeWidth={1.5}
              />
            );
          }),
        )}

        {xTickIndexes.map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 9}
            textAnchor="middle"
            fontSize="11"
            fill={COLORS.axis}
            className="tnum"
          >
            {rows[index].dte === 0 ? "0DTE" : `${rows[index].dte}d`}
          </text>
        ))}

        {hover != null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={padT}
            y2={padT + chartH}
            stroke="#1c1b19"
            strokeOpacity="0.14"
          />
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[196px] rounded-xl border border-line bg-white/95 px-2.5 py-2 text-[12px] shadow-pop"
          style={{ left: Math.min(Math.max(8, xAt(hover ?? 0) - 98), width - 204) }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-text">{hovered.label}</span>
            <span className="tnum text-faint">{hovered.dte} 天</span>
          </div>
          {SERIES.map((series) => (
            <div
              key={series.key}
              className="mt-1 flex items-center justify-between gap-2 text-dim"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-0 w-3 border-t"
                  style={{ borderColor: series.color }}
                />
                {series.label}
              </span>
              <span className="tnum text-text">
                {hovered[series.key] != null ? pct(hovered[series.key] ?? 0, 1) : "—"}
              </span>
            </div>
          ))}
          <div className="mt-1 border-t border-line-subtle pt-1 text-[11px] text-faint tnum">
            25Δ RR {hovered.rr != null ? volPoints(hovered.rr) : "—"}
          </div>
        </div>
      )}
    </div>
  );
}
