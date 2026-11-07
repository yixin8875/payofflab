import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ChevronRight, Search } from "../components/Icons";
import { ALL_GRID, TICKER_NAME, ticker } from "../data/tickers";

type Group = { title: string; symbols: string[] };

const GROUPS: Group[] = [
  { title: "主要 ETF", symbols: ["SPY", "QQQ", "IWM", "DIA"] },
  { title: "大型科技股", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"] },
  { title: "热门个股", symbols: ["AMD", "PLTR", "SOFI", "COIN", "HOOD", "NFLX", "BA", "DIS"] },
  { title: "迷因股", symbols: ["GME", "AMC", "MSTR", "IBIT"] },
  { title: "板块 ETF", symbols: ["XLF", "XLE", "XLK", "XLV", "GLD", "TLT"] },
  { title: "杠杆 ETF", symbols: ["TQQQ", "SQQQ", "SOXL", "SPXL", "UVXY"] },
];

function nameOf(sym: string) {
  return TICKER_NAME[sym] ?? ticker(sym).name;
}

export default function Chain() {
  const [q, setQ] = useState("");
  const query = q.trim().toUpperCase();
  const visible = query
    ? ALL_GRID.filter((s) => s.includes(query) || nameOf(s).includes(q.trim()))
    : ALL_GRID;

  return (
    <AppShell title="期权链" footer>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex h-[52px] items-center gap-3">
          <h1 className="shrink-0 truncate text-[15px] font-semibold tracking-[-0.01em]">期权链</h1>
          <span className="hidden truncate text-[13px] text-dim sm:inline">99 个热门标的 · 任意可交易标的</span>
          <div className="relative ml-auto w-full max-w-[256px]">
            <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索任意标的"
              className="h-8 w-full rounded-md border border-line bg-sunken pl-8 pr-3 text-[13px] text-text outline-none placeholder:text-dim focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1152px] px-4 pb-20 pt-6 sm:px-6">
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
          浏览 99 个热门股票与 ETF 的期权链：看涨、行权价与看跌并排，附买价、卖价、成交量、
          未平仓量与隐含波动率。挑一个标的，把任何一条腿直接带进构建器。
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((g) => (
            <section key={g.title} className="overflow-hidden rounded-xl border border-line bg-panel">
              <h2 className="flex h-10 items-center border-b border-line-subtle bg-surface/50 px-3 text-[12px] font-semibold">
                {g.title}
              </h2>
              <ul>
                {g.symbols.map((sym) => {
                  return (
                    <li key={sym}>
                      <Link
                        to={`/options-chain/${sym.toLowerCase()}`}
                        className="group flex h-10 items-center gap-3 px-3 text-[13px] transition-colors hover:bg-hover pointer-coarse:h-12"
                      >
                        <span className="w-12 shrink-0 font-code text-[12px] font-semibold tracking-[0.06em]">{sym}</span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim">{nameOf(sym)}</span>
                        <ChevronRight size={14} className="text-faint transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
          <h2 className="flex h-10 items-center border-b border-line-subtle bg-surface/50 px-3 text-[12px] font-semibold">
            {query ? `“${q.trim()}” 的结果` : "全部热门标的"}
          </h2>
          <div className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-5 lg:grid-cols-10">
            {visible.map((sym) => (
              <Link
                key={sym}
                to={`/options-chain/${sym.toLowerCase()}`}
                className="flex h-8 items-center justify-center rounded-md font-code text-[12px] text-muted transition-colors hover:bg-hover hover:text-text"
              >
                {sym}
              </Link>
            ))}
          </div>
          {visible.length === 0 && (
            <p className="px-3 pb-6 text-center text-[12.5px] text-dim">没有匹配的标的，试试 SPY 或 NVDA。</p>
          )}
        </section>

        <p className="mt-6 text-[12px] leading-relaxed text-dim">
          行情为上一交易时段的延迟数据。期权价格用 Black-Scholes 按标的现价合成，仅供情景分析，
          不代表任何交易所的可成交报价。
        </p>
      </div>
    </AppShell>
  );
}
