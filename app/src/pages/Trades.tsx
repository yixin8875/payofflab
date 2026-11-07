import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Bars, Trash } from "../components/Icons";
import { PayoffChart } from "../components/PayoffChart";
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
import { deleteTrade, useTrades } from "../lib/store";
import { analyse, type Instrument } from "../lib/options";
import { useLiveChain } from "../lib/useLiveChain";
import { EXPIRIES, ticker } from "../data/tickers";
import { money, pct, price } from "../lib/format";

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "今天";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function Trades() {
  const trades = useTrades();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const map = new Map<string, typeof trades>();
    for (const trade of trades) {
      const label = dayLabel(trade.savedAt);
      const list = map.get(label) ?? [];
      list.push(trade);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [trades]);

  const selected = trades.find((trade) => trade.id === id);

  return (
    <Split
      list={
        <ListPane title="持仓" count={trades.length}>
          {trades.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-faint">
                <Bars size={16} />
              </span>
              <p className="mt-3 text-[11.5px] text-dim">还没有保存的策略</p>
              <p className="mt-1 text-[10.5px] leading-4 text-faint">
                在构建器里搭好持仓，点“保存策略”，它就会出现在这里。
              </p>
            </div>
          ) : (
            groups.map(([label, list]) => (
              <ListGroup key={label} label={label} count={list.length}>
                {list.map((trade) => (
                  <ListRow
                    key={trade.id}
                    to={`/trades/${trade.id}`}
                    selected={trade.id === id}
                    badge={<Badge label={trade.symbol.slice(0, 2)} seed={trade.symbol} />}
                    title={trade.name}
                    subtitle={`${trade.symbol} · ${trade.legs.length} 条腿`}
                    meta={dayLabel(trade.savedAt)}
                  />
                ))}
              </ListGroup>
            ))
          )}
        </ListPane>
      }
    >
      {selected ? (
        <TradeView
          trade={selected}
          onDelete={() => {
            if (window.confirm(`删除「${selected.name}」？此操作只影响本机数据。`)) {
              deleteTrade(selected.id);
              navigate("/trades");
            }
          }}
        />
      ) : (
        <>
          <PaneHeader title="持仓" subtitle="保存在本机" />
          <EmptyDetail
            title={trades.length ? "选择一笔持仓" : "还没有保存的策略"}
            body={
              trades.length
                ? "每笔保存的策略都能重新估值，看到当前盈亏图与关键数字。"
                : "在构建器里搭好一笔多腿持仓，保存后会在这里按最新合成报价重新估值。"
            }
            action={
              <Link to="/calculator" className="btn-primary h-8 px-3">
                打开构建器
                <ArrowRight size={12} />
              </Link>
            }
          />
        </>
      )}
    </Split>
  );
}

function TradeView({
  trade,
  onDelete,
}: {
  trade: ReturnType<typeof useTrades>[number];
  onDelete: () => void;
}) {
  const t = ticker(trade.symbol);
  const live = useLiveChain(trade.symbol);
  const chain = live.chain;
  const market = chain
    ? { ...t, spot: chain.spot || t.spot, iv: chain.iv30 || t.iv }
    : t;
  const expiries = chain?.expiries ?? EXPIRIES;
  const expiry =
    expiries.find((e) => e.iso === trade.expiry) ?? expiries[3] ?? expiries[0];
  const dte = trade.legs[0]?.dte ?? expiry.dte;
  const instrument: Instrument = { ...market, expiries };
  const a = useMemo(() => analyse(trade.legs, instrument, dte / 365), [trade.legs, instrument, dte]);

  return (
    <>
      <PaneHeader
        title={trade.name}
        subtitle={`${trade.symbol} · ${expiry.label} · 保存于 ${dayLabel(trade.savedAt)}`}
      >
        <Link
          to={`/calculator?ticker=${trade.symbol}&expiry=${trade.expiry}`}
          className="btn-secondary h-7 px-2.5"
        >
          在构建器中重建
        </Link>
        <button type="button" onClick={onDelete} className="btn-ghost h-7 px-2 text-loss">
          <Trash size={13} />
          删除
        </button>
      </PaneHeader>

      <DetailScroll>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-baseline justify-between px-0.5">
              <p className="text-[11px] text-dim">
                {trade.symbol} · {expiry.label}（{dte}天）
              </p>
              <p className={`text-[11px] font-medium tnum ${a.isCredit ? "text-profit" : "text-text"}`}>
                净{a.isCredit ? "收入" : "支出"} {money(Math.abs(a.premium))}
              </p>
            </div>
            <PayoffChart
              legs={trade.legs}
              spot={market.spot}
              iv={market.iv}
              dte={dte}
              expiryLabel={expiry.label}
              mode="pnl"
              envelope={0}
              height={320}
            />
          </div>

          <aside className="rounded-lg border border-line bg-white p-3">
            <h2 className="text-[12px] font-semibold">关键数字</h2>
            <dl className="mt-1.5 divide-y divide-line-subtle text-[11.5px]">
              {[
                ["最大盈利", a.maxProfit === null ? "无限" : money(a.maxProfit)],
                ["最大亏损", a.maxLoss === null ? "无限" : money(a.maxLoss)],
                [
                  "盈亏平衡",
                  a.breakevens.length ? a.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ") : "—",
                ],
                ["盈利概率", pct(a.probProfit)],
                ["风险回报", a.riskReward],
                ["每日 Theta", `${a.theta > 0 ? "+" : ""}${money(a.theta)}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-2 py-1.5">
                  <dt className="text-dim">{label}</dt>
                  <dd className="text-right font-medium tnum">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <section className="mt-4">
          <h2 className="text-[12px] font-semibold">持仓腿</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-line bg-white">
            {trade.legs.map((leg) => (
              <div
                key={leg.id}
                className="flex items-center gap-2 border-b border-line-subtle px-3 py-2 text-[11.5px] last:border-0"
              >
                <span
                  className={`w-8 rounded px-1 py-0.5 text-center text-[9.5px] font-medium ${
                    leg.side === -1 ? "bg-loss-soft text-loss" : "bg-profit-soft text-profit"
                  }`}
                >
                  {leg.side === -1 ? "卖出" : "买入"}
                </span>
                <span className="tnum text-dim">×{leg.qty}</span>
                <span className="text-muted">
                  {leg.kind === "call" ? "看涨" : leg.kind === "put" ? "看跌" : "正股"}
                </span>
                <span className="tnum">{leg.kind === "stock" ? `$${leg.fill.toFixed(2)}` : leg.strike}</span>
                <span className="ml-auto text-faint">成交 {price(leg.fill)}</span>
              </div>
            ))}
          </div>
        </section>
      </DetailScroll>
    </>
  );
}
