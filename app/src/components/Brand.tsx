import { Link } from "react-router-dom";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="32 32 448 448"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M96 56H352L416 120V232L352 296H224V456H96V56ZM224 136H296L320 160V192L296 216H224V136Z"
      />
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
