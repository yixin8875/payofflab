import {
  Bars,
  Book,
  Chain,
  ChartLine,
  Grid,
  History,
  Home,
  Info,
  Settings as SettingsIcon,
  Sigma,
  Star,
  Target,
} from "../components/Icons";

export const VERSION = "1.4.0";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "工作台",
    items: [
      { href: "/", label: "概览", icon: Home },
      { href: "/calculator", label: "构建器", icon: ChartLine },
      { href: "/scenario", label: "情景分析", icon: Sigma },
    ],
  },
  {
    label: "市场",
    items: [
      { href: "/chain", label: "期权链", icon: Chain },
      { href: "/tools/option-finder", label: "扫描器", icon: Target },
    ],
  },
  {
    label: "资料库",
    items: [
      { href: "/strategies", label: "策略库", icon: Book },
      { href: "/watchlist", label: "自选", icon: Star },
      { href: "/trades", label: "持仓", icon: Bars },
    ],
  },
  {
    label: "参考",
    items: [
      { href: "/tools", label: "工具箱", icon: Grid },
      { href: "/methodology", label: "方法与假设", icon: Info },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [
  { href: "/settings", label: "设置", icon: SettingsIcon },
  { href: "/changelog", label: "更新日志", icon: History },
];

export function isNavActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  if (item.href === "/tools") {
    return pathname === "/tools" || (pathname.startsWith("/tools/") && pathname !== "/tools/option-finder");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
