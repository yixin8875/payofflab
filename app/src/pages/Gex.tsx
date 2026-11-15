import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { GexChart } from "../components/GexChart";
import { GexGreekChart, type GexGreek } from "../components/GexGreekChart";
import { GexHeatmap } from "../components/GexHeatmap";
import { GexProfileChart } from "../components/GexProfileChart";
import { GexTermChart } from "../components/GexTermChart";
import { ArrowRight, Calendar, Repeat } from "../components/Icons";
import { SymbolRail } from "../components/SymbolRail";
import { WatchlistMenu } from "../components/WatchlistMenu";
import { DetailScroll, EmptyDetail, PaneHeader, Split } from "../desktop/Split";
import { SYMBOL_COUNT } from "../data/tickers";
import { pct, price } from "../lib/format";
import {
  computeGex,
  computeGexProfile,
  gexLabel,
  strikeLabel,
  type GexOptions,
  type GexRange,
  type GexUnit,
  type GexWeight,
} from "../lib/gex";
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
  const [weight, setWeight] = useState<GexWeight>("oi");
  const [moneyness, setMoneyness] = useState<number | null>(null);
  const [unit, setUnit] = useState<GexUnit>("pct");
  const [refreshSec, setRefreshSec] = useState(0);
  const [greek, setGreek] = useState<GexGreek>("vanna");
  const options = useMemo<GexOptions>(
    () => ({ weight, moneyness, unit }),
    [weight, moneyness, unit],
  );

  const effectiveRange = useMemo<GexRange>(() => {
    if (range.kind === "expiry" && chain && !chain.expiries.some((e) => e.iso === range.iso)) {
      return { kind: "all" };
    }
    return range;
  }, [range, chain]);

  const gex = useMemo(
    () => (chain ? computeGex(chain, effectiveRange, options) : null),
    [chain, effectiveRange, options],
  );

  const profile = useMemo(
    () => (chain ? computeGexProfile(chain, effectiveRange, options) : null),
    [chain, effectiveRange, options],
  );

  // Gamma scales roughly with 1/IV. All three scenario columns are recomputed
  // with the same Black-Scholes model so the comparison is like-for-like.
  const ivBase = useMemo(
    () => (chain ? computeGex(chain, effectiveRange, { ...options, ivScale: 1 }) : null),
    [chain, effectiveRange, options],
  );
  const ivDown = useMemo(
    () => (chain ? computeGex(chain, effectiveRange, { ...options, ivScale: 0.7 }) : null),
    [chain, effectiveRange, options],
  );
  const ivUp = useMemo(
    () => (chain ? computeGex(chain, effectiveRange, { ...options, ivScale: 1.3 }) : null),
    [chain, effectiveRange, options],
  );

  const shares = useMemo(() => {
    if (!gex) return null;
    let gross = 0;
    let zeroDte = 0;
    let week = 0;
    let month = 0;
    for (const row of gex.byExpiry) {
      const value = row.call + Math.abs(row.put);
      gross += value;
      if (row.dte <= 0) zeroDte += value;
      if (row.dte <= 7) week += value;
      if (row.dte <= 30) month += value;
    }
    if (!(gross > 0)) return null;
    return { zeroDte: zeroDte / gross, week: week / gross, month: month / gross };
  }, [gex]);

  // Auto-refresh forces the cached chain loader; skip while a request is in
  // flight or the window is hidden.
  const reloadRef = useRef(live.reload);
  reloadRef.current = live.reload;
  const loadingRef = useRef(live.loading);
  loadingRef.current = live.loading;
  useEffect(() => {
    if (!refreshSec) return;
    const id = window.setInterval(() => {
      if (!loadingRef.current && document.visibilityState === "visible") {
        reloadRef.current();
      }
    }, refreshSec * 1000);
    return () => window.clearInterval(id);
  }, [refreshSec]);

  // Delta versus the previous snapshot with the same filter signature.
  const signature = `${effectiveRange.kind}:${
    effectiveRange.kind === "expiry" ? effectiveRange.iso : ""
  }|${weight}|${moneyness ?? "all"}|${unit}`;
  const baselines = useRef(new Map<string, number>());
  const [totalDelta, setTotalDelta] = useState<number | null>(null);
  useEffect(() => {
    if (!gex) return;
    const previous = baselines.current.get(signature);
    if (previous == null) {
      baselines.current.set(signature, gex.total);
      setTotalDelta(null);
      return;
    }
    setTotalDelta(gex.total - previous);
    baselines.current.set(signature, gex.total);
  }, [gex, signature]);

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

  const weightText = weight === "volume" ? "成交量" : "未平仓量";
  const unitText = unit === "pct" ? "每 1% 波动" : "每 1 点波动";
  const flipValue =
    !gex || gex.flip == null
      ? "无交叉"
      : gex.flipZone
        ? `$${strikeLabel(gex.flipZone.low)}–$${strikeLabel(gex.flipZone.high)}`
        : `$${price(gex.flip)}`;

  const flipText = (value: number | null | undefined) =>
    value == null ? "无交叉" : `$${price(value)}`;
  const wallText = (wall: { strike: number } | null | undefined) =>
    wall ? `$${strikeLabel(wall.strike)}` : "—";
  const shockRows = gex
    ? [
        {
          label: "总 GEX",
          cells: [ivBase?.total, ivDown?.total, ivUp?.total].map((value) => ({
            text: value == null ? "—" : gexLabel(value, { sign: true }),
            tone: value == null ? 0 : value >= 0 ? 1 : -1,
          })),
        },
        {
          label: "Gamma Flip",
          cells: [ivBase?.flip, ivDown?.flip, ivUp?.flip].map((value) => ({
            text: flipText(value),
            tone: 0,
          })),
        },
        {
          label: "Call Wall",
          cells: [ivBase?.callWall, ivDown?.callWall, ivUp?.callWall].map((wall) => ({
            text: wallText(wall),
            tone: 0,
          })),
        },
        {
          label: "Put Wall",
          cells: [ivBase?.putWall, ivDown?.putWall, ivUp?.putWall].map((wall) => ({
            text: wallText(wall),
            tone: 0,
          })),
        },
        {
          label: "Call Wall 强度",
          cells: [ivBase?.callWall, ivDown?.callWall, ivUp?.callWall].map((wall) => ({
            text: wall ? gexLabel(wall.value) : "—",
            tone: 0,
          })),
        },
        {
          label: "Put Wall 强度",
          cells: [ivBase?.putWall, ivDown?.putWall, ivUp?.putWall].map((wall) => ({
            text: wall ? gexLabel(wall.value) : "—",
            tone: 0,
          })),
        },
        {
          label: "前 5 档集中度",
          cells: [ivBase, ivDown, ivUp].map((result) => ({
            text: result ? `${Math.round(result.concentration * 100)}%` : "—",
            tone: 0,
          })),
        },
      ]
    : [];

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
                <RangePill
                  active={effectiveRange.kind === "month"}
                  onClick={() => setRange({ kind: "month" })}
                >
                  30 天内
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
                  {gex.includedExpiries} 个到期日 · 按{weightText}加权
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <ControlGroup label="权重">
                  <RangePill active={weight === "oi"} onClick={() => setWeight("oi")}>
                    未平仓量
                  </RangePill>
                  <RangePill active={weight === "volume"} onClick={() => setWeight("volume")}>
                    成交量
                  </RangePill>
                </ControlGroup>
                <ControlGroup label="行权价">
                  <RangePill active={moneyness === null} onClick={() => setMoneyness(null)}>
                    全部
                  </RangePill>
                  <RangePill active={moneyness === 0.2} onClick={() => setMoneyness(0.2)}>
                    平值 ±20%
                  </RangePill>
                </ControlGroup>
                <ControlGroup label="单位">
                  <RangePill active={unit === "pct"} onClick={() => setUnit("pct")}>
                    每 1%
                  </RangePill>
                  <RangePill active={unit === "point"} onClick={() => setUnit("point")}>
                    每 1 点
                  </RangePill>
                </ControlGroup>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[11px] text-faint">自动刷新</span>
                  <select
                    aria-label="自动刷新间隔"
                    value={refreshSec}
                    onChange={(event) => setRefreshSec(Number(event.target.value))}
                    className="h-6 rounded-lg border border-line bg-white px-1.5 text-[12px] text-dim"
                  >
                    <option value={0}>关闭</option>
                    <option value={60}>1 分钟</option>
                    <option value={300}>5 分钟</option>
                  </select>
                </div>
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
                      sub={
                        <>
                          {unitText}
                          {totalDelta != null && totalDelta !== 0 && (
                            <span className={totalDelta > 0 ? "text-profit" : "text-loss"}>
                              {" · "}较上次 {gexLabel(totalDelta, { sign: true })}
                            </span>
                          )}
                        </>
                      }
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
                      value={flipValue}
                      sub={
                        gex.flip != null
                          ? gex.flipZone
                            ? "±3% 内的零轴交叉区间"
                            : distanceText(gex.flip)
                          : "当前范围未出现零轴交叉"
                      }
                    />
                    <Stat
                      label="Call Wall"
                      value={gex.callWall ? `$${strikeLabel(gex.callWall.strike)}` : "—"}
                      sub={
                        gex.callWall
                          ? `${distanceText(gex.callWall.strike)} · ±2 档 ${gexLabel(
                              Math.abs(gex.callWall.thick),
                            )}`
                          : "没有正 gamma 集中"
                      }
                    />
                    <Stat
                      label="Put Wall"
                      value={gex.putWall ? `$${strikeLabel(gex.putWall.strike)}` : "—"}
                      sub={
                        gex.putWall
                          ? `${distanceText(gex.putWall.strike)} · ±2 档 ${gexLabel(
                              Math.abs(gex.putWall.thick),
                            )}`
                          : "没有负 gamma 集中"
                      }
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-[#fbfaf8] px-3 py-1.5 text-[11px]">
                    <InlineMetric
                      label="Call/Put Gamma"
                      value={
                        gex.callPutRatio != null ? `${gex.callPutRatio.toFixed(2)}×` : "—"
                      }
                    />
                    <InlineMetric
                      label="前 5 档集中度"
                      value={`${Math.round(gex.concentration * 100)}%`}
                    />
                    <span className="ml-auto text-faint">
                      {weightText} · {moneyness != null ? "平值 ±20%" : "全部行权价"}
                    </span>
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
                        {unitText} · 最近 {gex.chartStrikes.length} 个行权价
                      </span>
                    </div>
                    <GexChart
                      strikes={gex.chartStrikes}
                      spot={gex.spot}
                      flip={gex.flip}
                      height={320}
                      weight={weight}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dim">
                      <Legend color="#0b7a52" label="正 GEX（看涨）" />
                      <Legend color="#bf3b2b" label="负 GEX（看跌）" />
                      <Legend color="#6f6a63" label="现价" dashed />
                      <Legend color="#0364d3" label="Gamma Flip" dashed />
                      <span className="ml-auto text-faint">悬浮柱体查看该行权价明细</span>
                    </div>
                  </section>

                  {profile && (
                    <section className="mt-3 rounded-xl border border-line bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-[13px] font-semibold">现价移动后的 Gamma Profile</h2>
                          <p className="mt-0.5 text-[11px] text-dim">
                            固定当前持仓与各腿 IV，假设标的移动到不同价位时用 Black-Scholes
                            重算 gamma；蓝色虚线为该假设价格下净 Gamma 归零的价位。
                          </p>
                        </div>
                        <span className="text-[11px] text-faint tnum">±10% · {unitText}</span>
                      </div>
                      <GexProfileChart profile={profile} height={240} />
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dim">
                        <Legend color="#0b7a52" label="正 GEX 区域" />
                        <Legend color="#bf3b2b" label="负 GEX 区域" />
                        <Legend color="#6f6a63" label="现价" dashed />
                        <Legend color="#0364d3" label="零 Gamma" dashed />
                        <span className="ml-auto text-faint">悬浮曲线查看该价位的分解</span>
                      </div>
                    </section>
                  )}

                  <section className="mt-3 rounded-xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-[13px] font-semibold">IV 冲击下的结构</h2>
                        <p className="mt-0.5 text-[11px] text-dim">
                          把每条腿的 IV 同比例缩放后用 Black-Scholes 重算 gamma：财报后 IV
                          压缩时，墙与 Flip 通常一起向现价靠拢，膨胀时则向外散开。
                        </p>
                      </div>
                      <span className="text-[11px] text-faint tnum">{unitText}</span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-lg border border-line-subtle">
                      <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,1fr))] gap-2 border-b border-line-subtle bg-[#fbfaf8] px-3 py-1.5 text-[11px] font-medium text-faint">
                        <span>指标</span>
                        <span className="text-right">当前 IV</span>
                        <span className="text-right">IV −30%</span>
                        <span className="text-right">IV +30%</span>
                      </div>
                      {shockRows.map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,1fr))] gap-2 border-b border-line-subtle px-3 py-1.5 text-[12px] last:border-0"
                        >
                          <span className="text-dim">{row.label}</span>
                          {row.cells.map((cell, index) => (
                            <span
                              key={index}
                              className={`text-right tnum ${
                                index > 0 ? "text-muted" : "text-text"
                              } ${
                                cell.tone > 0
                                  ? "text-profit"
                                  : cell.tone < 0
                                    ? "text-loss"
                                    : ""
                              }`}
                            >
                              {cell.text}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-faint">
                      三列都由各腿 IV 经 Black-Scholes 重算 gamma，只比较 IV 的影响；因此中间列可能与上方按交易所 gamma 的统计略有出入。
                    </p>
                  </section>

                  <GexHeatmap
                    chain={chain}
                    options={options}
                    onSelectExpiry={(iso) => setRange({ kind: "expiry", iso })}
                  />

                  <section className="mt-3 rounded-xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-[13px] font-semibold">Gamma 期限结构</h2>
                        <p className="mt-0.5 text-[11px] text-dim">
                          净 Gamma 按到期日展开；指数上近月与 0DTE 的占比通常比总量更有解释力。
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <InlineMetric
                          label="0DTE"
                          value={shares ? `${Math.round(shares.zeroDte * 100)}%` : "—"}
                        />
                        <InlineMetric
                          label="7 天内"
                          value={shares ? `${Math.round(shares.week * 100)}%` : "—"}
                        />
                        <InlineMetric
                          label="30 天内"
                          value={shares ? `${Math.round(shares.month * 100)}%` : "—"}
                        />
                      </div>
                    </div>
                    <GexTermChart rows={gex.byExpiry} height={180} />
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dim">
                      <Legend color="#0b7a52" label="正 GEX" />
                      <Legend color="#bf3b2b" label="负 GEX" />
                      <span className="ml-auto text-faint">
                        共 {gex.byExpiry.length} 个到期日，显示最近{" "}
                        {Math.min(16, gex.byExpiry.length)} 个
                      </span>
                    </div>
                  </section>

                  <section className="mt-3 rounded-xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-[13px] font-semibold">二阶敞口：Vanna 与 Charm</h2>
                        <p className="mt-0.5 text-[11px] text-dim">
                          Vanna 是 delta 对 IV 的敏感度，Charm 是 delta 每天的时间衰减；两者按各腿
                          IV 用 Black-Scholes 计算，方向沿用 naive 口径（做市商持有相反方向）。
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <InlineMetric
                          label="净 Vanna"
                          value={gexLabel(gex.vannaTotal, { sign: true })}
                        />
                        <InlineMetric
                          label="净 Charm / 天"
                          value={gexLabel(gex.charmTotal, { sign: true })}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <ControlGroup label="指标">
                        <RangePill active={greek === "vanna"} onClick={() => setGreek("vanna")}>
                          Vanna
                        </RangePill>
                        <RangePill active={greek === "charm"} onClick={() => setGreek("charm")}>
                          Charm
                        </RangePill>
                      </ControlGroup>
                      <span className="text-[11px] text-faint">
                        {greek === "vanna"
                          ? "标的每变动 1 个波动点时，delta 敞口的美元变化"
                          : "每过一天，delta 敞口的美元变化"}
                      </span>
                      <span className="ml-auto text-[11px] text-faint tnum">
                        最近 {gex.chartStrikes.length} 个行权价
                      </span>
                    </div>
                    <GexGreekChart
                      strikes={gex.chartStrikes}
                      spot={gex.spot}
                      metric={greek}
                      height={170}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dim">
                      <Legend color="#0b7a52" label="正敞口" />
                      <Legend color="#bf3b2b" label="负敞口" />
                      <Legend color="#6f6a63" label="现价" dashed />
                      <span className="ml-auto text-faint">悬浮柱体查看数值</span>
                    </div>
                  </section>

                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    <section className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
                        <div>
                          <h2 className="text-[13px] font-semibold">到期日贡献</h2>
                          <p className="mt-0.5 text-[11px] text-dim">点击切换上方统计范围</p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-[11px] text-faint">
                          {gex.byExpiry.length} 个到期日
                        </span>
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
                        <span className="shrink-0 whitespace-nowrap text-[11px] text-faint">
                          前 8 个
                        </span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_80px_64px_64px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[11px] font-medium text-faint">
                        <span>行权价</span>
                        <span className="text-right">净 GEX</span>
                        <span className="text-right">
                          {weight === "volume" ? "看涨量" : "Call OI"}
                        </span>
                        <span className="text-right">
                          {weight === "volume" ? "看跌量" : "Put OI"}
                        </span>
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
                            {row.callWeight.toLocaleString("en-US")}
                          </span>
                          <span className="text-right text-[11px] text-dim tnum">
                            {row.putWeight.toLocaleString("en-US")}
                          </span>
                        </div>
                      ))}
                    </section>
                  </div>

                  <section className="mt-3 rounded-xl border border-line bg-[#fbfaf8] px-4 py-3 text-[11px] leading-4 text-dim">
                    <p>
                      <b className="font-medium text-muted">口径：</b>采用常见的 naive GEX——看涨记为正
                      gamma、看跌记为负，假设做市商持有相反方向。美元 gamma ={" "}
                      <span className="tnum">
                        {unit === "pct"
                          ? "gamma × 权重 × 100 × 现价² × 0.01"
                          : "gamma × 权重 × 100 × 现价"}
                      </span>
                      ，即标的每变动{unit === "pct" ? " 1% " : " 1 点 "}的美元敞口。
                    </p>
                    <p className="mt-1">
                      权重可切换为当日成交量（近似新增仓位）；「平值 ±20%」过滤深虚持仓，避免远月
                      LEAPS 与深度虚值的 OI 噪声。Gamma Profile 固定当前各腿 IV
                      与权重，用 Black-Scholes 重算不同假设价位下的 gamma，0DTE 按至少 1 天计。
                    </p>
                    <p className="mt-1">
                      Vanna 与 Charm 由各腿 IV 直接求二阶导：Vanna = −e<sup>−qT</sup>
                      φ(d1)·d2 / σ，Charm 为 delta 对日历时间的导数，再乘以合约数 × 100 ×
                      现价换成美元。IV 冲击情景把每条腿的 IV 乘以 0.7 / 1.3 后重算 gamma，用来回答“财报后这堵墙还在不在”。
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

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-0.5 text-[11px] text-faint">{label}</span>
      {children}
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-faint">{label}</span>
      <b className="font-semibold text-text tnum">{value}</b>
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
  sub: ReactNode;
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
