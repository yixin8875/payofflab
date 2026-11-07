import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "./Brand";
import { Footer } from "./Footer";
import {
  Bars,
  Cap,
  Chain,
  ChartLine,
  Command,
  Grid,
  Help,
  More,
  Moon,
  Search,
  Target,
  Watchlist,
} from "./Icons";

const RAIL = [
  { href: "/calculator", label: "构建", icon: ChartLine, match: ["/calculator"] },
  { href: "/options-chain", label: "期权链", icon: Chain, match: ["/options-chain"] },
  { href: "/trades", label: "持仓", icon: Bars, match: ["/trades"] },
  { href: "/watchlist", label: "自选", icon: Watchlist, match: ["/watchlist"] },
  { href: "/tools/option-finder", label: "扫描", icon: Target, match: ["/tools/option-finder", "/scan"] },
  { href: "/tools", label: "工具", icon: Grid, match: ["/tools"] },
  { href: "/strategies", label: "学习", icon: Cap, match: ["/strategies", "/methodology"] },
];

const TABS = [
  { href: "/calculator", label: "构建", icon: ChartLine },
  { href: "/options-chain", label: "期权链", icon: Chain },
  { href: "/trades", label: "持仓", icon: Bars },
  { href: "/watchlist", label: "自选", icon: Watchlist },
  { href: "/tools", label: "更多", icon: More },
];

function isActive(pathname: string, item: { href: string; match?: string[] }) {
  if (item.href === "/tools") return pathname === "/tools" || (pathname.startsWith("/tools/") && !pathname.startsWith("/tools/option-finder"));
  return (item.match ?? [item.href]).some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function Rail() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="应用导航"
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--spacing-rail)] flex-col items-center border-r border-line bg-chrome pb-9 pt-3 lg:flex"
    >
      <Link
        to="/"
        aria-label="期权盈亏图 首页"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/12 text-accent ring-1 ring-inset ring-accent/25 transition-transform active:scale-95"
      >
        <BrandMark size={19} />
      </Link>
      <ul className="flex w-full flex-col items-center gap-1 px-2">
        {RAIL.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="w-full">
              <Link
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[10.5px] font-medium tracking-[0.01em] transition-colors duration-150 ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-dim hover:bg-hover hover:text-text"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 1.9 : 1.6} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex flex-col items-center gap-1">
        <button type="button" className="icon-btn h-9 w-9" aria-label="命令面板">
          <Command size={17} />
        </button>
        <button type="button" className="icon-btn h-9 w-9" aria-label="切换主题">
          <Moon size={17} />
        </button>
      </div>
    </nav>
  );
}

export function MobileTabBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="底部导航"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-stretch border-t border-line bg-chrome/95 pb-[var(--safe-bottom)] backdrop-blur-xl lg:hidden"
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            to={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              active ? "text-accent" : "text-dim"
            }`}
          >
            <Icon size={19} strokeWidth={active ? 1.9 : 1.6} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusBar({ ticker }: { ticker?: string }) {
  const quote = ticker ?? "SPY";
  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-30 hidden h-[var(--spacing-statusbar)] items-center gap-4 border-t border-line bg-chrome/90 px-3 text-[11.5px] text-dim backdrop-blur-md sm:flex lg:bottom-0 lg:left-[var(--spacing-rail)]">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-dim" />
        市场已收盘 · 2天7小时后开盘
      </span>
      <span className="hidden lg:inline">{quote} 行情 美东 4:14 PM · 参考价</span>
      <Link to="/methodology" className="tnum hidden hover:text-text lg:inline">
        Black-Scholes · r 4.02% · q 1.03%
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <button type="button" className="hidden items-center gap-1.5 hover:text-text lg:flex">
          <Command size={12} />K 命令
        </button>
        <button type="button" className="hidden items-center gap-1.5 hover:text-text lg:flex">
          <Help size={12} />快捷键
        </button>
        <span>非投资建议</span>
      </div>
    </div>
  );
}

export function MobileAppBar({ title, href = "/calculator" }: { title: string; href?: string }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-chrome/95 px-3 backdrop-blur-xl lg:hidden">
      <Link to={href} className="flex items-center gap-2">
        <BrandMark size={26} />
        <span className="text-[13.5px] font-semibold text-text">{title}</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className="icon-btn h-8 w-8" aria-label="搜索">
          <Search size={16} />
        </button>
        <button type="button" className="icon-btn h-8 w-8" aria-label="切换主题">
          <Moon size={16} />
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  title,
  statusTicker,
  showMobileBar = true,
  statusbar = true,
  footer = false,
}: {
  children: ReactNode;
  title: string;
  statusTicker?: string;
  showMobileBar?: boolean;
  statusbar?: boolean;
  footer?: boolean;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <Rail />
      <div className="min-h-screen lg:pl-[var(--spacing-rail)]">
        {showMobileBar && <MobileAppBar title={title} />}
        <main>{children}</main>
        {footer && <Footer />}
      </div>
      {statusbar && <StatusBar ticker={statusTicker} />}
      <MobileTabBar />
    </div>
  );
}
