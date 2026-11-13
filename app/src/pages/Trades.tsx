import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Bars, Repeat, Trash } from "../components/Icons";
import { encodeDraft } from "../lib/draft";
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
import { eventLabel, eventsUntil, useEvents } from "../lib/events";
import { money, num, price } from "../lib/format";
import {
  portfolioMetrics,
  useLiveChains,
  type PortfolioMetrics,
  type PositionLeg,
  type PositionMetrics,
} from "../lib/positions";
import {
  closeLeg,
  closeTrade,
  deleteTrade,
  hasOpenLegs,
  openTrades,
  useTrades,
} from "../lib/store";

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "今天";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function expiryLabel(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return month && day ? `${month}月${day}日` : iso;
}

function pnlClass(value: number) {
  return value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-muted";
}

export default function Trades() {
  const trades = useTrades();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const open = useMemo(() => openTrades(trades), [trades]);
  const closed = useMemo(() => trades.filter((trade) => !hasOpenLegs(trade)), [trades]);
  const symbols = useMemo(
    () => [...new Set(open.map((trade) => trade.symbol.toUpperCase()))],
    [open],
  );
  const live = useLiveChains(symbols);
  const portfolio = useMemo(
    () => portfolioMetrics(trades, live.chains),
    [trades, live.chains],
  );
  const metricsById = useMemo(
    () => new Map(portfolio.positions.map((item) => [item.trade.id, item])),
    [portfolio.positions],
  );
  const selected = trades.find((trade) => trade.id === id);
  const selectedMetrics = selected ? metricsById.get(selected.id) : undefined;

  return (
    <Split
      list={
        <ListPane
          title="持仓"
          count={open.length ? `${open.length} 笔` : undefined}
          actions={
            <button
              type="button"
              onClick={live.reload}
              disabled={live.loading || symbols.length === 0}
              title="刷新全部行情"
              aria-label="刷新全部行情"
              className="btn-ghost h-7 w-7 justify-center p-0 disabled:opacity-40"
            >
              <Repeat size={13} />
            </button>
          }
          footer={
            live.error ? (
              <p className="border-t border-line px-3 py-2 text-[11px] leading-4 text-loss">
                部分行情未更新：{live.error}
              </p>
            ) : undefined
          }
        >
          <PortfolioCard portfolio={portfolio} loading={live.loading} />
          {trades.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-faint">
                <Bars size={16} />
              </span>
              <p className="mt-3 text-[12px] text-dim">还没有保存的策略</p>
              <p className="mt-1 text-[11px] leading-4 text-faint">
                在构建器里搭好持仓，点“保存策略”，它就会出现在这里。
              </p>
            </div>
          ) : (
            <>
              {open.length > 0 && (
                <ListGroup label="未平仓" count={open.length}>
                  {[...open]
                    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
                    .map((trade) => {
                      const metrics = metricsById.get(trade.id);
                      return (
                        <ListRow
                          key={trade.id}
                          to={`/trades/${trade.id}`}
                          selected={trade.id === id}
                          badge={<Badge label={trade.symbol.slice(0, 2)} seed={trade.symbol} />}
                          title={trade.name}
                          subtitle={`${trade.symbol} · ${trade.legs.filter((leg) => leg.qty > 0).length} 条腿 · ${expiryLabel(trade.expiry)}`}
                          meta={
                            <span className={pnlClass(metrics?.unrealized ?? 0)}>
                              {money(metrics?.unrealized ?? 0, { sign: true })}
                            </span>
                          }
                        />
                      );
                    })}
                </ListGroup>
              )}
              {closed.length > 0 && (
                <ListGroup label="已平仓" count={closed.length}>
                  {[...closed]
                    .sort((a, b) => (b.closedAt ?? b.savedAt).localeCompare(a.closedAt ?? a.savedAt))
                    .map((trade) => (
                      <ListRow
                        key={trade.id}
                        to={`/trades/${trade.id}`}
                        selected={trade.id === id}
                        badge={<Badge label={trade.symbol.slice(0, 2)} seed={trade.symbol} />}
                        title={trade.name}
                        subtitle={`${trade.symbol} · ${trade.events.length} 次平仓`}
                        meta={
                          <span className={pnlClass(trade.realized)}>
                            {money(trade.realized, { sign: true })}
                          </span>
                        }
                      />
                    ))}
                </ListGroup>
              )}
            </>
          )}
        </ListPane>
      }
    >
      {selected && selectedMetrics ? (
        <PositionView
          key={selected.id}
          metrics={selectedMetrics}
          refresh={live.reload}
          refreshing={live.loading}
          onDelete={() => {
            if (window.confirm(`删除「${selected.name}」？此操作只影响本机数据。`)) {
              deleteTrade(selected.id);
              navigate("/trades");
            }
          }}
        />
      ) : (
        <>
          <PaneHeader title="持仓" subtitle="实时估值 · 保存在本机" />
          <EmptyDetail
            title={trades.length ? "选择一笔持仓" : "还没有保存的策略"}
            body={
              trades.length
                ? "每笔持仓都按当前行情重新估值，显示未实现盈亏、组合希腊值与逐腿市值。"
                : "在构建器里搭好一笔多腿持仓，保存后会在这里按实时行情跟踪盈亏。"
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

/* ------------------------------------------------------------ portfolio card */

function PortfolioCard({
  portfolio,
  loading,
}: {
  portfolio: PortfolioMetrics;
  loading: boolean;
}) {
  return (
    <div className="mx-3 mt-3 rounded-xl border border-line bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-faint">组合未实现</span>
        {loading && <span className="text-[11px] text-faint">更新中…</span>}
      </div>
      <p className={`mt-1 text-[24px] font-semibold leading-7 tnum ${pnlClass(portfolio.unrealized)}`}>
        {money(portfolio.unrealized, { sign: true })}
      </p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] tnum">
        <span className={pnlClass(portfolio.netUnrealized)}>
          清算后 {money(portfolio.netUnrealized, { sign: true })}
        </span>
        <span className="text-faint">费用 {money(portfolio.fees)}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line-subtle pt-2">
        <MiniStat label="已实现" value={money(portfolio.realized, { sign: true })} tone={pnlClass(portfolio.realized)} />
        <MiniStat label="Delta" value={num(portfolio.delta, 0)} />
        <MiniStat label="Theta/日" value={money(portfolio.theta)} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-faint">
        <span>{portfolio.totalOpen} 笔未平仓</span>
        <span className="tnum">占用 {money(portfolio.margin)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
        <span>买入腿按买价、卖出腿按卖价清算</span>
        <span>
          {loading
            ? "行情加载中…"
            : portfolio.online > 0
              ? `${portfolio.online} 个标的在线`
              : "离线模型报价"}
        </span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-0.5 truncate text-[12px] font-medium tnum ${tone ?? "text-muted"}`}>{value}</p>
    </div>
  );
}

/* --------------------------------------------------------------- position */

function PositionView({
  metrics,
  refresh,
  refreshing,
  onDelete,
}: {
  metrics: PositionMetrics;
  refresh: () => void;
  refreshing: boolean;
  onDelete: () => void;
}) {
  const trade = metrics.trade;
  const open = hasOpenLegs(trade);
  const openLegs = metrics.legs.filter((item) => item.leg.qty > 0);
  const events = useEvents();
  const upcoming = eventsUntil(events, trade.symbol, trade.expiry);
  const [closing, setClosing] = useState<{ legId: string; qty: string; price: string } | null>(
    null,
  );
  const expiry = expiryLabel(trade.expiry);
  const rebuildHref = open
    ? `/calculator?ticker=${trade.symbol}&expiry=${trade.expiry}&legs=${encodeDraft({
        name: trade.name,
        symbol: trade.symbol,
        expiry: trade.expiry,
        legs: openLegs.map((item) => item.leg),
      })}`
    : null;

  const closeAll = () => {
    if (!openLegs.length) return;
    const marks = Object.fromEntries(
      openLegs.map((item) => [
        item.leg.id,
        metrics.closeMarks[item.leg.id] ?? item.mark,
      ]),
    );
    const estimate = openLegs.reduce(
      (sum, item) =>
        sum +
        item.leg.side *
          item.leg.qty *
          100 *
          ((metrics.closeMarks[item.leg.id] ?? item.mark) - item.leg.fill),
      0,
    );
    if (
      !window.confirm(
        `按当前买卖价平掉全部 ${openLegs.length} 条腿？预计已实现 ${money(estimate, { sign: true })}（未扣费用）。`,
      )
    ) {
      return;
    }
    closeTrade(trade.id, marks);
  };

  return (
    <>
      <PaneHeader
        title={trade.name}
        subtitle={`${trade.symbol} · ${expiry} · ${open ? `开仓于 ${dayLabel(trade.openedAt)}` : `已平仓 ${dayLabel(trade.closedAt ?? trade.savedAt)}`}`}
      >
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="btn-secondary h-7 px-2.5 disabled:opacity-40"
        >
          <Repeat size={12} />
          刷新
        </button>
        {rebuildHref && (
          <Link to={rebuildHref} className="btn-secondary h-7 px-2.5">
            在构建器中重建
          </Link>
        )}
        {open && (
          <button type="button" onClick={closeAll} className="btn-secondary h-7 px-2.5">
            全部平仓
          </button>
        )}
        <button type="button" onClick={onDelete} className="btn-ghost h-7 px-2 text-loss">
          <Trash size={13} />
          删除
        </button>
      </PaneHeader>

      <DetailScroll>
        <div className="max-w-[980px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-white px-3 py-2 text-[11px] text-dim">
            <span className="font-medium text-text tnum">${price(metrics.spot)}</span>
            <span>IV {metrics.iv > 0 ? `${(metrics.iv * 100).toFixed(1)}%` : "—"}</span>
            <span>
              {open ? `最近到期 ${metrics.dte >= 0 ? `${metrics.dte} 天` : "—"}` : "已平仓"}
            </span>
            <span className={metrics.online ? "text-profit" : "text-faint"}>
              {refreshing && !metrics.online
                ? "行情加载中…"
                : metrics.online
                  ? `CBOE 延迟 · ${metrics.asOf ?? "最近收盘"}`
                  : "离线模型报价"}
            </span>
            {metrics.expired && <span className="text-loss">含已到期合约，按内在价值计</span>}
            {upcoming.length > 0 && (
              <span className="text-loss">
                跨过 {upcoming.map(eventLabel).join("、")}
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="中间价盈亏" value={money(metrics.unrealized, { sign: true })} tone={pnlClass(metrics.unrealized)} />
            <SummaryCard label="清算盈亏" value={money(metrics.liqUnrealized, { sign: true })} tone={pnlClass(metrics.liqUnrealized)} />
            <SummaryCard label="费用（往返）" value={money(metrics.fees)} tone="text-dim" />
            <SummaryCard label="净盈亏（清算后）" value={money(metrics.netUnrealized, { sign: true })} tone={pnlClass(metrics.netUnrealized)} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-line bg-white px-3 py-2 text-[11px]">
            <span className="text-faint">组合希腊值</span>
            <Greek label="Δ" value={num(metrics.delta, 0)} />
            <Greek label="Γ" value={num(metrics.gamma, 2)} />
            <Greek label="Θ/日" value={money(metrics.theta, { cents: true })} />
            <Greek label="Vega/点" value={money(metrics.vega, { cents: true })} />
            <span className="ml-auto flex items-baseline gap-1">
              <span className="text-faint">占用购买力</span>
              <span className="font-medium text-muted tnum">
                {money(metrics.margin.requirement)}
              </span>
              <span className="text-[11px] text-faint">
                {metrics.margin.kind === "naked"
                  ? "含裸卖"
                  : metrics.margin.kind === "defined"
                    ? "定义风险"
                    : "无期权腿"}
              </span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 px-1 text-[11px] text-faint tnum">
            <span>已实现 {money(metrics.realized, { sign: true })}</span>
            <span>总盈亏 {money(metrics.total, { sign: true })}</span>
            <span>当前市值 {money(metrics.marketValue)}</span>
            <span>价差成本 {money(metrics.spreadCost)}</span>
            {metrics.margin.stockExcluded && <span>正股保证金未计入</span>}
            {metrics.margin.crossExpiry && <span>跨到期日分别估算</span>}
          </div>

          {open && openLegs.length > 0 && (
            <section className="mt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[13px] font-semibold">到期盈亏</h2>
                <span className="text-[11px] text-faint">
                  按当前剩余期限与实时 IV 估算
                </span>
              </div>
              <div className="mt-2 rounded-xl border border-line bg-white p-3">
                <PayoffChart
                  legs={openLegs.map((item) => item.leg)}
                  spot={metrics.spot}
                  iv={metrics.iv}
                  dte={Math.max(metrics.dte, 0)}
                  expiryLabel={expiry}
                  mode="pnl"
                  envelope={0}
                  height={300}
                />
              </div>
            </section>
          )}

          <section className="mt-4">
            <h2 className="text-[13px] font-semibold">持仓腿</h2>
            <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
              <div className="grid grid-cols-[44px_36px_minmax(0,1fr)_72px_72px_88px_64px_48px] gap-2 border-b border-line-subtle bg-[#fbfaf8] px-3 py-1.5 text-[11px] font-medium text-faint">
                <span>方向</span>
                <span className="text-right">数量</span>
                <span>合约</span>
                <span className="text-right">开仓价</span>
                <span className="text-right">现价</span>
                <span className="text-right">盈亏</span>
                <span className="text-right">剩余</span>
                <span />
              </div>
              {metrics.legs.map((item) => (
                <LegRow
                  key={item.leg.id}
                  item={item}
                  closing={closing}
                  setClosing={setClosing}
                  onClose={(legId, qty, mark) => {
                    closeLeg(trade.id, legId, qty, mark);
                    setClosing(null);
                  }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-faint">
              现价为 CBOE 延迟行情的买卖中间价；清算价按买入腿卖在买价、卖出腿买回在卖价估算。
              费用默认每张合约每边 $0.69，可在设置中调整；保证金为估算值，不含正股融资。
              平仓操作只记录本机盈亏，不会发送到券商。
            </p>
          </section>

          {trade.events.length > 0 && (
            <section className="mt-4">
              <h2 className="text-[13px] font-semibold">平仓记录</h2>
              <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
                {[...trade.events].reverse().map((event) => {
                  const leg = trade.legs.find((item) => item.id === event.legId);
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 border-b border-line-subtle px-3 py-2 text-[12px] last:border-0"
                    >
                      <span className="w-12 shrink-0 text-faint">{dayLabel(event.at)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">
                        {leg
                          ? `${leg.kind === "call" ? "C" : leg.kind === "put" ? "P" : "股"}${leg.kind === "stock" ? "" : leg.strike}`
                          : "已删除的腿"}{" "}
                        · 平 {event.qty} 张 @ ${price(event.price)}
                      </span>
                      <span className={`shrink-0 font-medium tnum ${pnlClass(event.realized)}`}>
                        {money(event.realized, { sign: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </DetailScroll>
    </>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-0.5 text-[16px] font-semibold tnum ${tone ?? "text-text"}`}>{value}</p>
    </div>
  );
}

function Greek({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-faint">{label}</span>
      <span className="font-medium text-muted tnum">{value}</span>
    </span>
  );
}

function LegRow({
  item,
  closing,
  setClosing,
  onClose,
}: {
  item: PositionLeg;
  closing: { legId: string; qty: string; price: string } | null;
  setClosing: (value: { legId: string; qty: string; price: string } | null) => void;
  onClose: (legId: string, qty: number, price: number) => void;
}) {
  const leg = item.leg;
  const editing = closing?.legId === leg.id;
  const qty = Math.min(Math.max(1, Math.floor(Number(closing?.qty ?? leg.qty))), leg.qty);
  const fillPrice = Number(closing?.price ?? item.mark);
  const estimate =
    Number.isFinite(fillPrice) && qty > 0 ? leg.side * qty * 100 * (fillPrice - leg.fill) : 0;

  return (
    <div className="border-b border-line-subtle px-3 py-2 text-[12px] last:border-0">
      <div className="grid grid-cols-[44px_36px_minmax(0,1fr)_72px_72px_88px_64px_48px] items-center gap-2">
        <span
          className={`w-8 rounded px-1 py-0.5 text-center text-[11px] font-medium ${
            leg.side === -1 ? "bg-loss-soft text-loss" : "bg-profit-soft text-profit"
          }`}
        >
          {leg.side === -1 ? "卖出" : "买入"}
        </span>
        <span className="text-right tnum text-dim">{leg.qty}</span>
        <span className="min-w-0 truncate">
          <span className="font-medium">
            {leg.kind === "call" ? "看涨" : leg.kind === "put" ? "看跌" : "正股"}
          </span>
          <span className="ml-1 tnum text-muted">
            {leg.kind === "stock" ? `@ $${price(leg.fill)}` : leg.strike}
          </span>
          {leg.kind !== "stock" && (
            <span className="ml-1 text-[11px] text-faint">{expiryLabel(leg.expiry)}</span>
          )}
        </span>
        <span className="text-right tnum text-muted">{leg.kind === "stock" ? "—" : price(leg.fill)}</span>
        <span className="text-right tnum">
          {price(item.mark)}
          <span className="ml-1 text-[11px] text-faint">
            {item.source === "live" ? "实时" : item.source === "expired" ? "到期" : item.source === "stock" ? "" : "模型"}
          </span>
          <span className="mt-0.5 block text-[11px] text-faint tnum">
            清算 {price(item.liqMark)}
          </span>
        </span>
        <span className={`text-right font-medium tnum ${pnlClass(item.pnl)}`}>
          {leg.qty > 0 ? money(item.pnl, { sign: true }) : "—"}
          {leg.qty > 0 && Math.abs(item.liqPnl - item.pnl) >= 1 && (
            <span className={`mt-0.5 block text-[11px] font-normal ${pnlClass(item.liqPnl)}`}>
              清算 {money(item.liqPnl, { sign: true })}
            </span>
          )}
        </span>
        <span className="text-right text-[11px] text-faint">
          {leg.qty <= 0 ? "已平" : leg.kind === "stock" ? "—" : item.dte < 0 ? "已到期" : `${item.dte}天`}
        </span>
        <span className="text-right">
          {leg.qty > 0 && (
            <button
              type="button"
              onClick={() =>
                editing
                  ? setClosing(null)
                  : setClosing({ legId: leg.id, qty: String(leg.qty), price: item.liqMark.toFixed(2) })
              }
              className="text-[11px] font-medium text-accent hover:underline"
            >
              {editing ? "取消" : "平仓"}
            </button>
          )}
        </span>
      </div>

      {editing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!Number.isFinite(fillPrice) || fillPrice < 0 || qty <= 0) return;
            if (closing?.price.trim() === "") return;
            onClose(leg.id, qty, fillPrice);
          }}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-accent-line bg-accent-soft/40 p-2"
        >
          <label className="block">
            <span className="text-[11px] text-dim">平仓数量</span>
            <input
              type="number"
              min={1}
              max={leg.qty}
              step={1}
              value={closing?.qty ?? String(leg.qty)}
              onChange={(event) =>
                setClosing({ legId: leg.id, qty: event.target.value, price: closing?.price ?? item.liqMark.toFixed(2) })
              }
              className="mt-0.5 block h-7 w-16 rounded border border-line bg-white px-1.5 text-[12px] tnum outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-dim">成交价</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={closing?.price ?? item.liqMark.toFixed(2)}
              onChange={(event) =>
                setClosing({ legId: leg.id, qty: closing?.qty ?? String(leg.qty), price: event.target.value })
              }
              className="mt-0.5 block h-7 w-20 rounded border border-line bg-white px-1.5 text-[12px] tnum outline-none focus:border-accent"
            />
          </label>
          <span className="pb-1 text-[11px] text-dim">
            预计已实现{" "}
            <span className={`font-medium tnum ${pnlClass(estimate)}`}>
              {money(estimate, { sign: true })}
            </span>
          </span>
          <button type="submit" className="btn-primary h-7 px-2.5">
            确认平仓
          </button>
        </form>
      )}
    </div>
  );
}
