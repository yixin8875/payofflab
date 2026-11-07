import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Calendar, Search } from "../components/Icons";
import {
  Badge,
  DetailScroll,
  EmptyDetail,
  ListGroup,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import { buildChain } from "../lib/chain";
import { liveRows } from "../lib/live";
import { useLiveChain } from "../lib/useLiveChain";
import { EXPIRIES, SYMBOL_COUNT, TICKER_NAME, ticker } from "../data/tickers";
import { pct } from "../lib/format";

const GROUPS = [
  { title: "主要 ETF", symbols: ["SPY", "QQQ", "IWM", "DIA"] },
  { title: "大型科技股", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"] },
  { title: "热门个股", symbols: ["AMD", "PLTR", "SOFI", "COIN", "HOOD", "NFLX", "BA", "DIS"] },
  { title: "迷因股", symbols: ["GME", "AMC", "MSTR", "IBIT"] },
  { title: "板块 ETF", symbols: ["XLF", "XLE", "XLK", "XLV", "GLD", "TLT"] },
  { title: "杠杆 ETF", symbols: ["TQQQ", "SQQQ", "SOXL", "SPXL", "UVXY"] },
];

function nameOf(symbol: string) {
  return TICKER_NAME[symbol] ?? ticker(symbol).name;
}

export default function Chain() {
  const { symbol } = useParams<{ symbol?: string }>();
  const [query, setQuery] = useState("");
  const q = query.trim();
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    symbols: group.symbols.filter(
      (s) => !q || s.includes(q.toUpperCase()) || nameOf(s).includes(q),
    ),
  })).filter((group) => group.symbols.length > 0);
  const extra =
    visibleGroups.length === 0 && /^[A-Za-z][A-Za-z.]{0,5}$/.test(q) ? q.toUpperCase() : "";

  return (
    <Split
      list={
        <ListPane title="期权链" count={SYMBOL_COUNT}>
          <div className="px-2 pb-2">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标的"
                className="field h-7 pl-7 text-[12px]"
                aria-label="搜索标的"
              />
            </div>
          </div>
          {visibleGroups.map((group) => (
            <ListGroup key={group.title} label={group.title} count={group.symbols.length}>
              {group.symbols.map((s) => {
                const t = ticker(s);
                return (
                  <ListRow
                    key={s}
                    to={`/chain/${s.toLowerCase()}`}
                    selected={symbol?.toUpperCase() === s}
                    badge={<Badge label={s.slice(0, 2)} seed={s} size={26} />}
                    title={s}
                    subtitle={nameOf(s)}
                    meta={`$${t.spot.toFixed(2)}`}
                  />
                );
              })}
            </ListGroup>
          ))}
          {extra && (
            <ListGroup label="在线查询" count={1}>
              <ListRow
                to={`/chain/${extra.toLowerCase()}`}
                selected={symbol?.toUpperCase() === extra}
                badge={<Badge label={extra.slice(0, 2)} seed={extra} size={26} />}
                title={extra}
                subtitle="CBOE 延迟行情中查询"
                meta="在线"
              />
            </ListGroup>
          )}
          {visibleGroups.length === 0 && !extra && (
            <p className="px-3 py-10 text-center text-[11.5px] text-dim">没有匹配的标的</p>
          )}
        </ListPane>
      }
    >
      {symbol ? (
        <ChainView symbol={symbol.toUpperCase()} />
      ) : (
        <>
          <PaneHeader title="期权链" subtitle={`${SYMBOL_COUNT} 个热门标的 · 任意可交易标的`} />
          <EmptyDetail
            title="选择一个标的"
            body="看涨、行权价与看跌并排，附买价、卖价、成交量、未平仓量与隐含波动率。"
            action={
              <Link to="/calculator" className="btn-secondary h-8 px-3">
                打开构建器
              </Link>
            }
          />
        </>
      )}
    </Split>
  );
}

