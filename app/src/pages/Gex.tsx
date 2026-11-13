import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { GexChart } from "../components/GexChart";
import { ArrowRight, Calendar, Repeat } from "../components/Icons";
import { SymbolRail } from "../components/SymbolRail";
import { WatchlistMenu } from "../components/WatchlistMenu";
import { DetailScroll, EmptyDetail, PaneHeader, Split } from "../desktop/Split";
import { SYMBOL_COUNT } from "../data/tickers";
import { pct, price } from "../lib/format";
import { computeGex, gexLabel, strikeLabel, type GexRange } from "../lib/gex";
import { useLiveChain } from "../lib/useLiveChain";

export default function Gex() {
  const { symbol } = useParams<{ symbol?: string }>();
  const selected = symbol?.toUpperCase();

  return (
    <Split
      list={
        <SymbolRail
          basePath="/gex"
          title="Gamma 敞口"
          count={SYMBOL_COUNT}
          selectedSymbol={selected}
        />
      }
    >
      {selected ? (
        <GexView key={selected} symbol={selected} />
      ) : (
        <>
          <PaneHeader title="Gamma 敞口" subtitle="按行权价拆解期权市场的 gamma 分布" />
          <EmptyDetail
            title="选择一个标的"
            body="查看按行权价展开的美元 gamma、Gamma Flip 水平与看涨/看跌行权价墙。指数 ETF 的读数通常比个股更有参考意义。"
            action={
              <Link to="/gex/spy" className="btn-secondary h-8 px-3">
                查看 SPY
                <ArrowRight size={12} />
              </Link>
            }
          />
        </>
      )}
    </Split>
  );
}

