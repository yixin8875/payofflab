import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Repeat, Target } from "../components/Icons";
import { PaneHeader, Workspace } from "../desktop/Split";
import { encodeDraft } from "../lib/draft";
import { money, pct, price } from "../lib/format";
import {
  scanStrategies,
  type ScanLiquidity,
  type ScanOutlook,
  type ScanRank,
} from "../lib/scanner";
import { useLiveChain } from "../lib/useLiveChain";

const OUTLOOKS: { key: ScanOutlook; label: string; hint: string }[] = [
  { key: "bullish", label: "看涨", hint: "单腿、价差、备兑" },
  { key: "bearish", label: "看跌", hint: "看跌与看涨价差" },
  { key: "neutral", label: "中性", hint: "铁鹰、蝶式、宽跨" },
  { key: "volatile", label: "波动", hint: "跨式与宽跨式" },
];

const LIQUIDITIES: { key: ScanLiquidity; note: string }[] = [
  { key: "严格", note: "OI ≥ 300 · 量 ≥ 10 · 价差 ≤ 12%" },
  { key: "标准", note: "OI ≥ 50 · 量 ≥ 1 · 价差 ≤ 25%" },
  { key: "宽松", note: "不限 OI · 价差 ≤ 50%" },
];

const RANKS: ScanRank[] = ["风险回报", "概率", "预期价值", "净权利金"];

