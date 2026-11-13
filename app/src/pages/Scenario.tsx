import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Repeat } from "../components/Icons";
import { ScenarioChart, type ScenarioPoint } from "../components/ScenarioChart";
import { ticker } from "../data/tickers";
import { Badge, EmptyDetail, PaneHeader, Workspace } from "../desktop/Split";
import { eventLabel, nextEvent, useEvents } from "../lib/events";
import { money, num } from "../lib/format";
import {
  betaWeightedDelta,
  DEFAULT_SCENARIO,
  maxDte,
  portfolioGreeks,
  portfolioMark,
  positionBreakdown,
  SPOT_RANGE,
  symbolRisks,
  type ScenarioInput,
  type ScenarioMode,
} from "../lib/scenario";
import { openTrades, useTrades } from "../lib/store";

const MODES: { value: ScenarioMode; label: string; hint: string }[] = [
  {
    value: "uniform",
    label: "统一",
    hint: "所有标的按同一百分比变动。",
  },
  {
    value: "beta",
    label: "Beta 加权",
    hint: "各标的按静态 beta 跟随大盘；beta 是近似值，可在逐标的模式覆盖。",
  },
  {
    value: "custom",
    label: "逐标的",
    hint: "在大盘冲击之上给单个标的加额外冲击，例如大盘不动、某只股票 −10%。",
  },
];

const STRESS_SPOTS = [-10, -5, 0, 5, 10];
const STRESS_IVS = [-10, -5, 0, 5, 10];

const signed = (v: number, digits = 0) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

const moveLabel = (v: number) => `${signed(v, Math.abs(v % 1) > 0.001 ? 1 : 0)}%`;

const sameMove = (a: Record<string, number>, b: Record<string, number>) =>
  JSON.stringify(a) === JSON.stringify(b);

