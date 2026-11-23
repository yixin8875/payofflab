import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Book,
  Calendar,
  Chain as ChainIcon,
  ChartLine,
  ChevronRight,
  Plus,
  Target,
} from "../components/Icons";
import { PayoffChart } from "../components/PayoffChart";
import { Sparkline } from "../components/Sparkline";
import {
  Monogram,
  DetailScroll,
  ListGroup,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import { OUTLOOK_ZH, STRATEGY_BY_SLUG } from "../data/strategies";
import { EXPIRIES, ticker } from "../data/tickers";
import { legsFor } from "../lib/presets";
import { useTrades } from "../lib/store";
import { buttonVariants } from "@/components/ui/button";

const SPY = ticker("SPY");
const EXPIRY = EXPIRIES[3];

const FEATURED = ["iron-condor", "covered-call", "long-straddle"];

const MARKET = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "AMD"];

const QUICK = [
  { to: "/calculator", title: "构建策略", body: "从一张空白盈亏图开始", icon: ChartLine },
  { to: "/chain", title: "浏览期权链", body: "热门标的的看涨与看跌", icon: ChainIcon },
  { to: "/tools/option-finder", title: "扫描交易", body: "按观点筛出候选结构", icon: Target },
  { to: "/strategies", title: "策略库", body: "41 篇指南，带盈亏图", icon: Book },
];

function dateLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "今天";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function Overview() {
  const trades = useTrades();
  const groups = useMemo(() => {
    const map = new Map<string, typeof trades>();
    for (const trade of trades.slice(0, 6)) {
      const label = dayLabel(trade.savedAt);
      const list = map.get(label) ?? [];
      list.push(trade);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [trades]);

  const lead = STRATEGY_BY_SLUG[FEATURED[0]];
  const leadLegs = lead ? legsFor(lead.preset ?? "iron-condor", SPY, EXPIRY.iso) : [];

  return (
    <Split
      list={
        <ListPane
          title="最近"
          count={trades.length}
          actions={
            <Link to="/calculator" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} title="新建策略" aria-label="新建策略">
              <Plus size={15} />
            </Link>
          }
        >
          {trades.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border bg-card shadow-xs/5 text-muted-foreground">
                <Plus size={16} />
              </span>
              <p className="mt-3 text-[12px] text-muted-foreground">还没有持仓</p>
              <p className="mx-auto mt-1 max-w-[190px] text-[11px] leading-4 text-muted-foreground">
                在构建器里搭好一笔持仓，保存后会按真实行情跟踪盈亏。
              </p>
              <Link to="/calculator" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}>
                打开构建器
              </Link>
            </div>
          ) : (
            groups.map(([label, list]) => (
              <ListGroup key={label} label={label} count={list.length}>
                {list.map((trade) => (
                  <ListRow
                    key={trade.id}
                    to={`/trades/${trade.id}`}
                    badge={<Monogram label={trade.symbol.slice(0, 2)} seed={trade.symbol} />}
                    title={trade.name}
                    subtitle={`${trade.symbol} · ${trade.legs.filter((leg) => leg.qty > 0).length} 条腿`}
                    meta={dayLabel(trade.savedAt)}
                  />
                ))}
              </ListGroup>
            ))
          )}
          <div className="mx-3 mt-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
            持仓与平仓记录只留在本机，不会同步到任何账户。
          </div>
        </ListPane>
      }
    >
      <PaneHeader title="概览" subtitle={dateLabel()}>
        <Link to="/calculator" className={buttonVariants({ size: "default" })}>
          <Plus size={12} />
          新建策略
        </Link>
      </PaneHeader>

      <DetailScroll wide>
        <div className="mx-auto max-w-[980px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-semibold leading-7">交易台</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">先看市场结构，再决定今天做不做交易。</p>
            </div>
            <div className="hidden items-center gap-1.5 text-[13px] text-muted-foreground md:flex">
              <Calendar size={12} />
              延迟行情 · 上一交易时段
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-start gap-3 rounded-2xl border bg-card shadow-xs/5 p-4 transition-colors hover:border-input"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      index === 0 ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium group-hover:text-brand">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-4 text-muted-foreground">{item.body}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold">精选策略</h2>
              <Link
                to="/strategies"
                className="flex items-center gap-0.5 text-[13px] text-muted-foreground hover:text-foreground"
              >
                全部 {Object.keys(STRATEGY_BY_SLUG).length} 篇指南
                <ChevronRight size={12} className="text-muted-foreground" />
              </Link>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              {lead && (
                <Link
                  to={`/strategies/${FEATURED[0]}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs/5 transition-colors hover:border-input"
                >
                  <div className="flex items-start justify-between gap-4 px-4 pt-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium group-hover:text-brand">{lead.name}</p>
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {OUTLOOK_ZH[lead.outlook]} · {lead.desc}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pt-0.5 text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-0.5 w-3 rounded bg-brand" />
                        今日
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-0.5 w-3 rounded bg-loss" />
                        到期
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 min-w-0 flex-1 px-1 pb-1">
                    <PayoffChart
                      legs={leadLegs}
                      spot={SPY.spot}
                      iv={SPY.iv}
                      dte={EXPIRY.dte}
                      expiryLabel={EXPIRY.label}
                      mode="pnl"
                      envelope={0}
                      height={230}
                      interactive={false}
                    />
                  </div>
                </Link>
              )}
              <div className="grid gap-3 xl:grid-rows-2">
                {FEATURED.slice(1).map((slug) => {
                  const s = STRATEGY_BY_SLUG[slug];
                  if (!s) return null;
                  const legs = legsFor(s.preset ?? "iron-condor", SPY, EXPIRY.iso);
                  return (
                    <Link
                      key={slug}
                      to={`/strategies/${slug}`}
                      className="group flex items-center gap-3 rounded-2xl border bg-card shadow-xs/5 px-4 py-3 transition-colors hover:border-input"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium group-hover:text-brand">
                          {s.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                          {OUTLOOK_ZH[s.outlook]} · {s.desc}
                        </span>
                      </span>
                      <Sparkline
                        legs={legs}
                        spot={SPY.spot}
                        width={92}
                        height={44}
                        muted
                        className="shrink-0"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold">市场</h2>
              <Link
                to="/chain"
                className="flex items-center gap-0.5 text-[13px] text-muted-foreground hover:text-foreground"
              >
                打开期权链
                <ChevronRight size={12} className="text-muted-foreground" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
              <div className="grid grid-cols-[minmax(0,1fr)_100px_90px_70px] gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-[12px] font-medium text-muted-foreground">
                <span>标的</span>
                <span className="text-right">现价</span>
                <span className="text-right">今日</span>
                <span className="text-right">IV 排名</span>
              </div>
              {MARKET.map((symbol) => {
                const t = ticker(symbol);
                return (
                  <Link
                    key={symbol}
                    to={`/chain/${symbol.toLowerCase()}`}
                    className="grid grid-cols-[minmax(0,1fr)_100px_90px_70px] items-center gap-2 border-b border-border/60 px-4 py-2.5 text-[14px] last:border-0 hover:bg-accent"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Monogram label={symbol.slice(0, 2)} seed={symbol} size={22} rounded="rounded-[6px]" />
                      <span className="font-medium">{symbol}</span>
                      <span className="truncate text-[13px] text-muted-foreground">{t.name}</span>
                    </span>
                    <span className="text-right tnum">${t.spot.toFixed(2)}</span>
                    <span className={`text-right tnum ${t.change >= 0 ? "text-profit" : "text-loss"}`}>
                      {t.change >= 0 ? "+" : "−"}
                      {Math.abs(t.changePct * 100).toFixed(2)}%
                    </span>
                    <span className="text-right tnum text-muted-foreground">{t.ivRank}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <p className="mt-6 text-[12px] leading-4 text-muted-foreground">
            行情为延迟数据，期权价格由 Black-Scholes 合成，仅供情景分析。所有计算都在本机完成。
          </p>
        </div>
      </DetailScroll>
    </Split>
  );
}