function ChainView({ symbol }: { symbol: string }) {
  const t = useMemo(() => ticker(symbol), [symbol]);
  const live = useLiveChain(symbol);
  const chain = live.chain;
  const [source, setSource] = useState<"live" | "offline">("live");
  const [expiryIso, setExpiryIso] = useState("");
  const online = source === "live" && !!chain;
  const expiries = online && chain ? chain.expiries : EXPIRIES;

  const fallbackExpiry = useMemo(
    () =>
      expiries.reduce(
        (best, e) => (Math.abs(e.dte - 30) < Math.abs(best.dte - 30) ? e : best),
        expiries[0],
      ),
    [expiries],
  );
  const expiry = expiries.find((e) => e.iso === expiryIso) ?? fallbackExpiry;

  const market = useMemo(() => {
    if (!online || !chain) return t;
    return {
      ...t,
      spot: chain.spot || t.spot,
      change: chain.change,
      changePct: chain.changePct,
      iv: chain.iv30 || t.iv,
    };
  }, [t, chain, online]);

  const rows = useMemo(() => {
    if (online && chain) {
      const loaded = liveRows(chain, expiry.iso, 15);
      if (loaded.length) return loaded;
    }
    return buildChain(market, expiry.iso, 15, online);
  }, [online, chain, expiry.iso, market]);
  const minDistance = Math.min(...rows.map((r) => Math.abs(r.strike - market.spot)));
  const quickExpiries = expiries.filter((e) => e.dte <= 45);
  if (!quickExpiries.some((e) => e.iso === expiry.iso)) quickExpiries.push(expiry);
  const moreExpiries = expiries.filter((e) => !quickExpiries.some((q) => q.iso === e.iso));

  return (
    <>
      <PaneHeader
        title={`${t.symbol} · ${t.name}`}
        subtitle={`$${market.spot.toFixed(2)} · ${market.change >= 0 ? "+" : "−"}${Math.abs(market.changePct * 100).toFixed(2)}% · IV ${pct(market.iv, 1)}${online ? " · 在线" : ` · IVR ${t.ivRank}`}`}
      >
        <Link
          to={`/calculator?ticker=${t.symbol}&expiry=${expiry.iso}`}
          className="btn-primary h-7 px-2.5"
        >
          在构建器中打开
          <ArrowRight size={12} />
        </Link>
      </PaneHeader>

      <DetailScroll wide>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 text-[10.5px] text-faint">
            <Calendar size={12} />
            到期日
          </span>
          {quickExpiries.map((e) => (
            <button
              key={e.iso}
              type="button"
              onClick={() => setExpiryIso(e.iso)}
              className={`flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                e.iso === expiry.iso
                  ? "border-accent-line bg-accent-soft text-accent"
                  : "border-line bg-white text-dim hover:text-text"
              }`}
            >
              {e.label}
              <span className={`tnum text-[9.5px] ${e.iso === expiry.iso ? "text-accent/70" : "text-faint"}`}>
                {e.dte}天
              </span>
            </button>
          ))}
          {moreExpiries.length > 0 && (
            <select
              aria-label="更多到期日"
              value={moreExpiries.some((e) => e.iso === expiry.iso) ? expiry.iso : ""}
              onChange={(event) => event.target.value && setExpiryIso(event.target.value)}
              className="h-6 shrink-0 rounded-md border border-line bg-white px-1.5 text-[11px] text-dim"
            >
              <option value="">更多到期日</option>
              {moreExpiries.map((e) => (
                <option key={e.iso} value={e.iso}>
                  {e.label} · {e.dte}天
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-md border border-line bg-white p-0.5">
              {(["live", "offline"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSource(value)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    source === value ? "bg-accent-soft text-accent" : "text-dim hover:text-text"
                  }`}
                >
                  {value === "live" ? "在线" : "合成"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-faint">
              {online
                ? `CBOE 延迟 15 分钟 · ${chain?.asOf ?? ""}`
                : source === "live" && live.loading
                  ? "正在获取在线行情…"
                  : `合成报价 · 行权价按 ${t.strikeStep} 递增`}
            </span>
            {source === "live" && (
              <button
                type="button"
                onClick={live.reload}
                disabled={live.loading}
                className="text-[10px] font-medium text-accent disabled:text-faint"
              >
                {live.loading ? "刷新中…" : "刷新"}
              </button>
            )}
          </div>
        </div>

        {source === "live" && live.error && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-line bg-[#fbfaf8] px-2.5 py-1.5 text-[10.5px] text-dim">
            <span>在线行情不可用（{live.error}），当前使用合成数据。</span>
            <button
              type="button"
              onClick={live.reload}
              className="font-medium text-accent hover:underline"
            >
              重试
            </button>
          </div>
        )}

        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line-subtle bg-[#fbfaf8] px-3 py-1.5 text-[10.5px]">
            <span className="font-semibold">看涨期权</span>
            <span className="text-faint">行权价居中</span>
            <span className="font-semibold">看跌期权</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[11px] tnum">
              <thead>
                <tr className="border-b border-line-subtle text-[9.5px] uppercase tracking-wide text-faint">
                  <th className="px-2.5 py-1.5 text-right font-medium">买价</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">卖价</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">成交量</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">未平仓</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">IV</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">Delta</th>
                  <th className="border-x border-line bg-[#fbfaf8] px-2.5 py-1.5 text-center font-semibold">
                    行权价
                  </th>
                  <th className="px-1.5 py-1.5 text-right font-medium">Delta</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">IV</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">未平仓</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">成交量</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">卖价</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">买价</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const atm = Math.abs(row.strike - market.spot) === minDistance;
                  return (
                    <tr
                      key={row.strike}
                      className={`border-b border-line-subtle last:border-0 ${
                        atm ? "bg-accent-soft/60" : "hover:bg-hover"
                      }`}
                    >
                      <td className={`px-2.5 py-1.5 text-right ${atm ? "text-accent" : "text-profit"}`}>
                        {row.call.bid.toFixed(2)}
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-muted">{row.call.ask.toFixed(2)}</td>
                      <td className="px-1.5 py-1.5 text-right text-dim">
                        {row.call.volume.toLocaleString("en-US")}
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-dim">
                        {row.call.oi.toLocaleString("en-US")}
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-muted">
                        {(row.call.iv * 100).toFixed(1)}%
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-muted">{row.call.delta.toFixed(2)}</td>
                      <td
                        className={`border-x border-line px-2.5 py-1.5 text-center font-semibold ${
                          atm ? "bg-accent-soft text-accent" : "bg-[#fbfaf8] text-text"
                        }`}
                      >
                        {row.strike.toFixed(2)}
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-muted">{row.put.delta.toFixed(2)}</td>
                      <td className="px-1.5 py-1.5 text-right text-muted">
                        {(row.put.iv * 100).toFixed(1)}%
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-dim">
                        {row.put.oi.toLocaleString("en-US")}
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-dim">
                        {row.put.volume.toLocaleString("en-US")}
                      </td>
                      <td className="px-1.5 py-1.5 text-right text-muted">{row.put.ask.toFixed(2)}</td>
                      <td className={`px-2.5 py-1.5 text-right ${atm ? "text-accent" : "text-loss"}`}>
                        {row.put.bid.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            to={`/calculator?ticker=${t.symbol}&expiry=${expiry.iso}&preset=long-call`}
            className="btn-secondary h-7 px-2.5"
          >
            用平值看涨开始
          </Link>
          <Link
            to={`/tools/option-finder?ticker=${t.symbol}`}
            className="btn-ghost h-7 px-2 text-muted"
          >
            扫描 {t.symbol} 的价差
          </Link>
          <span className="ml-auto text-[10.5px] text-faint">
            {expiry.label} · {expiry.dte} 天 ·{" "}
            {online ? "CBOE 延迟行情，非投资建议" : "模型输出，非投资建议"}
          </span>
        </div>
      </DetailScroll>
    </>
  );
}
