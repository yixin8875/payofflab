import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, X } from "../components/Icons";
import {
  Badge,
  EmptyDetail,
  ListGroup,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import {
  CATEGORY_ORDER,
  CATEGORY_ZH,
  LEVEL_ZH,
  OUTLOOK_ZH,
  RISK_ZH,
  STRATEGIES,
  STRATEGY_BY_SLUG,
} from "../data/strategies";
import { StrategyView } from "./StrategyDetail";

const OUTLOOKS = [
  ["all", "全部"],
  ["bullish", "看涨"],
  ["bearish", "看跌"],
  ["neutral", "中性"],
  ["volatile", "波动"],
] as const;

export default function Strategies() {
  const { slug } = useParams<{ slug?: string }>();
  const [query, setQuery] = useState("");
  const [outlook, setOutlook] = useState<string>("all");

  const q = query.trim();
  const matches = (s: (typeof STRATEGIES)[number]) =>
    (outlook === "all" || s.outlook === outlook) &&
    (!q || s.name.includes(q) || s.desc.includes(q) || s.slug.includes(q.toLowerCase()));

  const filtered = STRATEGIES.filter(matches);
  const selected = slug ? STRATEGY_BY_SLUG[slug] : undefined;

  return (
    <Split
      list={
        <ListPane title="策略库" count={STRATEGIES.length}>
          <div className="px-2 pb-1.5">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="筛选策略"
                className="field h-7 pl-7 pr-7 text-[13px]"
                aria-label="筛选策略"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-faint hover:text-text"
                  aria-label="清除筛选"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2">
            {OUTLOOKS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOutlook(value)}
                className={`h-7 shrink-0 rounded-lg border px-2 text-[13px] font-medium transition-colors ${
                  outlook === value
                    ? "border-accent-line bg-accent-soft text-accent"
                    : "border-line bg-white text-dim hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="px-3 py-10 text-center text-[12px] text-dim">没有符合条件的策略</p>
          )}

          {CATEGORY_ORDER.map((category) => {
            const items = filtered.filter((s) => s.category === category);
            if (!items.length) return null;
            return (
              <ListGroup key={category} label={CATEGORY_ZH[category] ?? category} count={items.length}>
                {items.map((s) => (
                  <ListRow
                    key={s.slug}
                    to={`/strategies/${s.slug}`}
                    selected={slug === s.slug}
                    badge={<Badge label={s.name.slice(0, 2)} seed={s.slug} />}
                    title={s.name}
                    subtitle={`${OUTLOOK_ZH[s.outlook]} · ${RISK_ZH[s.risk]}`}
                    meta={LEVEL_ZH[s.level]}
                  />
                ))}
              </ListGroup>
            );
          })}
        </ListPane>
      }
    >
      {selected ? (
        <StrategyView key={selected.slug} s={selected} />
      ) : (
        <>
          <PaneHeader title={slug ? "没有找到这个策略" : "策略库"} subtitle={`${STRATEGIES.length} 篇指南`} />
          <EmptyDetail
            title={slug ? "它可能改了名字" : "选择一个策略"}
            body={
              slug
                ? "回到左侧列表重新找找，或者从最常被搜索的几个策略开始。"
                : "每篇都有盈亏图、最大盈利与亏损、一份算好的例子，以及它在什么情况下会失效。"
            }
            action={
              <Link to={slug ? "/strategies" : "/calculator"} className="btn-secondary h-8 px-3">
                {slug ? "返回策略库" : "打开构建器"}
              </Link>
            }
          />
        </>
      )}
    </Split>
  );
}
