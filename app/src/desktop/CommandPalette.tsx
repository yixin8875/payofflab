import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChartLine,
  ChevronRight,
  Grid,
  Search,
  Sigma,
  Target,
} from "../components/Icons";
import { OUTLOOK_ZH, STRATEGIES } from "../data/strategies";
import { TICKERS } from "../data/tickers";
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monogram } from "./Split";
import { NAV_FOOTER, NAV_GROUPS } from "./nav";

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  group: "页面" | "工具" | "策略" | "标的";
  to: string;
  icon?: typeof Grid;
  badge?: string;
};

const PAGE_ITEMS: PaletteItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_FOOTER].map((item) => ({
  id: `page:${item.href}`,
  label: item.label,
  group: "页面",
  to: item.href,
  icon: item.icon,
}));

const TOOL_ITEMS: PaletteItem[] = [
  { id: "tool:scan", label: "期权扫描", hint: "按观点扫描实时链", group: "工具", to: "/tools/option-finder", icon: Target },
  { id: "tool:bs", label: "Black-Scholes 计算器", hint: "理论价格与希腊值", group: "工具", to: "/tools/black-scholes", icon: Sigma },
  { id: "tool:greeks", label: "希腊值计算器", hint: "美元净敞口", group: "工具", to: "/tools/greeks-calculator", icon: ChartLine },
  { id: "tool:iv", label: "隐含波动率计算器", hint: "从价格反解 IV", group: "工具", to: "/tools/iv-calculator", icon: Sigma },
  { id: "tool:be", label: "盈亏平衡计算器", hint: "到期不赚不亏的价格", group: "工具", to: "/tools/breakeven-calculator", icon: ChartLine },
];

const STRATEGY_ITEMS: PaletteItem[] = STRATEGIES.map((s) => ({
  id: `strategy:${s.slug}`,
  label: s.name,
  hint: `${OUTLOOK_ZH[s.outlook]} · ${s.desc.slice(0, 22)}`,
  group: "策略",
  to: `/strategies/${s.slug}`,
  badge: s.name.slice(0, 2),
}));

const TICKER_ITEMS: PaletteItem[] = TICKERS.slice(0, 60).map((t) => ({
  id: `ticker:${t.symbol}`,
  label: t.symbol,
  hint: t.name,
  group: "标的",
  to: `/chain/${t.symbol.toLowerCase()}`,
  badge: t.symbol.slice(0, 2),
}));

const GROUP_ORDER: PaletteItem["group"][] = ["页面", "工具", "策略", "标的"];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? [...PAGE_ITEMS, ...TOOL_ITEMS, ...STRATEGY_ITEMS, ...TICKER_ITEMS]
      : [...PAGE_ITEMS, ...TOOL_ITEMS];
    if (!q) return pool;
    return pool
      .map((item) => {
        const haystack = `${item.label} ${item.hint ?? ""}`.toLowerCase();
        const at = haystack.indexOf(q);
        if (at < 0) return null;
        return { item, score: at };
      })
      .filter((entry): entry is { item: PaletteItem; score: number } => entry !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 30)
      .map((entry) => entry.item);
  }, [query]);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    navigate(item.to);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPopup
        showCloseButton={false}
        className="max-h-[460px] max-w-[620px] gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">全局搜索</DialogTitle>

        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b px-3.5">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                choose(results[active]);
              } else if (event.key === "Escape") {
                onClose();
              }
            }}
            placeholder="搜索页面、策略、标的或工具"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="搜索"
          />
          <Kbd className="shrink-0">Esc</Kbd>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="py-1.5">
            {results.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                没有匹配的结果
              </p>
            )}
            {GROUP_ORDER.map((group) => {
              const items = results.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <section key={group} className="pb-1">
                  <h3 className="px-3.5 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                    {group}
                  </h3>
                  <ul>
                    {items.map((item) => {
                      const index = results.indexOf(item);
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onMouseEnter={() => setActive(index)}
                            onClick={() => choose(item)}
                            data-selected={index === active ? "true" : undefined}
                            className="flex h-9 w-full cursor-pointer items-center gap-2.5 px-3.5 text-left transition-colors hover:bg-accent/60 data-[selected=true]:bg-accent"
                          >
                            {item.badge ? (
                              <Monogram label={item.badge} size={22} rounded="rounded-md" />
                            ) : Icon ? (
                              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Icon size={13} />
                              </span>
                            ) : (
                              <span className="h-[22px] w-[22px] shrink-0" />
                            )}
                            <span className="shrink-0 text-[13px] font-medium">{item.label}</span>
                            {item.hint && (
                              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                {item.hint}
                              </span>
                            )}
                            {index === active && (
                              <ChevronRight
                                size={13}
                                className="ml-auto shrink-0 text-muted-foreground"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex h-9 shrink-0 items-center gap-4 border-t bg-muted/40 px-3.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> 选择
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> 打开
          </span>
          <span className="ml-auto">输入以搜索全部内容</span>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
