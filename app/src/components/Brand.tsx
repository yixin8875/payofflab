import { useId } from "react";
import { Link } from "react-router-dom";

export function BrandMark({ size = 32 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const tileId = `${uid}-tile`;
  const sheenId = `${uid}-sheen`;

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
          <stop stopColor="#9AD1FF" />
          <stop offset="0.55" stopColor="#69B4FB" />
          <stop offset="1" stopColor="#3F90EC" />
        </linearGradient>
        <radialGradient
          id={sheenId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(140 96) rotate(48) scale(360)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="118" fill={`url(#${tileId})`} />
      <rect x="8" y="8" width="496" height="496" rx="118" fill={`url(#${sheenId})`} />
      <rect
        x="9"
        y="9"
        width="494"
        height="494"
        rx="117"
        stroke="#FFFFFF"
        strokeOpacity="0.4"
        strokeWidth="3"
      />
      <path
        d="M104 352H236C254 352 264 346 272 332L396 136"
        stroke="#FFFFFF"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="236" cy="352" r="26" fill="#FFFFFF" />
      <circle cx="236" cy="352" r="10" fill="#4C9CF2" />
    </svg>
  );
}

export function Brand({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-2 ${className}`} aria-label="PayoffLab 首页">
      <BrandMark size={size} />
      <span className="text-[15.5px] font-semibold tracking-[-0.012em] text-text">PayoffLab</span>
    </Link>
  );
}
