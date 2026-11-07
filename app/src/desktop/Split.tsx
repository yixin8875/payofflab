import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ layout */

export function Split({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full">
      <aside className="flex w-[var(--list-w)] shrink-0 flex-col border-r border-line bg-[var(--list-bg)]">
        {list}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-chrome">{children}</section>
    </div>
  );
}

export function Workspace({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 w-full flex-col bg-[var(--list-bg)]">{children}</div>;
}

/* -------------------------------------------------------------- list pane */

export function ListPane({
  title,
  count,
  actions,
  children,
  footer,
}: {
  title: string;
  count?: number | string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line px-3">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">{title}</h2>
        {count !== undefined && <span className="tnum text-[11.5px] text-faint">{count}</span>}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
      <div className="scroll-pane flex-1">{children}</div>
      {footer}
    </>
  );
}

export function ListGroup({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="pb-1">
      <h3 className="flex items-baseline gap-1.5 px-3 pb-1 pt-3 text-[10.5px] font-semibold tracking-[0.02em] text-faint">
        {label}
        {count !== undefined && <span className="font-normal text-faint/80">{count}</span>}
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

export function ListRow({
  to,
  onSelect,
  selected,
  badge,
  title,
  subtitle,
  meta,
  trailing,
}: {
  to?: string;
  onSelect?: () => void;
  selected?: boolean;
  badge: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      {badge}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium leading-[17px] text-text">{title}</span>
        {subtitle && (
          <span className="block truncate text-[11px] leading-[15px] text-dim">{subtitle}</span>
        )}
      </span>
      {meta !== undefined && <span className="shrink-0 tnum text-[10.5px] text-faint">{meta}</span>}
      {trailing}
    </>
  );

  if (to) {
    return (
      <li>
        <Link to={to} className="list-row" data-selected={selected ? "true" : undefined}>
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="list-row"
        data-selected={selected ? "true" : undefined}
      >
        {body}
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ badge */

const TONES = [
  "bg-[#e7eef9] text-[#2e5f9e]",
  "bg-[#efe9f7] text-[#6a4a9e]",
  "bg-[#e5f1ec] text-[#2f6f57]",
  "bg-[#f7edda] text-[#8a6220]",
  "bg-[#f7e8e6] text-[#9c4a3e]",
  "bg-[#e9ecef] text-[#566068]",
  "bg-[#f2e9e2] text-[#7c5a41]",
  "bg-[#e8f0e4] text-[#4a6b38]",
];

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function Badge({
  label,
  seed,
  size = 28,
  rounded = "rounded-[7px]",
}: {
  label: string;
  seed?: string;
  size?: number;
  rounded?: string;
}) {
  const tone = TONES[hash(seed ?? label) % TONES.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.01em] ${tone} ${rounded}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {label.slice(0, 2)}
    </span>
  );
}

/* --------------------------------------------------------------- detail */

export function PaneHeader({
  title,
  subtitle,
  leading,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-line bg-chrome px-4">
      {leading}
      <div className="min-w-0">
        <h1 className="truncate text-[13.5px] font-semibold leading-[18px] tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="truncate text-[11px] leading-[14px] text-dim">{subtitle}</p>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function DetailScroll({
  children,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className="scroll-pane flex-1">
      <div
        className={`mx-auto w-full ${wide ? "max-w-none" : "max-w-[900px]"} px-7 py-6 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function EmptyDetail({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
      <EmptyIllustration />
      <h2 className="mt-7 text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-1.5 max-w-[320px] text-[12px] leading-[18px] text-dim">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyIllustration() {
  return (
    <svg width="220" height="176" viewBox="0 0 220 176" fill="none" aria-hidden="true">
      <g stroke="#e4e0d9" strokeWidth="1.3">
        <rect x="44" y="34" width="118" height="104" rx="9" transform="rotate(-7 103 86)" fill="#fbfaf8" />
        <rect x="58" y="26" width="118" height="104" rx="9" transform="rotate(4 117 78)" fill="#fdfcfb" />
      </g>
      <rect x="50" y="46" width="126" height="92" rx="8" fill="#ffffff" stroke="#e4e0d9" strokeWidth="1.3" />
      <g stroke="#eeebe5" strokeWidth="1">
        <path d="M60 118h106M60 96h106M60 74h106" strokeDasharray="2 5" />
        <path d="M78 56v72M104 56v72M130 56v72M156 56v72" strokeOpacity="0.55" />
      </g>
      <path
        d="M60 124h36c14 0 20-7 28-24 8-18 15-30 42-34"
        stroke="#cdc7be"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path d="M60 124h106" stroke="#d9d4cc" strokeWidth="1" />
      <circle cx="124" cy="100" r="2.6" fill="#d3cdc4" />
      <g stroke="#e4e0d9" strokeWidth="1.2" strokeLinecap="round">
        <path d="M188 38v8M184 42h8" />
        <path d="M30 96v6M27 99h6" />
        <path d="M178 148v6M175 151h6" />
      </g>
      <circle cx="172" cy="66" r="1.6" fill="#e0dbd3" />
      <circle cx="38" cy="58" r="1.6" fill="#e0dbd3" />
    </svg>
  );
}
