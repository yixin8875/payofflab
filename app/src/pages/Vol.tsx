import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Repeat } from "../components/Icons";
import { SymbolRail } from "../components/SymbolRail";
import { VolSkewChart } from "../components/VolSkewChart";
import { VolTermChart } from "../components/VolTermChart";
import { WatchlistMenu } from "../components/WatchlistMenu";
import { DetailScroll, EmptyDetail, PaneHeader, Split } from "../desktop/Split";
import { symbolName } from "../data/symbolGroups";
import { SYMBOL_COUNT } from "../data/tickers";
import { pct } from "../lib/format";
import {
  computeSkew,
  computeVolSurface,
  termShape,
  volPoints,
  type VolExpiry,
} from "../lib/vol";
import { useLiveChain } from "../lib/useLiveChain";



export default function Vol() {
  const { symbol } = useParams<{ symbol?: string }>();
  const selected = symbol?.toUpperCase();

  return (
    <Split
      list={
        <SymbolRail
          basePath="/vol"
          title="波动率曲面"
          count={SYMBOL_COUNT}
          selectedSymbol={selected}
        />
      }
    >
      {selected ? (
        <VolView key={selected} symbol={selected} />
      ) : (
        <>
          <PaneHeader
            title="波动率曲面"
            subtitle="IV 期限结构、25Δ 偏斜与单到期日微笑"
          />
          <EmptyDetail
            title="选择一个标的"
            body="比较近月与远月的 ATM IV，查看 25Δ Call / Put 的偏斜，再判断一笔交易是在赚方向、时间还是波动率。"
            action={
              <Link to="/vol/spy" className="btn-secondary h-8 px-3">
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

function VolView({ symbol }: { symbol: string }) {
  const live = useLiveChain(symbol);
  const chain = live.chain;
  const surface = useMemo(
    () => (chain ? computeVolSurface(chain) : null),
    [chain],
  );
  const [skewIso, setSkewIso] = useState("");

  const skewExpiry = useMemo(
    () =>
      surface?.expiries.find((row) => row.iso === skewIso) ??
      surface?.front ??
      null,
    [surface, skewIso],
  );
  const skew = useMemo(
    () =>
      chain && skewExpiry ? computeSkew(chain, skewExpiry.iso) : [],
    [chain, skewExpiry],
  );

  return (
    <>
      <PaneHeader
        title={`${symbol} · 波动率曲面`}
        subtitle={
          chain
            ? `${symbolName(symbol)} · ${chain.spot.toFixed(2)} · IV30 ${pct(chain.iv30, 1)} · CBOE 延迟 ${chain.asOf}`
            : live.loading
              ? "正在获取 CBOE 延迟行情…"
              : "IV 期限结构与偏斜"
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
            <div className="rounded-lg border border-line bg-white p-6 text-center">
              <p className="text-[12.5px] font-medium">在线行情不可用</p>
              <p className="mt-1 text-[11.5px] text-dim">{live.error}</p>
              <button
                type="button"
                onClick={live.reload}
                className="btn-secondary mt-3 h-7 px-2.5"
              >
                重试
              </button>
            </div>
          )}

          {chain && surface && (
            <>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                <Stat
                  label="IV30"
                  value={surface.iv30 > 0 ? pct(surface.iv30, 1) : "—"}
                  sub="CBOE 30 天隐含波动率"
                />
                <Stat
                  label="近月 ATM"
                  value={surface.front?.atm != null ? pct(surface.front.atm, 1) : "—"}
                  sub={
                    surface.front
                      ? `${surface.front.label} · ${surface.front.dte} 天`
                      : "没有可用报价"
                  }
                />
                <Stat
                  label="远月 ATM"
                  value={surface.back?.atm != null ? pct(surface.back.atm, 1) : "—"}
                  sub={
                    surface.back
                      ? `${surface.back.label} · ${surface.back.dte} 天`
                      : "只有一个可用到期日"
                  }
                />
                <Stat
                  label="期限斜率"
                  value={surface.slope != null ? volPoints(surface.slope) : "—"}
                  sub={termShape(surface.slope)}
                  tone={
                    surface.slope == null
                      ? "neutral"
                      : surface.slope > 0
                        ? "profit"
                        : surface.slope < 0
                          ? "loss"
                          : "neutral"
                  }
                />
                <Stat
                  label="近月 25Δ RR"
                  value={
                    surface.front?.rr != null ? volPoints(surface.front.rr) : "—"
                  }
                  sub="Call IV − Put IV"
                  tone={
                    surface.front?.rr == null
                      ? "neutral"
                      : surface.front.rr < 0
                        ? "loss"
                        : "profit"
                  }
                />
              </div>

              {live.error && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-line bg-[#fbfaf8] px-2.5 py-1.5 text-[10.5px] text-dim">
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

              <section className="mt-3 rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-[12px] font-semibold">IV 期限结构</h2>
                    <p className="mt-0.5 text-[10.5px] text-dim">
                      横轴按到期日等距排列；悬浮查看 ATM 与两侧 25Δ。
                    </p>
                  </div>
                  <span className="text-[10px] text-faint tnum">
                    {surface.expiries.length} 个到期日
                  </span>
                </div>
                <div className="mt-2">
                  <VolTermChart rows={surface.expiries} height={300} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-dim">
                  <Legend color="#0364d3" label="ATM" />
                  <Legend color="#0b7a52" label="25Δ Call" />
                  <Legend color="#bf3b2b" label="25Δ Put" />
                  <span className="ml-auto text-faint">
                    IV 为 CBOE 延迟快照，25Δ 取最接近 0.25 的挂牌合约
                  </span>
                </div>
              </section>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <section className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="text-[12px] font-semibold">单到期日偏斜</h2>
                      <p className="mt-0.5 text-[10.5px] text-dim">
                        低于现价用 Put IV，高于现价用 Call IV。
                      </p>
                    </div>
                    <select
                      aria-label="选择偏斜的到期日"
                      value={skewExpiry?.iso ?? ""}
                      onChange={(event) => setSkewIso(event.target.value)}
                      className="h-6 max-w-[190px] rounded-md border border-line bg-white px-1.5 text-[11px] text-dim"
                    >
                      {surface.expiries.map((row) => (
                        <option key={row.iso} value={row.iso}>
                          {row.label} · {row.dte}天
                        </option>
                      ))}
                    </select>
                  </div>
                  {skew.length >= 2 ? (
                    <div className="mt-2">
                      <VolSkewChart
                        points={skew}
                        spot={surface.spot}
                        atmStrike={skewExpiry?.atmStrike ?? null}
                        height={270}
                      />
                    </div>
                  ) : (
                    <div className="mt-6 rounded-md border border-line bg-[#fbfaf8] px-3 py-6 text-center text-[11px] text-dim">
                      这个到期日的可用 IV 报价不足，换一个到期日试试。
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-dim">
                    <Legend color="#0364d3" label="OTM IV" />
                    <Legend color="#0b7a52" label="25Δ Call" />
                    <Legend color="#bf3b2b" label="25Δ Put" />
                    <Legend color="#6f6a63" label="现价" dashed />
                  </div>
                </section>

                <Reading
                  front={surface.front}
                  back={surface.back}
                  slope={surface.slope}
                />
              </div>

              <section className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-subtle px-4 pb-2 pt-3">
                  <div>
                    <h2 className="text-[12px] font-semibold">按到期日展开</h2>
                    <p className="mt-0.5 text-[10.5px] text-dim">
                      点击一行，把上方偏斜图切到该到期日。
                    </p>
                  </div>
                  <span className="text-[10px] text-faint">25Δ 按 Delta 最近匹配</span>
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[760px] border-collapse text-[11px] tnum">
                    <thead className="sticky top-0 z-10 bg-[#fbfaf8]">
                      <tr className="border-b border-line-subtle text-[9.5px] uppercase tracking-wide text-faint">
                        <th className="px-4 py-1.5 text-left font-medium">到期日</th>
                        <th className="px-2 py-1.5 text-right font-medium">DTE</th>
                        <th className="px-2 py-1.5 text-right font-medium">ATM</th>
                        <th className="px-2 py-1.5 text-right font-medium">25Δ Call</th>
                        <th className="px-2 py-1.5 text-right font-medium">25Δ Put</th>
                        <th className="px-2 py-1.5 text-right font-medium">RR</th>
                        <th className="px-2 py-1.5 text-right font-medium">25Δ Fly</th>
                        <th className="px-4 py-1.5 text-right font-medium">报价数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surface.expiries.map((row) => {
                        const selected = skewExpiry?.iso === row.iso;
                        return (
                          <tr
                            key={row.iso}
                            onClick={() => setSkewIso(row.iso)}
                            className={`cursor-pointer border-b border-line-subtle last:border-0 ${
                              selected ? "bg-accent-soft/60" : "hover:bg-hover"
                            }`}
                          >
                            <td
                              className={`px-4 py-1.5 ${
                                selected ? "font-medium text-accent" : "text-text"
                              }`}
                            >
                              {row.label}
                            </td>
                            <td className="px-2 py-1.5 text-right text-dim">{row.dte}</td>
                            <td className="px-2 py-1.5 text-right">
                              {row.atm != null ? pct(row.atm, 1) : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-profit">
                              {row.call25 != null ? pct(row.call25, 1) : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-loss">
                              {row.put25 != null ? pct(row.put25, 1) : "—"}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right ${
                                row.rr == null
                                  ? "text-dim"
                                  : row.rr < 0
                                    ? "text-loss"
                                    : "text-profit"
                              }`}
                            >
                              {row.rr != null ? volPoints(row.rr) : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-dim">
                              {row.fly != null ? volPoints(row.fly) : "—"}
                            </td>
                            <td className="px-4 py-1.5 text-right text-faint">
                              {row.quotes}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <p className="mt-4 border-t border-line-subtle pt-3 text-[10px] leading-4 text-faint">
                CBOE 延迟行情约 15 分钟；25Δ 是最近挂牌合约的近似值，不是拟合曲面。
                期限斜率 = 最接近 90 天的到期日 ATM − 最近到期日 ATM，避开两年期
                LEAPS 的干扰；正值叫正向结构，负值叫倒挂。
                IV Rank / Percentile 需要历史样本，本页先展示实时期限结构与偏斜。
              </p>
            </>
          )}
        </div>
      </DetailScroll>
    </>
  );
}

function Reading({
  front,
  back,
  slope,
}: {
  front: VolExpiry | null;
  back: VolExpiry | null;
  slope: number | null;
}) {
  const slopeText =
    front?.atm == null || back?.atm == null || slope == null
      ? "至少需要两个有 ATM 报价的到期日，才能判断期限结构。"
      : slope > 0.005
        ? `远月 ATM 比近月高 ${Math.abs(slope * 100).toFixed(1)} 点，曲线正向。日历价差若买远卖近，要先确认这点差是否足够覆盖时间衰减。`
        : slope < -0.005
          ? `近月 ATM 反而比远月高 ${Math.abs(slope * 100).toFixed(1)} 点，曲线倒挂。常见于事件临近或压力期，近月保护更贵。`
          : `近远月 ATM 只差 ${Math.abs(slope * 100).toFixed(1)} 点，曲线接近平坦。单看期限结构的信息量有限。`;

  const rrText =
    front?.rr == null
      ? "这个到期日缺少可用的 25Δ Call / Put 报价。"
      : front.rr < 0
        ? `近月 25Δ Put 比 Call 高 ${Math.abs(front.rr * 100).toFixed(1)} 点。负 RR 表示下行保护更贵，指数上很常见，不等于方向判断。`
        : `近月 25Δ Call 比 Put 高 ${Math.abs(front.rr * 100).toFixed(1)} 点。正 RR 表示上行 IV 更贵，常见于强势或逼空环境。`;

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h2 className="text-[12px] font-semibold">怎么读这一页</h2>
      <div className="mt-2 space-y-2.5 text-[11.5px] leading-5 text-muted">
        <p>
          <b className="text-text">期限结构：</b>
          {slopeText}
        </p>
        <p>
          <b className="text-text">25Δ 偏斜：</b>
          {rrText}
        </p>
        <p>
          <b className="text-text">先问自己在交易什么：</b>
          做日历先看 ATM 期限差；做垂直先看 RR；做跨式先看 ATM 与两侧的绝对水平。
          只看 IV30 一个数，会把期限和偏斜的信息都压扁。
        </p>
      </div>
      <div className="mt-3 rounded-md border border-line bg-[#fbfaf8] px-3 py-2 text-[10.5px] leading-4 text-dim">
        25Δ RR = Call 25Δ IV − Put 25Δ IV；25Δ Fly =（Call + Put）/ 2 − ATM。
        两者都是相对定价的读数，不是方向信号。
      </div>
    </section>
  );
}

function Legend({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
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
    <div className="rounded-lg border border-line bg-white px-3.5 py-3">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-faint">{label}</p>
      <p className={`mt-1 text-[18px] font-semibold leading-6 tracking-[-0.02em] tnum ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-dim tnum">{sub}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-3" aria-label="正在载入波动率曲面">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-[82px] rounded-lg border border-line bg-white" />
        ))}
      </div>
      <div className="h-[360px] rounded-lg border border-line bg-white" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="h-[330px] rounded-lg border border-line bg-white" />
        <div className="h-[330px] rounded-lg border border-line bg-white" />
      </div>
    </div>
  );
}
