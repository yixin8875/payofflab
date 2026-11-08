import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Book, Calendar, Chain as ChainIcon, ChartLine, Plus, Target } from "../components/Icons";
import { Sparkline } from "../components/Sparkline";
import {
  Badge,
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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
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

  return (
    <Split
      list={
        <ListPane
          title="最近"
          count={trades.length}
          actions={
            <Link to="/calculator" className="icon-btn h-7 w-7" title="新建策略" aria-label="新建策略">
              <Plus size={15} />
            </Link>
          }
        >
          {trades.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-faint">
                <Plus size={16} />
              </span>
              <p className="mt-3 text-[11.5px] text-dim">还没有持仓</p>
              <p className="mx-auto mt-1 max-w-[190px] text-[10.5px] leading-4 text-faint">
                在构建器里搭好一笔持仓，保存后会按真实行情跟踪盈亏。
              </p>
              <Link to="/calculator" className="btn-secondary mt-3 h-7 px-2.5">
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
                    badge={<Badge label={trade.symbol.slice(0, 2)} seed={trade.symbol} />}
                    title={trade.name}
                    subtitle={`${trade.symbol} · ${trade.legs.filter((leg) => leg.qty > 0).length} 条腿`}
                    meta={dayLabel(trade.savedAt)}
                  />
                ))}
              </ListGroup>
            ))
          )}
          <div className="mx-3 mt-2 rounded-md border border-line-subtle bg-white/60 px-2.5 py-2 text-[10.5px] leading-4 text-faint">
            持仓与平仓记录只留在本机，不会同步到任何账户。
          </div>
        </ListPane>
      }
    >
      <PaneHeader title="概览" subtitle={`${dateLabel()} · 欢迎回来`}>
        <Link to="/calculator" className="btn-primary h-7 px-2.5">
          <Plus size={12} />
          新建策略
        </Link>
      </PaneHeader>

      <DetailScroll wide>
        <div className="mx-auto max-w-[980px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[21px] font-semibold leading-7 tracking-[-0.025em]">{greeting()}</h2>
              <p className="mt-1 text-[12.5px] text-dim">用一笔策略开始，或者接着上次的工作。</p>
            </div>
            <div className="hidden items-center gap-1.5 text-[11px] text-faint md:flex">
              <Calendar size={12} />
              延迟行情 · 上一交易时段
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-start gap-2.5 rounded-lg border border-line bg-white p-3 transition-colors hover:border-line-strong"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium group-hover:text-accent">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-dim">{item.body}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <section className="mt-7">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[12.5px] font-semibold">精选策略</h2>
              <Link to="/strategies" className="text-[11px] text-accent hover:text-accent-hover">
                全部 {Object.keys(STRATEGY_BY_SLUG).length} 篇指南
              </Link>
            </div>
            <div className="grid gap-2.5 md:grid-cols-3">
              {FEATURED.map((slug) => {
                const s = STRATEGY_BY_SLUG[slug];
                if (!s) return null;
                const legs = legsFor(s.preset ?? "iron-condor", SPY, EXPIRY.iso);
                return (
                  <Link
                    key={slug}
                    to={`/strategies/${slug}`}
                    className="group overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-line-strong"
                  >
                    <div className="border-b border-line-subtle bg-[#fbfaf8] px-3 py-2">
                      <Sparkline legs={legs} spot={SPY.spot} width={260} height={38} className="w-full" />
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[12.5px] font-medium group-hover:text-accent">{s.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-dim">
                        {OUTLOOK_ZH[s.outlook]} · {s.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-7">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[12.5px] font-semibold">市场</h2>
              <Link to="/chain" className="text-[11px] text-accent hover:text-accent-hover">
                打开期权链
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="grid grid-cols-[minmax(0,1fr)_100px_90px_70px] gap-2 border-b border-line-subtle bg-[#fbfaf8] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-faint">
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
                    className="grid grid-cols-[minmax(0,1fr)_100px_90px_70px] items-center gap-2 border-b border-line-subtle px-3 py-2 text-[12px] last:border-0 hover:bg-hover"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge label={symbol.slice(0, 2)} seed={symbol} size={22} rounded="rounded-[6px]" />
                      <span className="font-medium">{symbol}</span>
                      <span className="truncate text-[11px] text-dim">{t.name}</span>
                    </span>
                    <span className="text-right tnum">${t.spot.toFixed(2)}</span>
                    <span className={`text-right tnum ${t.change >= 0 ? "text-profit" : "text-loss"}`}>
                      {t.change >= 0 ? "+" : "−"}
                      {Math.abs(t.changePct * 100).toFixed(2)}%
                    </span>
                    <span className="text-right tnum text-dim">{t.ivRank}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <p className="mt-6 text-[10.5px] leading-4 text-faint">
            行情为延迟数据，期权价格由 Black-Scholes 合成，仅供情景分析。所有计算都在本机完成。
          </p>
        </div>
      </DetailScroll>
    </Split>
  );
}