export default function Scenario() {
  const allTrades = useTrades();
  const trades = useMemo(() => openTrades(allTrades), [allTrades]);
  const events = useEvents();
  const [input, setInput] = useState<ScenarioInput>({ ...DEFAULT_SCENARIO, days: 7 });

  const maxDays = useMemo(() => Math.max(1, maxDte(trades)), [trades]);
  const days = Math.min(input.days, maxDays);
  const legCount = useMemo(
    () => trades.reduce((sum, trade) => sum + trade.legs.length, 0),
    [trades],
  );
  const mode = MODES.find((item) => item.value === input.mode) ?? MODES[0];

  const singleName = useMemo(() => {
    const exposure = new Map<string, number>();
    for (const symbol of new Set(trades.map((trade) => trade.symbol))) {
      const spot = ticker(symbol).spot;
      const contracts = trades
        .filter((trade) => trade.symbol === symbol)
        .flatMap((trade) => trade.legs)
        .reduce((sum, leg) => sum + (leg.kind === "stock" ? 0 : Math.abs(leg.qty)), 0);
      exposure.set(symbol, spot * contracts);
    }
    const candidates = [...exposure.entries()]
      .filter(([symbol]) => {
        const group = ticker(symbol).group;
        return group !== "etf" && group !== "leveraged" && group !== "sector";
      })
      .sort((a, b) => b[1] - a[1]);
    return candidates[0]?.[0] ?? [...exposure.keys()][0] ?? "";
  }, [trades]);

  const presets = useMemo<{ label: string; value: ScenarioInput }[]>(() => {
    const base = { ...DEFAULT_SCENARIO, days: 0 };
    return [
      { label: "现状", value: base },
      { label: "大盘 +5%", value: { ...base, mode: "beta", marketPct: 5 } },
      { label: "大盘 −5%", value: { ...base, mode: "beta", marketPct: -5 } },
      {
        label: "单票 −10%",
        value: {
          ...base,
          mode: "custom",
          extras: singleName ? { [singleName]: -10 } : {},
        },
      },
      { label: "IV +5 点", value: { ...base, ivPts: 5 } },
      { label: "财报后 IV −30%", value: { ...base, ivCrushPct: 30 } },
      { label: "一周后", value: { ...base, days: 7 } },
    ];
  }, [singleName]);

  const scenario = useMemo<ScenarioInput>(() => ({ ...input, days }), [input, days]);

  const model = useMemo(() => {
    const current = portfolioMark(trades, DEFAULT_SCENARIO);
    const value = portfolioMark(trades, scenario);
    const g = portfolioGreeks(trades, scenario);
    const points: ScenarioPoint[] = Array.from({ length: 81 }, (_, i) => {
      const move = -SPOT_RANGE + (i * SPOT_RANGE * 2) / 80;
      return {
        move,
        current: portfolioMark(trades, {
          ...scenario,
          marketPct: move,
          ivPts: 0,
          ivCrushPct: 0,
          days: 0,
        }),
        scenario: portfolioMark(trades, { ...scenario, marketPct: move }),
      };
    });
    let best = points[0]?.scenario ?? 0;
    let worst = best;
    let bestAt = 0;
    let worstAt = 0;
    for (const point of points) {
      if (point.scenario > best) {
        best = point.scenario;
        bestAt = point.move;
      }
      if (point.scenario < worst) {
        worst = point.scenario;
        worstAt = point.move;
      }
    }
    const positions = positionBreakdown(trades, scenario);
    const dollarDelta = positions.reduce((sum, p) => sum + p.delta * p.spot * 0.01, 0);
    return {
      current,
      scenario: value,
      g,
      points,
      best,
      worst,
      bestAt,
      worstAt,
      positions,
      dollarDelta,
      risks: symbolRisks(trades, scenario),
      betaDelta: betaWeightedDelta(trades),
    };
  }, [trades, scenario]);

  const stress = useMemo(() => {
    const cells = STRESS_SPOTS.map((spot) =>
      STRESS_IVS.map((iv) =>
        portfolioMark(trades, { ...scenario, marketPct: spot, ivPts: iv }),
      ),
    );
    const maxAbs = Math.max(1, ...cells.flat().map(Math.abs));
    return { cells, maxAbs };
  }, [trades, scenario]);

  const apply = (patch: Partial<ScenarioInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));

  const applyPreset = (value: ScenarioInput) =>
    setInput({ ...value, days: Math.min(value.days, maxDays) });

  const isPreset = (value: ScenarioInput) =>
    value.mode === input.mode &&
    value.marketPct === input.marketPct &&
    value.ivPts === input.ivPts &&
    value.ivCrushPct === input.ivCrushPct &&
    Math.min(value.days, maxDays) === days &&
    sameMove(value.extras, input.extras);

  const setSymbolMove = (symbol: string, total: number) => {
    if (!Number.isFinite(total)) return;
    setInput((prev) => ({
      ...prev,
      extras: { ...prev.extras, [symbol]: total - prev.marketPct },
    }));
  };

  if (!trades.length) {
    return (
      <Workspace>
        <PaneHeader title="情景分析" subtitle="组合层压力测试" />
        <EmptyDetail
          title="还没有可分析的持仓"
          body="先在构建器里搭一笔策略并保存。情景分析会读取全部持仓，对标的、波动率与时间做冲击。"
          action={
            <Link to="/calculator" className="btn-primary h-8 px-3">
              打开构建器
              <ArrowRight size={12} />
            </Link>
          }
        />
      </Workspace>
    );
  }

  return (
    <Workspace>
      <PaneHeader
        title="情景分析"
        subtitle={`${trades.length} 笔持仓 · ${legCount} 条腿 · ${mode.label}冲击`}
      >
        <button
          type="button"
          onClick={() => setInput({ ...DEFAULT_SCENARIO, days: 0 })}
          className="btn-secondary h-7 px-2.5"
        >
          <Repeat size={12} />
          重置
        </button>
        <Link to="/calculator" className="btn-primary h-7 px-2.5">
          <Plus size={12} />
          新建策略
        </Link>
      </PaneHeader>

      <div className="scroll-pane flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-7 py-5">
          <div className="grid gap-3 lg:grid-cols-[268px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <section className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[13px] font-semibold">情景参数</h2>
                  <span className="text-[11px] text-faint">全组合</span>
                </div>

                <div className="mt-2.5 flex rounded-lg border border-line bg-surface p-0.5">
                  {MODES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => apply({ mode: item.value })}
                      className={`flex-1 rounded px-1 py-1 text-[11px] font-medium transition-colors ${
                        input.mode === item.value
                          ? "bg-white text-text shadow-sm"
                          : "text-dim hover:text-text"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-faint">{mode.hint}</p>

                <div className="mt-3.5 space-y-4">
                  <SliderRow
                    label={input.mode === "uniform" ? "标的涨跌" : "大盘涨跌"}
                    value={input.marketPct}
                    min={-SPOT_RANGE}
                    max={SPOT_RANGE}
                    step={1}
                    display={moveLabel(input.marketPct)}
                    minLabel={moveLabel(-SPOT_RANGE)}
                    maxLabel={moveLabel(SPOT_RANGE)}
                    onChange={(marketPct) => apply({ marketPct })}
                  />
                  <SliderRow
                    label="IV 变化"
                    value={input.ivPts}
                    min={-10}
                    max={10}
                    step={0.5}
                    display={`${signed(input.ivPts, 1)} 点`}
                    minLabel="−10"
                    maxLabel="+10"
                    onChange={(ivPts) => apply({ ivPts })}
                  />
                  <SliderRow
                    label="IV 压缩"
                    value={input.ivCrushPct}
                    min={0}
                    max={60}
                    step={5}
                    display={`−${input.ivCrushPct}%`}
                    minLabel="不压缩"
                    maxLabel="−60%"
                    onChange={(ivCrushPct) => apply({ ivCrushPct })}
                  />
                  <SliderRow
                    label="时间推移"
                    value={days}
                    min={0}
                    max={maxDays}
                    step={1}
                    display={`${days} 天`}
                    minLabel="今天"
                    maxLabel={`+${maxDays} 天`}
                    onChange={(value) => apply({ days: value })}
                  />
                </div>

                <div className="mt-4 border-t border-line-subtle pt-3">
                  <p className="text-[11px] font-semibold text-faint">
                    快速情景
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        data-selected={isPreset(preset.value) ? "true" : undefined}
                        onClick={() => applyPreset(preset.value)}
                        className="chip"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-line bg-white p-4">
                <h2 className="text-[13px] font-semibold">组合希腊值</h2>
                <dl className="mt-1 divide-y divide-line-subtle">
                  {[
                    ["Delta", `${num(model.g.delta, 0)} 股`],
                    ["Beta 加权 Delta", `${num(model.betaDelta, 0)} SPY 股`],
                    ["Gamma", num(model.g.gamma, 2)],
                    ["Theta", `${money(model.g.theta, { sign: true })} / 天`],
                    ["Vega", `${money(model.g.vega, { sign: true })} / 点`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-2 py-1.5">
                      <dt className="text-[12px] text-dim">{label}</dt>
                      <dd className="tnum text-[12px] font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] leading-4 text-faint">
                  Beta 加权按静态 beta 折算成 SPY 等值股数，用来比较不同标的的方向敞口。
                </p>
              </section>

              <p className="px-1 text-[11px] leading-4 text-faint">
                期权价格由 Black-Scholes 合成；beta 为近似值，不是回归结果。
                持仓页按中间价估值，因此这里的「当前」可能与持仓页的未实现盈亏不同。
              </p>
            </aside>

            <div className="min-w-0 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  label="情景盈亏"
                  value={money(model.scenario, { sign: true })}
                  sub={`较当前 ${money(model.scenario - model.current, { sign: true })}`}
                  tone={model.scenario >= 0 ? "profit" : "loss"}
                />
                <Stat
                  label="当前盈亏"
                  value={money(model.current, { sign: true })}
                  sub="按成交价计"
                  tone={model.current >= 0 ? "profit" : "loss"}
                />
                <Stat
                  label="净 Delta"
                  value={`${num(model.g.delta, 0)} 股`}
                  sub={`Beta 加权 ${num(model.betaDelta, 0)} SPY 股`}
                />
                <Stat
                  label="净 Vega"
                  value={money(model.g.vega, { sign: true })}
                  sub={`Theta ${money(model.g.theta, { sign: true })} / 天`}
                />
              </div>

              <section className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[13px] font-semibold">组合盈亏 vs 大盘涨跌</h2>
                    <p className="mt-0.5 text-[11px] text-dim">
                      {input.mode === "uniform"
                        ? "横轴为所有标的的统一涨跌幅；虚线为当前，实线为情景。"
                        : "横轴为大盘涨跌幅，各标的按 beta 或自定义冲击跟随；虚线为当前，实线为情景。"}
                    </p>
                  </div>
                  <p className="tnum text-[11px] text-faint">
                    大盘 {moveLabel(input.marketPct)} · IV {signed(input.ivPts, 1)} 点
                    {input.ivCrushPct > 0 ? ` · Crush −${input.ivCrushPct}%` : ""} · +{days} 天
                  </p>
                </div>
                <ScenarioChart points={model.points} spotPct={input.marketPct} height={300} />
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-dim tnum">
                  <span>
                    ±20% 区间最好{" "}
                    <b className="font-medium text-profit">{money(model.best, { sign: true })}</b>
                    <span className="text-faint">（{moveLabel(model.bestAt)}）</span>
                  </span>
                  <span>
                    最差{" "}
                    <b className="font-medium text-loss">{money(model.worst, { sign: true })}</b>
                    <span className="text-faint">（{moveLabel(model.worstAt)}）</span>
                  </span>
                </div>
              </section>

              <section className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-[13px] font-semibold">压力矩阵</h2>
                    <p className="mt-0.5 text-[11px] text-dim">
                      行：大盘涨跌 · 列：IV 变化（点）· 时间 +{days} 天
                    </p>
                  </div>
                  <span className="text-[11px] text-faint">点击单元格套用</span>
                </div>

                <div className="mt-3 grid grid-cols-[52px_repeat(5,minmax(0,1fr))] gap-1">
                  <span className="flex items-end justify-end pb-1 pr-1 text-[11px] text-faint">
                    大盘 \ IV
                  </span>
                  {STRESS_IVS.map((iv) => (
                    <span key={`h${iv}`} className="pb-1 text-center text-[11px] tnum text-faint">
                      {signed(iv)}
                    </span>
                  ))}
                  {STRESS_SPOTS.map((spot, row) => (
                    <Fragment key={spot}>
                      <span className="flex items-center justify-end pr-1 text-[11px] tnum text-faint">
                        {moveLabel(spot)}
                      </span>
                      {STRESS_IVS.map((iv, col) => {
                        const value = stress.cells[row][col];
                        const strength = Math.min(1, Math.abs(value) / stress.maxAbs);
                        const background =
                          value >= 0
                            ? `rgba(11, 122, 82, ${0.05 + strength * 0.24})`
                            : `rgba(191, 59, 43, ${0.05 + strength * 0.24})`;
                        const selected = input.marketPct === spot && input.ivPts === iv;
                        return (
                          <button
                            key={`${spot}-${iv}`}
                            type="button"
                            onClick={() => apply({ marketPct: spot, ivPts: iv })}
                            className={`h-8 rounded-[5px] text-[11px] font-medium tnum transition-shadow hover:ring-1 hover:ring-line-strong ${
                              selected ? "ring-1 ring-accent" : ""
                            }`}
                            style={{ background }}
                          >
                            {money(value, { sign: true })}
                          </button>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-faint">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-[2px] bg-[#0b7a523d]" />
                    盈利
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-[2px] bg-[#bf3b2b3d]" />
                    亏损
                  </span>
                  <span className="ml-auto">颜色越深，影响越大</span>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
                  <div>
                    <h2 className="text-[13px] font-semibold">按标的风险</h2>
                    <p className="mt-0.5 text-[11px] text-dim">
                      {input.mode === "custom"
                        ? "逐标的模式下可直接改「情景」列；改的是该标的的总涨跌幅。"
                        : "美元 Gamma 为标的每变动 1% 时 Delta 的变化。"}
                    </p>
                  </div>
                  <span className="text-[11px] text-faint">Beta 为近似值</span>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[720px] grid-cols-[minmax(0,1fr)_52px_92px_80px_68px_82px_74px_100px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[11px] font-medium text-faint">
                    <span>标的</span>
                    <span className="text-right">Beta</span>
                    <span className="text-right">情景</span>
                    <span className="text-right">盈亏</span>
                    <span className="text-right">Delta</span>
                    <span className="text-right">$Γ / 1%</span>
                    <span className="text-right">Vega</span>
                    <span className="text-right">事件</span>
                  </div>
                  {model.risks.map((risk) => {
                    const event = nextEvent(events, risk.symbol);
                    return (
                      <div
                        key={risk.symbol}
                        className="grid min-w-[720px] grid-cols-[minmax(0,1fr)_52px_92px_80px_68px_82px_74px_100px] items-center gap-2 border-b border-line-subtle px-4 py-2 text-[12px] last:border-0"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Badge
                            label={risk.symbol.slice(0, 2)}
                            seed={risk.symbol}
                            size={22}
                            rounded="rounded-[6px]"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{risk.symbol}</span>
                            <span className="block truncate text-[11px] text-faint tnum">
                              ${num(risk.spot, 2)}
                            </span>
                          </span>
                        </span>
                        <span className="text-right text-[11px] tnum text-dim">
                          {num(risk.beta, 2)}
                        </span>
                        <span className="flex justify-end">
                          {input.mode === "custom" ? (
                            <input
                              type="number"
                              step={1}
                              value={Number(risk.movePct.toFixed(1))}
                              onChange={(event) =>
                                setSymbolMove(risk.symbol, Number(event.target.value))
                              }
                              aria-label={`${risk.symbol} 情景涨跌`}
                              className="h-6 w-[66px] rounded border border-line bg-white px-1 text-right text-[11px] tnum outline-none focus:border-accent"
                            />
                          ) : (
                            <span className="text-right text-[11px] tnum">
                              {moveLabel(risk.movePct)}
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-right text-[12px] tnum ${
                            risk.pnl >= 0 ? "text-profit" : "text-loss"
                          }`}
                        >
                          {money(risk.pnl, { sign: true })}
                        </span>
                        <span className="text-right text-[11px] tnum text-dim">
                          {num(risk.delta, 0)}
                        </span>
                        <span className="text-right text-[11px] tnum text-dim">
                          {money(risk.dollarGamma, { sign: true })}
                        </span>
                        <span className="text-right text-[11px] tnum text-dim">
                          {money(risk.vega, { sign: true })}
                        </span>
                        <span className="truncate text-right text-[11px] text-faint">
                          {event ? eventLabel(event) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
                  <h2 className="text-[13px] font-semibold">持仓拆分</h2>
                  <span className="text-[11px] text-faint">点击行打开持仓详情</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_78px_78px_78px_62px_62px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[11px] font-medium text-faint">
                  <span>持仓</span>
                  <span className="text-right">当前</span>
                  <span className="text-right">情景</span>
                  <span className="text-right">变化</span>
                  <span className="text-right">Delta</span>
                  <span className="text-right">Vega</span>
                </div>
                {model.positions.map((position) => (
                  <Link
                    key={position.trade.id}
                    to={`/trades/${position.trade.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_78px_78px_78px_62px_62px] items-center gap-2 border-b border-line-subtle px-4 py-2 last:border-0 hover:bg-hover"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge
                        label={position.trade.symbol.slice(0, 2)}
                        seed={position.trade.symbol}
                        size={22}
                        rounded="rounded-[6px]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">
                          {position.trade.name}
                        </span>
                        <span className="block truncate text-[11px] text-faint">
                          {position.trade.symbol} · {position.trade.legs.length} 条腿
                        </span>
                      </span>
                    </span>
                    <span className="text-right text-[12px] tnum">
                      {money(position.current, { sign: true })}
                    </span>
                    <span
                      className={`text-right text-[12px] tnum ${
                        position.scenario >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {money(position.scenario, { sign: true })}
                    </span>
                    <span
                      className={`text-right text-[12px] tnum ${
                        position.change >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {money(position.change, { sign: true })}
                    </span>
                    <span className="text-right text-[12px] tnum text-dim">
                      {num(position.delta, 0)}
                    </span>
                    <span className="text-right text-[12px] tnum text-dim">
                      {money(position.vega, { sign: true })}
                    </span>
                  </Link>
                ))}
              </section>
            </div>
          </div>
        </div>
      </div>
    </Workspace>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  minLabel,
  maxLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="tnum text-[13px] font-semibold">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
        style={{ accentColor: "#0364d3" }}
        aria-label={label}
      />
      <span className="mt-0.5 flex justify-between text-[11px] tnum text-faint">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </span>
    </label>
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