function GexView({ symbol }: { symbol: string }) {
  const live = useLiveChain(symbol);
  const chain = live.chain;
  const [range, setRange] = useState<GexRange>({ kind: "all" });

  const effectiveRange = useMemo<GexRange>(() => {
    if (range.kind === "expiry" && chain && !chain.expiries.some((e) => e.iso === range.iso)) {
      return { kind: "all" };
    }
    return range;
  }, [range, chain]);

  const gex = useMemo(
    () => (chain ? computeGex(chain, effectiveRange) : null),
    [chain, effectiveRange],
  );

  const topStrikes = useMemo(
    () =>
      gex
        ? [...gex.strikes].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 8)
        : [],
    [gex],
  );

  const expiryMax = useMemo(
    () => Math.max(1, ...(gex?.byExpiry.map((row) => Math.abs(row.net)) ?? [])),
    [gex],
  );

  const distanceText = (strike: number) => {
    if (!gex || !gex.spot) return "";
    const move = ((strike - gex.spot) / gex.spot) * 100;
    return `${move >= 0 ? "高于" : "低于"}现价 ${Math.abs(move).toFixed(1)}%`;
  };

  return (
    <>
      <PaneHeader
        title={`${symbol} · Gamma 敞口`}
        subtitle={
          chain
            ? `现价 $${price(chain.spot)} · IV30 ${pct(chain.iv30, 1)} · CBOE 延迟 ${chain.asOf}`
            : live.loading
              ? "正在获取 CBOE 延迟行情…"
              : "Gamma 敞口"
        }
      >
        <WatchlistMenu symbol={symbol} />
        <button
          type="button"
          onClick={live.reload}
          disabled={live.loading}
          className="btn-secondary h-7 px-2.5 disabled:opacity-40"
        >
          <Repeat size={12} />
          {live.loading ? "刷新中" : "刷新"}
        </button>
        <Link to={`/chain/${symbol.toLowerCase()}`} className="btn-primary h-7 px-2.5">
          期权链
          <ArrowRight size={12} />
        </Link>
      </PaneHeader>

      <DetailScroll wide>
        <div className="mx-auto w-full max-w-[1180px]">
          {!chain && live.loading && <LoadingState />}

          {!chain && !live.loading && live.error && (
            <div className="rounded-xl border border-line bg-white p-6 text-center">
              <p className="text-[13px] font-medium">在线行情不可用</p>
              <p className="mt-1 text-[12px] text-dim">{live.error}</p>
              <button type="button" onClick={live.reload} className="btn-secondary mt-3 h-7 px-2.5">
                重试
              </button>
            </div>
          )}

          {chain && gex && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 flex items-center gap-1 text-[11px] text-faint">
                  <Calendar size={12} />
                  范围
                </span>
                <RangePill
                  active={effectiveRange.kind === "all"}
                  onClick={() => setRange({ kind: "all" })}
                >
                  全部到期
                </RangePill>
                <RangePill
                  active={effectiveRange.kind === "week"}
                  onClick={() => setRange({ kind: "week" })}
                >
                  7 天内
                </RangePill>
                <select
                  aria-label="指定到期日"
                  value={effectiveRange.kind === "expiry" ? effectiveRange.iso : ""}
                  onChange={(event) =>
                    event.target.value
                      ? setRange({ kind: "expiry", iso: event.target.value })
                      : setRange({ kind: "all" })
                  }
                  className="h-6 rounded-lg border border-line bg-white px-1.5 text-[12px] text-dim"
                >
                  <option value="">指定到期日</option>
                  {chain.expiries.map((expiry) => (
                    <option key={expiry.iso} value={expiry.iso}>
                      {expiry.label} · {expiry.dte}天
                    </option>
                  ))}
                </select>
                <span className="ml-auto text-[11px] text-faint tnum">
                  {gex.includedExpiries} 个到期日 · 按未平仓量加权
                </span>
              </div>

              {live.error && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-[#fbfaf8] px-2.5 py-1.5 text-[11px] text-dim">
                  <span>刷新失败（{live.error}），正在显示上次的行情。</span>
                  <button
                    type="button"
                    onClick={live.reload}
                    className="font-medium text-accent hover:underline"
                  >
                    重试
                  </button>
                </div>
              )}

              {gex.strikes.length === 0 ? (
                <div className="mt-4 rounded-xl border border-line bg-white p-8 text-center">
                  <p className="text-[13px] font-medium">该范围没有可用的未平仓数据</p>
                  <p className="mt-1 text-[12px] text-dim">
                    试试「全部到期」，或刷新在线行情。
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    <Stat
                      label="总 GEX"
                      value={gexLabel(gex.total, { sign: true })}
                      sub="每 1% 标的波动"
                      tone={gex.total >= 0 ? "profit" : "loss"}
                    />
                    <Stat
                      label="Gamma 状态"
                      value={gex.total >= 0 ? "长 Gamma" : "短 Gamma"}
                      sub={gex.total >= 0 ? "正值集中 · 通常压制波动" : "负值集中 · 通常放大波动"}
                      tone={gex.total >= 0 ? "profit" : "loss"}
                    />
                    <Stat
                      label="Gamma Flip"
                      value={gex.flip != null ? `$${price(gex.flip)}` : "无交叉"}
                      sub={
                        gex.flip != null
                          ? distanceText(gex.flip)
                          : "当前范围未出现零轴交叉"
                      }
                    />
                    <Stat
                      label="Call Wall"
                      value={gex.callWall ? `$${strikeLabel(gex.callWall.strike)}` : "—"}
                      sub={
                        gex.callWall
                          ? `${distanceText(gex.callWall.strike)} · ${gexLabel(gex.callWall.value)}`
                          : "没有正 gamma 集中"
                      }
                    />
                    <Stat
                      label="Put Wall"
                      value={gex.putWall ? `$${strikeLabel(gex.putWall.strike)}` : "—"}
                      sub={
                        gex.putWall
                          ? `${distanceText(gex.putWall.strike)} · ${gexLabel(gex.putWall.value)}`
                          : "没有负 gamma 集中"
                      }
                    />
                  </div>

                  <section className="mt-3 rounded-xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-[13px] font-semibold">按行权价的 Gamma 敞口</h2>
                        <p className="mt-0.5 text-[11px] text-dim">
                          绿柱为看涨正 gamma，红柱为看跌负 gamma；虚线为现价与 Gamma Flip。
                        </p>
                      </div>
                      <span className="text-[11px] text-faint tnum">
                        每 1% 波动 · 最近 {gex.chartStrikes.length} 个行权价
                      </span>
                    </div>
                    <GexChart
                      strikes={gex.chartStrikes}
                      spot={gex.spot}
                      flip={gex.flip}
                      height={320}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dim">
                      <Legend color="#0b7a52" label="正 GEX（看涨）" />
                      <Legend color="#bf3b2b" label="负 GEX（看跌）" />
                      <Legend color="#6f6a63" label="现价" dashed />
                      <Legend color="#0364d3" label="Gamma Flip" dashed />
                      <span className="ml-auto text-faint">悬浮柱体查看该行权价明细</span>
                    </div>
                  </section>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <section className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
                        <div>
                          <h2 className="text-[13px] font-semibold">到期日贡献</h2>
                          <p className="mt-0.5 text-[11px] text-dim">点击切换上方统计范围</p>
                        </div>
                        <span className="text-[11px] text-faint">{gex.byExpiry.length} 个到期日</span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_44px_78px_52px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[11px] font-medium text-faint">
                        <span>到期日</span>
                        <span className="text-right">DTE</span>
                        <span className="text-right">净 GEX</span>
                        <span className="text-right">占比</span>
                      </div>
                      <div className="max-h-[268px] overflow-y-auto">
                        {gex.byExpiry.slice(0, 12).map((row) => {
                          const active =
                            effectiveRange.kind === "expiry" && effectiveRange.iso === row.iso;
                          return (
                            <button
                              key={row.iso}
                              type="button"
                              onClick={() => setRange({ kind: "expiry", iso: row.iso })}
                              className={`grid w-full grid-cols-[minmax(0,1fr)_44px_78px_52px] items-center gap-2 border-b border-line-subtle px-4 py-1.5 text-left last:border-0 hover:bg-hover ${
                                active ? "bg-accent-soft/60" : ""
                              }`}
                            >
                              <span
                                className={`truncate text-[12px] ${
                                  active ? "font-medium text-accent" : "text-text"
                                }`}
                              >
                                {row.label}
                              </span>
                              <span className="text-right text-[12px] text-dim tnum">{row.dte}</span>
                              <span
                                className={`text-right text-[12px] tnum ${
                                  row.net >= 0 ? "text-profit" : "text-loss"
                                }`}
                              >
                                {gexLabel(row.net, { sign: true })}
                              </span>
                              <span className="flex justify-end">
                                <span className="h-1 w-10 overflow-hidden rounded-full bg-[#eeebe5]">
                                  <span
                                    className={`block h-full rounded-full ${
                                      row.net >= 0 ? "bg-profit" : "bg-loss"
                                    }`}
                                    style={{
                                      width: `${Math.max(
                                        4,
                                        (Math.abs(row.net) / expiryMax) * 100,
                                      )}%`,
                                    }}
                                  />
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {gex.byExpiry.length > 12 && (
                        <p className="px-4 pb-2 pt-1 text-[11px] text-faint">
                          仅显示最近 12 个到期日；其余已计入统计。
                        </p>
                      )}
                    </section>

                    <section className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
                        <div>
                          <h2 className="text-[13px] font-semibold">Gamma 集中的行权价</h2>
                          <p className="mt-0.5 text-[11px] text-dim">按净 GEX 绝对值排序</p>
                        </div>
                        <span className="text-[11px] text-faint">前 8 个</span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_80px_64px_64px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[11px] font-medium text-faint">
                        <span>行权价</span>
                        <span className="text-right">净 GEX</span>
                        <span className="text-right">Call OI</span>
                        <span className="text-right">Put OI</span>
                      </div>
                      {topStrikes.map((row) => (
                        <div
                          key={row.strike}
                          className="grid grid-cols-[minmax(0,1fr)_80px_64px_64px] items-center gap-2 border-b border-line-subtle px-4 py-1.5 last:border-0"
                        >
                          <span className="flex items-baseline gap-1.5 text-[12px] tnum">
                            <b className="font-medium">{strikeLabel(row.strike)}</b>
                            <span className="text-[11px] text-faint">
                              {distanceText(row.strike)}
                            </span>
                          </span>
                          <span
                            className={`text-right text-[12px] tnum ${
                              row.net >= 0 ? "text-profit" : "text-loss"
                            }`}
                          >
                            {gexLabel(row.net, { sign: true })}
                          </span>
                          <span className="text-right text-[11px] text-dim tnum">
                            {row.callOi.toLocaleString("en-US")}
                          </span>
                          <span className="text-right text-[11px] text-dim tnum">
                            {row.putOi.toLocaleString("en-US")}
                          </span>
                        </div>
                      ))}
                    </section>
                  </div>

                  <section className="mt-3 rounded-xl border border-line bg-[#fbfaf8] px-4 py-3 text-[11px] leading-4 text-dim">
                    <p>
                      <b className="font-medium text-muted">口径：</b>采用常见的 naive GEX——看涨未平仓记为正
                      gamma、看跌记为负，假设做市商持有相反方向。美元 gamma ={" "}
                      <span className="tnum">gamma × 未平仓量 × 100 × 现价² × 0.01</span>，即标的价格每变动
                      1% 的美元敞口。
                    </p>
                    <p className="mt-1">
                      未平仓量为上一交易日收盘值，行情延迟 15 分钟；真实做市商持仓并不公开，因此该读数只是市场结构参考，不构成投资建议。
                    </p>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </DetailScroll>
    </>
  );
}

function RangePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 rounded-lg border px-2 text-[12px] font-medium transition-colors ${
        active
          ? "border-accent-line bg-accent-soft text-accent"
          : "border-line bg-white text-dim hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Legend({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-0 w-4 border-t"
        style={{ borderColor: color, borderTopStyle: dashed ? "dashed" : "solid" }}
      />
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-text";
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3">
      <p className="text-[11px] font-semibold text-faint">{label}</p>
      <p className={`mt-1 text-[18px] font-semibold leading-6 tnum ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-dim tnum">{sub}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-3" aria-label="正在载入 Gamma 敞口">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-[82px] rounded-xl border border-line bg-white" />
        ))}
      </div>
      <div className="h-[380px] rounded-xl border border-line bg-white" />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-[260px] rounded-xl border border-line bg-white" />
        <div className="h-[260px] rounded-xl border border-line bg-white" />
      </div>
    </div>
  );
}