export default function OptionFinder() {
  const [symbol, setSymbol] = useState("SPY");
  const [outlook, setOutlook] = useState<ScanOutlook>("bullish");
  const [expiryIso, setExpiryIso] = useState("");
  const [liquidity, setLiquidity] = useState<ScanLiquidity>("标准");
  const [rank, setRank] = useState<ScanRank>("风险回报");
  const [scanned, setScanned] = useState(false);

  const live = useLiveChain(symbol);
  const chain = live.chain;
  const expiries = chain?.expiries ?? [];
  const fallbackExpiry = useMemo(
    () =>
      expiries.reduce(
        (best, item) => (Math.abs(item.dte - 30) < Math.abs(best.dte - 30) ? item : best),
        expiries[0],
      ),
    [expiries],
  );
  const expiry = expiries.find((item) => item.iso === expiryIso) ?? fallbackExpiry;

  const results = useMemo(() => {
    if (!scanned || !chain || !expiry) return [];
    return scanStrategies(chain, expiry.iso, outlook, liquidity, rank);
  }, [scanned, chain, expiry, outlook, liquidity, rank]);

  const pickSymbol = (value: string) => {
    setSymbol(value.toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 12));
    setExpiryIso("");
    setScanned(false);
  };

  const pill = (active: boolean) =>
    `h-7 shrink-0 rounded-md border px-2 text-[11px] font-medium transition-colors ${
      active
        ? "border-accent-line bg-accent-soft text-accent"
        : "border-line bg-white text-dim hover:text-text"
    }`;

  return (
    <Workspace>
      <PaneHeader
        title="期权扫描"
        subtitle={
          chain
            ? `${chain.symbol} · $${price(chain.spot)} · IV ${pct(chain.iv30, 1)} · ${chain.asOf}`
            : `${symbol} · 读取在线期权链`
        }
        leading={
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Target size={14} />
          </span>
        }
      >
        <span className="chip">{chain ? "CBOE 延迟" : "在线"}</span>
        <button
          type="button"
          onClick={live.reload}
          disabled={live.loading}
          className="btn-secondary h-7 px-2.5 disabled:opacity-40"
        >
          <Repeat size={12} />
          刷新
        </button>
      </PaneHeader>

      <div className="scroll-pane flex-1">
        <div className="mx-auto max-w-[1120px] px-6 py-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setScanned(true);
              if (!chain && !live.loading) live.reload();
            }}
            className="rounded-lg border border-line bg-white p-4"
          >
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="block">
                <span className="text-[10.5px] text-dim">标的</span>
                <input
                  value={symbol}
                  onChange={(event) => pickSymbol(event.target.value)}
                  className="mt-1 block h-8 w-[96px] rounded-md border border-line bg-white px-2 font-code text-[12px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  aria-label="标的代码"
                />
              </label>

              <div>
                <span className="text-[10.5px] text-dim">观点</span>
                <div className="mt-1 flex rounded-md border border-line bg-surface p-0.5">
                  {OUTLOOKS.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setOutlook(item.key)}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        outlook === item.key ? "bg-white text-text shadow-sm" : "text-dim"
                      }`}
                      title={item.hint}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-[10.5px] text-dim">到期</span>
                <select
                  value={expiry?.iso ?? ""}
                  onChange={(event) => setExpiryIso(event.target.value)}
                  disabled={!expiries.length}
                  className="mt-1 block h-8 max-w-[150px] rounded-md border border-line bg-white px-2 text-[11.5px] outline-none focus:border-accent disabled:opacity-50"
                  aria-label="到期日"
                >
                  {expiries.length === 0 && <option value="">加载中…</option>}
                  {expiries.map((item) => (
                    <option key={item.iso} value={item.iso}>
                      {item.label} · {item.dte}天
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10.5px] text-dim">排序</span>
                <select
                  value={rank}
                  onChange={(event) => setRank(event.target.value as ScanRank)}
                  className="mt-1 block h-8 rounded-md border border-line bg-white px-2 text-[11.5px] outline-none focus:border-accent"
                  aria-label="排序方式"
                >
                  {RANKS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="btn-primary ml-auto h-8 px-3">
                <Target size={13} />
                扫描 {symbol}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3">
              <span className="mr-1 text-[10px] text-faint">流动性</span>
              {LIQUIDITIES.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setLiquidity(item.key)}
                  className={pill(liquidity === item.key)}
                  title={item.note}
                >
                  {item.key}
                </button>
              ))}
              <span className="ml-1 text-[10px] text-faint">
                {LIQUIDITIES.find((item) => item.key === liquidity)?.note}
              </span>
              <span className="ml-auto text-[10px] text-faint">
                买入按卖价、卖出按买价计入
              </span>
            </div>
          </form>

          {live.error && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-loss/25 bg-loss-soft/40 px-3 py-2 text-[11px] text-loss">
              <span>在线行情不可用：{live.error}</span>
              <button type="button" onClick={live.reload} className="btn-secondary h-7 px-2.5">
                重试
              </button>
            </div>
          )}

          {scanned ? (
            !chain ? (
              <div className="mt-8 text-center text-[11.5px] text-dim">
                {live.loading ? `正在读取 ${symbol} 的在线期权链…` : "等待在线行情。"}
              </div>
            ) : !expiry ? (
              <div className="mt-8 text-center text-[11.5px] text-dim">这个标的没有可用到期日。</div>
            ) : (
              <section className="mt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[12.5px] font-semibold">
                    {chain.symbol} · {OUTLOOKS.find((item) => item.key === outlook)?.label} ·{" "}
                    {expiry.label}
                  </h2>
                  <span className="text-[10.5px] text-faint">
                    {results.length} 个结果 · 按{rank}排序 · {liquidity}流动性
                  </span>
                </div>

                <div className="mt-2 overflow-hidden rounded-lg border border-line bg-white">
                  <div className="grid grid-cols-[minmax(0,1fr)_60px_92px_84px_84px_84px] gap-2 border-b border-line-subtle bg-[#fbfaf8] px-3 py-1.5 text-[9.5px] font-medium uppercase tracking-wide text-faint">
                    <span>交易</span>
                    <span className="text-right">概率</span>
                    <span className="text-right">净权利金</span>
                    <span className="text-right">最大盈利</span>
                    <span className="text-right">最大亏损</span>
                    <span className="text-right">预期价值</span>
                  </div>
                  {results.map((result) => {
                    const draft = encodeDraft({
                      name: result.name,
                      symbol: chain.symbol,
                      expiry: expiry.iso,
                      legs: result.legs,
                    });
                    return (
                      <Link
                        key={result.key}
                        to={`/calculator?ticker=${chain.symbol}&expiry=${expiry.iso}&legs=${draft}`}
                        className="grid grid-cols-[minmax(0,1fr)_60px_92px_84px_84px_84px] items-center gap-2 border-b border-line-subtle px-3 py-2 last:border-0 hover:bg-hover"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium">{result.name}</span>
                          <span className="block truncate text-[10px] text-dim tnum">
                            {result.legText} · OI ≥ {result.minOi.toLocaleString()} · 价差{" "}
                            {(result.maxSpread * 100).toFixed(1)}%
                          </span>
                        </span>
                        <span className="text-right text-[11.5px] font-medium text-profit tnum">
                          {pct(result.pop)}
                        </span>
                        <span
                          className={`text-right text-[11.5px] tnum ${
                            result.netCredit >= 0 ? "text-profit" : "text-muted"
                          }`}
                        >
                          {result.netCredit >= 0 ? "+" : "−"}
                          {money(Math.abs(result.netCredit))}
                        </span>
                        <span className="text-right text-[11.5px] tnum">
                          {result.maxProfit === null ? "无限" : money(result.maxProfit)}
                        </span>
                        <span className="text-right text-[11.5px] tnum">
                          {result.maxLoss === null ? "无限" : money(result.maxLoss)}
                        </span>
                        <span
                          className={`text-right text-[11.5px] font-medium tnum ${
                            result.ev >= 0 ? "text-profit" : "text-loss"
                          }`}
                        >
                          {money(result.ev, { sign: true })}
                        </span>
                      </Link>
                    );
                  })}
                  {results.length === 0 && (
                    <p className="px-3 py-10 text-center text-[11.5px] leading-5 text-dim">
                      这个观点下没有结构通过筛选。
                      <br />
                      试试“宽松”流动性、更远的到期日，或换一个流动性更好的标的。
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-faint">
                  扫描基于 CBOE 延迟行情（约 15 分钟），买入按卖价、卖出按买价成交，未计佣金与滑点；
                  概率与预期价值来自 Black-Scholes 风险中性分布。点击任意一行可带入构建器。
                </p>
              </section>
            )
          ) : (
            <section className="mt-8 text-center">
              <p className="text-[12px] text-dim">
                {chain
                  ? `已读取 ${chain.symbol} 的 ${expiries.length} 个到期日，选好观点与流动性后开始扫描。`
                  : `正在读取 ${symbol} 的在线期权链…`}
              </p>
              <p className="mt-1 text-[10.5px] leading-4 text-faint">
                扫描会遍历真实挂牌行权价，按买价/卖价计算净权利金，再筛选流动性并排序。
              </p>
              {!chain && !live.loading && (
                <button type="button" onClick={live.reload} className="btn-secondary mt-3 h-7 px-2.5">
                  重新读取
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </Workspace>
  );
}
