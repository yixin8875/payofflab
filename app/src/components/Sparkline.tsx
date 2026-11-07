import { useId, useMemo } from "react";
import { payoffAt, type Leg } from "../lib/options";

type Props = {
  legs: Leg[];
  spot: number;
  width?: number;
  height?: number;
  className?: string;
  sample?: boolean;
  strokeColor?: string;
};

/** A tiny payoff sketch for strategy cards and the hero preview. */
export function Sparkline({ legs, spot, width = 140, height = 52, className, sample, strokeColor }: Props) {
  const clipId = useId();
  const { path, area, zeroY } = useMemo(() => {
    const strikes = legs.filter((l) => l.kind !== "stock").map((l) => l.strike);
    const lo0 = Math.min(spot, ...strikes);
    const hi0 = Math.max(spot, ...strikes);
    const span = hi0 - lo0;
    const pad = Math.max(span * 0.18, spot * 0.04);
    const lo = lo0 - pad;
    const hi = hi0 + pad;
    const n = 90;
    const values: { x: number; v: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const price = lo + ((hi - lo) * i) / n;
      values.push({ x: price, v: payoffAt(legs, price) });
    }
    let mn = Math.min(...values.map((d) => d.v), 0);
    let mx = Math.max(...values.map((d) => d.v), 0);
    if (mn === mx) mx = mn + 1;
    const padX = 2;
    const padY = 4;
    const px = (x: number) => padX + ((x - lo) / (hi - lo)) * (width - padX * 2);
    const py = (v: number) => padY + (1 - (v - mn) / (mx - mn)) * (height - padY * 2);
    const d = values.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)} ${py(p.v).toFixed(1)}`).join(" ");
    const zero = py(0);
    const shape = `${d} L${px(hi).toFixed(1)} ${zero.toFixed(1)} L${px(lo).toFixed(1)} ${zero.toFixed(1)} Z`;
    return { path: d, area: shape, zeroY: zero };
  }, [legs, spot, width, height]);

  const stroke = strokeColor ?? "#007558";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={area} />
        </clipPath>
      </defs>
      <line
        x1="2"
        x2={width - 2}
        y1={zeroY}
        y2={zeroY}
        stroke="#c9d0d9"
        strokeDasharray="2 3"
      />
      <rect
        x="0"
        y="0"
        width={width}
        height={Math.max(zeroY, 0)}
        fill="#007558"
        fillOpacity="0.12"
        clipPath={`url(#${clipId})`}
      />
      <rect
        x="0"
        y={zeroY}
        width={width}
        height={Math.max(height - zeroY, 0)}
        fill="#bc3722"
        fillOpacity="0.1"
        clipPath={`url(#${clipId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeOpacity={sample ? 0.5 : 0.8}
        strokeWidth="1.4"
      />
    </svg>
  );
}
