import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (props: P) => {
  const { size = 16, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
};

export const ArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h13" />
    <path d="m12.5 6.5 6 5.5-6 5.5" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 9 7 7 7-7" />
  </svg>
);

export const ChevronUp = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 15 7-7 7 7" />
  </svg>
);

export const Plus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const X = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
  </svg>
);

export const Search = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const Star = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z" />
  </svg>
);

export const Bookmark = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 3.75h11a.75.75 0 0 1 .75.75v16.3l-6.25-3.6-6.25 3.6V4.5a.75.75 0 0 1 .75-.75Z" />
  </svg>
);

export const Share = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M5 13v6.25c0 .4.35.75.75.75h12.5c.4 0 .75-.35.75-.75V13" />
  </svg>
);

export const More = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const Calendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.75" y="5.25" width="16.5" height="15" rx="2" />
    <path d="M3.75 9.5h16.5M8 3.5v3.5M16 3.5v3.5" />
  </svg>
);

export const ChartLine = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 4v16.5H21" />
    <path d="m4.5 15 5-5 3 2.5 6-7" />
  </svg>
);

export const Chain = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M9.5 9.5v10M15 9.5v10" />
  </svg>
);

export const Bars = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20V9M9.3 20V4.5M14.7 20v-7M20 20v-11" />
  </svg>
);

export const Watchlist = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.8l5.9-.9z" />
  </svg>
);

export const Target = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const Grid = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="7" height="7" rx="1.4" />
    <rect x="13" y="4" width="7" height="7" rx="1.4" />
    <rect x="4" y="13" width="7" height="7" rx="1.4" />
    <rect x="13" y="13" width="7" height="7" rx="1.4" />
  </svg>
);

export const Cap = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
    <path d="M7 11.6V16c0 1.2 2.2 2.6 5 2.6s5-1.4 5-2.6v-4.4" />
  </svg>
);

export const Undo = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9h9.5a5.5 5.5 0 0 1 0 11H9" />
    <path d="m8 5-4 4 4 4" />
  </svg>
);

export const Command = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6.5a2.5 2.5 0 1 0-2.5 2.5H9V6.5Zm0 0V9m0 0v6m0 0v2.5A2.5 2.5 0 1 1 6.5 15H9Zm6-8.5A2.5 2.5 0 1 1 17.5 9H15V6.5Zm0 0V9m0 0v6m0 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15Z" />
  </svg>
);

export const Help = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.6.4-1.2.9-1.2 1.7v.3" />
    <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const Sun = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
  </svg>
);

export const Moon = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />
  </svg>
);

export const TrendUp = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 16 5-5 3.5 3 6.5-7" />
    <path d="M14.5 7H19v4.5" />
  </svg>
);

export const TrendDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 8 5 5 3.5-3 6.5 7" />
    <path d="M14.5 17H19v-4.5" />
  </svg>
);

export const ArrowsOut = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h7M13 12h7" />
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4" />
  </svg>
);

export const Repeat = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5A5.5 5.5 0 0 1 9.5 4H18" />
    <path d="m15 1.8 3 2.2-3 2.2" />
    <path d="M20 14.5A5.5 5.5 0 0 1 14.5 20H6" />
    <path d="m9 22.2-3-2.2 3-2.2" />
  </svg>
);

export const Sigma = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 5H8l5.5 7L8 19h9" />
  </svg>
);

export const Info = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8.2" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const Lock = (p: P) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
);

export const Bolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 3 5.5 13.5H11L10 21l8-11h-5.5L13 3Z" />
  </svg>
);

export const Filter = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const Book = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
    <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
  </svg>
);

export const Download = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 19.5h14" />
  </svg>
);
