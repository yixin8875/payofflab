import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Sparkline } from "../components/Sparkline";
import { ArrowRight, Search, X } from "../components/Icons";
import {
  CATEGORY_ORDER,
  CATEGORY_ZH,
  LEVEL_ZH,
  MOST_SEARCHED,
  OUTLOOK_ZH,
  RISK_ZH,
  STARTER_ORDER,
  STRATEGIES,
  STRATEGY_BY_SLUG,
  type Strategy,
} from "../data/strategies";
import { legsFor } from "../lib/presets";
import { EXPIRIES, ticker } from "../data/tickers";

const SPY = ticker("SPY");
const EXPIRY = EXPIRIES[3];

const SHAPE_PRESET: Record<Strategy["shape"], string> = {
  rise: "long-call",
  fall: "long-put",
  range: "iron-condor",
  vol: "long-straddle",
  butterfly: "butterfly",
  income: "covered-call",
};

const STARTER_LINES: Record<string, string> = {
  "long-call": "押注标的上涨，最多只赔掉已经付出的权利金。",
  "covered-call": "用手里已有的股票收一笔权利金，代价是上涨收益封顶。",
  "cash-secured-put": "备好买入所需的现金，同时先收一笔权利金。",
  "bull-call-spread": "比单买看涨更便宜地押注上涨，代价是收益封顶。",
  "iron-condor": "只要价格留在区间里，就能安稳收下这笔权利金。",
};

function legsForStrategy(s: Strategy) {
  return legsFor(s.preset ?? SHAPE_PRESET[s.shape], SPY, EXPIRY.iso);
}

