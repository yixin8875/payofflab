import { Link } from "react-router-dom";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-lg bg-accent/12 text-accent ring-1 ring-inset ring-accent/20"
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.round(size * 0.56)}
        height={Math.round(size * 0.56)}
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 2 L3 15 L17 15"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.85"
          strokeLinecap="round"
        />
        <path
          d="M3.5 12.5 L8 12.5 L15.5 4.25"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="12.5" r="1.05" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Brand({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-2 ${className}`} aria-label="期权盈亏图 首页">
      <BrandMark size={size} />
      <span className="text-[15.5px] font-semibold tracking-[-0.012em] text-text">期权盈亏图</span>
    </Link>
  );
}
