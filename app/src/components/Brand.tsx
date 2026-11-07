import { useId } from "react";
import { Link } from "react-router-dom";

export function BrandMark({ size = 32 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const tileId = `${uid}-tile`;
  const sheenId = `${uid}-sheen`;
  const curveId = `${uid}-curve`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={tileId} x1="72" y1="24" x2="440" y2="488" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B6BDB" />
          <stop offset="0.52" stopColor="#0458BE" />
          <stop offset="1" stopColor="#023E89" />
        </linearGradient>
        <radialGradient
          id={sheenId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(136 92) rotate(48) scale(372)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9CC8FF" stopOpacity="0.38" />
          <stop offset="1" stopColor="#9CC8FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={curveId}
          x1="116"
          y1="356"
          x2="404"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFF6E6" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="120" fill={`url(#${tileId})`} />
      <rect x="8" y="8" width="496" height="496" rx="120" fill={`url(#${sheenId})`} />
      <rect
        x="9"
        y="9"
        width="494"
        height="494"
        rx="119"
        stroke="#FFFFFF"
        strokeOpacity="0.16"
        strokeWidth="2"
      />
      <path
        d="M104 352H236C254 352 264 346 272 332L396 136"
        stroke={`url(#${curveId})`}
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="236" cy="352" r="24" fill="#FFD27A" />
      <circle cx="236" cy="352" r="9" fill="#0A54B2" />
    </svg>
  );
}

export function Brand({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-2 ${className}`} aria-label="权图首页">
      <BrandMark size={size} />
      <span className="text-[15.5px] font-semibold tracking-[-0.012em] text-text">权图</span>
    </Link>
  );
}