function StrategyCard({ s }: { s: Strategy }) {
  const legs = useMemo(() => legsForStrategy(s), [s]);
  return (
    <div className="group relative flex h-full min-h-[236px] flex-col rounded-xl border border-line bg-panel p-4 transition-colors duration-150 hover:border-line-strong">
      <Link to={`/strategies/${s.slug}`} className="block">
        <span className="block rounded-md bg-sunken px-2 py-1.5">
          <Sparkline legs={legs} spot={SPY.spot} width={288} height={52} className="w-full" />
        </span>
        <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.01em] text-text transition-colors group-hover:text-accent">
          {s.name}
        </h3>
        <p className="mt-1.5 text-[12px] text-dim">
          <span
            className={
              s.outlook === "bullish"
                ? "text-profit"
                : s.outlook === "bearish"
                  ? "text-loss"
                  : s.outlook === "neutral"
                    ? "text-neutral"
                    : "text-accent"
            }
          >
            {OUTLOOK_ZH[s.outlook]}
          </span>{" "}
          · {RISK_ZH[s.risk]} · {LEVEL_ZH[s.level]}
        </p>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{s.desc}</p>
      </Link>
      <span className="pointer-events-none absolute bottom-3 left-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors group-hover:text-text">
        阅读指南
        <ArrowRight size={13} />
      </span>
      {s.preset && (
        <Link
          to={`/calculator?preset=${s.preset}&ticker=SPY`}
          className="absolute bottom-3 right-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[12.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-text"
        >
          在构建器中打开
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 shrink-0 rounded-full border px-2.5 text-[12px] font-medium transition-colors ${
        active ? "border-accent/40 bg-accent/10 text-accent" : "border-line bg-panel text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export default function Strategies() {
  const [outlook, setOutlook] = useState<string>("all");
  const [risk, setRisk] = useState<string>("all");
  const [q, setQ] = useState("");

  const query = q.trim();
  const matches = (s: Strategy) =>
    (outlook === "all" || s.outlook === outlook) &&
    (risk === "all" || s.risk === risk) &&
    (!query || s.name.includes(query) || s.desc.includes(query) || s.slug.includes(query.toLowerCase()));

  const starter = STARTER_ORDER.map((slug) => STRATEGY_BY_SLUG[slug]).filter(Boolean);

  return (
    <AppShell title="策略" footer>
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-[122px] sm:px-6">
        <p className="max-w-[768px] text-[14px] leading-relaxed text-muted">
          41 个期权策略指南——盈亏图、最大盈利与亏损、一个算好的例子，以及它在什么情况下会失效。
          先用大白话读懂，再拿去构建器里对着自己的标的试。
        </p>

        {!query && outlook === "all" && risk === "all" && (
          <section className="mt-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
              <h2 className="text-[15px] font-semibold">第一次接触期权？从这里开始</h2>
              <p className="text-[12px] text-dim">5 篇指南，一篇接一篇</p>
            </div>
            <ol className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {starter.map((s, i) => (
                <li key={s.slug} className="h-full">
                  <Link
                    to={`/strategies/${s.slug}`}
                    className="group flex h-full flex-col gap-2 rounded-lg border border-line-subtle bg-canvas/60 p-3 transition-colors hover:border-line-strong"
                  >
                    <span className="flex items-start gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                          {i + 1}
                        </span>
                        <span className="truncate text-[13px] font-semibold group-hover:text-accent">{s.name}</span>
                      </span>
                      <Sparkline
                        legs={legsForStrategy(s)}
                        spot={SPY.spot}
                        width={48}
                        height={20}
                        strokeColor={
                          s.outlook === "bullish"
                            ? "#007558"
                            : s.outlook === "bearish"
                              ? "#bc3722"
                              : "#925908"
                        }
                        className="ml-auto mt-0.5 shrink-0"
                      />
                    </span>
                    <span className="hidden text-[12px] leading-snug text-muted sm:block">
                      {STARTER_LINES[s.slug] ?? s.desc}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="fixed left-0 right-0 top-14 z-30 border-b border-line bg-canvas/95 backdrop-blur-xl lg:left-[var(--spacing-rail)] lg:top-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:py-[18px] lg:pl-6 lg:pr-6">
            <h1 className="shrink-0 text-[15px] font-semibold tracking-[-0.01em]">策略</h1>
            <span className="hidden shrink-0 text-[12px] text-dim sm:inline">41 篇指南</span>
            <div className="relative ml-auto w-full max-w-[288px] sm:w-[256px] sm:shrink-0">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索策略"
                className="h-8 w-full rounded-md border border-line bg-sunken pl-8 pr-8 text-[13px] outline-none placeholder:text-dim focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  aria-label="清除搜索"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-text"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-line-subtle px-4 py-2 sm:px-6 lg:py-[14px] lg:pl-6 lg:pr-6">
            {[
              ["all", "全部观点"],
              ["bullish", "看涨"],
              ["bearish", "看跌"],
              ["neutral", "中性"],
              ["volatile", "波动"],
            ].map(([v, label]) => (
              <Pill key={v} active={outlook === v} onClick={() => setOutlook(v)}>
                {label}
              </Pill>
            ))}
            <span className="mx-1 h-4 w-px shrink-0 bg-line" />
            {[
              ["all", "全部风险"],
              ["defined", "风险有限"],
              ["undefined", "风险无限"],
            ].map(([v, label]) => (
              <Pill key={v} active={risk === v} onClick={() => setRisk(v)}>
                {label}
              </Pill>
            ))}
          </div>
        </div>

        <section className="no-scrollbar mt-6 flex items-center gap-2 overflow-x-auto lg:mt-6">
          <h2 className="mr-1 flex shrink-0 items-center gap-1.5 text-[13px] font-semibold">最常被搜索</h2>
          {MOST_SEARCHED.map((slug) => {
            const s = STRATEGY_BY_SLUG[slug];
            return (
              <Link
                key={slug}
                to={`/strategies/${slug}`}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-panel px-3 text-[13px] font-medium text-muted hover:text-text"
              >
                {s?.name ?? slug}
                <ArrowRight size={12} />
              </Link>
            );
          })}
        </section>

        <div className="mt-8 space-y-9">
          {CATEGORY_ORDER.map((cat) => {
            const list = STRATEGIES.filter((s) => s.category === cat && matches(s));
            if (list.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="text-[13px] font-semibold">
                  {CATEGORY_ZH[cat] ?? cat}
                  <span className="ml-2 font-normal text-dim">{list.length}</span>
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {list.map((s) => (
                    <StrategyCard key={s.slug} s={s} />
                  ))}
                </div>
              </section>
            );
          })}
          {STRATEGIES.every((s) => !matches(s)) && (
            <p className="py-16 text-center text-[13px] text-dim">
              没有符合条件的策略。清空搜索或换一个观点试试。
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
