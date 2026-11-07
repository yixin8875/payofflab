import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Repeat } from "../components/Icons";
import { ScenarioChart, type ScenarioPoint } from "../components/ScenarioChart";
import { Badge, EmptyDetail, PaneHeader, Workspace } from "../desktop/Split";
import { money, num } from "../lib/format";
import {
  maxDte,
  portfolioGreeks,
  portfolioMark,
  positionBreakdown,
  SPOT_RANGE,
  type ScenarioInput,
} from "../lib/scenario";
import { useTrades } from "../lib/store";

const PRESETS = [
  { label: "现状", spotPct: 0, ivPts: 0, days: 0 },
  { label: "标的 +5%", spotPct: 5, ivPts: 0, days: 0 },
  { label: "标的 −5%", spotPct: -5, ivPts: 0, days: 0 },
  { label: "IV +5 点", spotPct: 0, ivPts: 5, days: 0 },
  { label: "一周后", spotPct: 0, ivPts: 0, days: 7 },
];

const STRESS_SPOTS = [-10, -5, 0, 5, 10];
const STRESS_IVS = [-10, -5, 0, 5, 10];

const signed = (v: number, digits = 0) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

const moveLabel = (v: number) => `${signed(v)}%`;

export default function Scenario() {
  const trades = useTrades();
  const [input, setInput] = useState<ScenarioInput>({ spotPct: 0, ivPts: 0, days: 7 });

  const maxDays = useMemo(() => Math.max(1, maxDte(trades)), [trades]);
  const days = Math.min(input.days, maxDays);
  const legCount = useMemo(
    () => trades.reduce((sum, trade) => sum + trade.legs.length, 0),
    [trades],
  );

  const model = useMemo(() => {
    const current = portfolioMark(trades, 0, 0, 0);
    const scenario = portfolioMark(trades, input.spotPct, input.ivPts, days);
    const g = portfolioGreeks(trades, input.spotPct, input.ivPts, days);
    const points: ScenarioPoint[] = Array.from({ length: 81 }, (_, i) => {
      const move = -SPOT_RANGE + (i * SPOT_RANGE * 2) / 80;
      return {
        move,
        current: portfolioMark(trades, move, 0, 0),
        scenario: portfolioMark(trades, move, input.ivPts, days),
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
    const positions = positionBreakdown(trades, { ...input, days });
    const dollarDelta = positions.reduce((sum, p) => sum + p.delta * p.spot * 0.01, 0);
    return { current, scenario, g, points, best, worst, bestAt, worstAt, positions, dollarDelta };
  }, [trades, input, days]);

  const stress = useMemo(() => {
    const cells = STRESS_SPOTS.map((spot) =>
      STRESS_IVS.map((iv) => portfolioMark(trades, spot, iv, days)),
    );
    const maxAbs = Math.max(1, ...cells.flat().map(Math.abs));
    return { cells, maxAbs };
  }, [trades, days]);

  const apply = (patch: Partial<ScenarioInput>) => setInput((prev) => ({ ...prev, ...patch }));

  if (!trades.length) {
    return (
      <Workspace>
        <PaneHeader title="情景分析" subtitle="组合层压力测试" />
        <EmptyDetail
          title="还没有可分析的持仓"
          body="先在构建器里搭一笔策略并保存。情景分析会读取全部持仓，对标的、波动率与时间做统一冲击。"
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
        subtitle={`${trades.length} 笔持仓 · ${legCount} 条腿 · 统一冲击所有标的`}
      >
        <button
          type="button"
          onClick={() => setInput({ spotPct: 0, ivPts: 0, days: 0 })}
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
              <section className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[12px] font-semibold">情景参数</h2>
                  <span className="text-[10px] text-faint">全组合</span>
                </div>
                <div className="mt-3.5 space-y-4">
                  <SliderRow
                    label="标的涨跌"
                    value={input.spotPct}
                    min={-SPOT_RANGE}
                    max={SPOT_RANGE}
                    step={1}
                    display={moveLabel(input.spotPct)}
                    minLabel={moveLabel(-SPOT_RANGE)}
                    maxLabel={moveLabel(SPOT_RANGE)}
                    onChange={(spotPct) => apply({ spotPct })}
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
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-faint">
                    快速情景
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {PRESETS.map((preset) => {
                      const targetDays = Math.min(preset.days, maxDays);
                      const selected =
                        input.spotPct === preset.spotPct &&
                        input.ivPts === preset.ivPts &&
                        days === targetDays;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          data-selected={selected ? "true" : undefined}
                          onClick={() =>
                            setInput({
                              spotPct: preset.spotPct,
                              ivPts: preset.ivPts,
                              days: targetDays,
                            })
                          }
                          className="chip"
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white p-4">
                <h2 className="text-[12px] font-semibold">组合希腊值</h2>
                <dl className="mt-1 divide-y divide-line-subtle">
                  {[
                    ["Delta", `${num(model.g.delta, 0)} 股`],
                    ["Gamma", num(model.g.gamma, 0)],
                    ["Theta", `${money(model.g.theta, { sign: true })} / 天`],
                    ["Vega", `${money(model.g.vega, { sign: true })} / 点`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-2 py-1.5">
                      <dt className="text-[11.5px] text-dim">{label}</dt>
                      <dd className="tnum text-[11.5px] font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[10px] leading-4 text-faint">按情景价格与剩余期限重算。</p>
              </section>

              <p className="px-1 text-[10.5px] leading-4 text-faint">
                所有标的按同一百分比变动；期权价格由 Black-Scholes 合成，仅用于情景分析，不构成投资建议。
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
                  sub={`每 1% 标的 ≈ ${money(model.dollarDelta, { sign: true })}`}
                />
                <Stat
                  label="净 Vega"
                  value={money(model.g.vega, { sign: true })}
                  sub={`Theta ${money(model.g.theta, { sign: true })} / 天`}
                />
              </div>

              <section className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[12px] font-semibold">组合盈亏 vs 标的涨跌</h2>
                    <p className="mt-0.5 text-[10.5px] text-dim">
                      横轴为所有标的的统一涨跌幅；虚线为当前，实线为情景。
                    </p>
                  </div>
                  <p className="tnum text-[10.5px] text-faint">
                    标的 {moveLabel(input.spotPct)} · IV {signed(input.ivPts, 1)} 点 · +{days} 天
                  </p>
                </div>
                <ScenarioChart points={model.points} spotPct={input.spotPct} height={300} />
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[10.5px] text-dim tnum">
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

              <section className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-[12px] font-semibold">压力矩阵</h2>
                    <p className="mt-0.5 text-[10.5px] text-dim">
                      行：标的涨跌 · 列：IV 变化（点）· 时间 +{days} 天
                    </p>
                  </div>
                  <span className="text-[10px] text-faint">点击单元格套用</span>
                </div>

                <div className="mt-3 grid grid-cols-[52px_repeat(5,minmax(0,1fr))] gap-1">
                  <span className="flex items-end justify-end pb-1 pr-1 text-[9px] text-faint">
                    标的 \ IV
                  </span>
                  {STRESS_IVS.map((iv) => (
                    <span key={`h${iv}`} className="pb-1 text-center text-[9.5px] tnum text-faint">
                      {signed(iv)}
                    </span>
                  ))}
                  {STRESS_SPOTS.map((spot, row) => (
                    <Fragment key={spot}>
                      <span className="flex items-center justify-end pr-1 text-[9.5px] tnum text-faint">
                        {moveLabel(spot)}
                      </span>
                      {STRESS_IVS.map((iv, col) => {
                        const value = stress.cells[row][col];
                        const strength = Math.min(1, Math.abs(value) / stress.maxAbs);
                        const background =
                          value >= 0
                            ? `rgba(11, 122, 82, ${0.05 + strength * 0.24})`
                            : `rgba(191, 59, 43, ${0.05 + strength * 0.24})`;
                        const selected = input.spotPct === spot && input.ivPts === iv;
                        return (
                          <button
                            key={`${spot}-${iv}`}
                            type="button"
                            onClick={() => apply({ spotPct: spot, ivPts: iv })}
                            className={`h-8 rounded-[5px] text-[10.5px] font-medium tnum transition-shadow hover:ring-1 hover:ring-line-strong ${
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

                <div className="mt-2.5 flex items-center gap-3 text-[9.5px] text-faint">
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

              <section className="overflow-hidden rounded-lg border border-line bg-white">
                <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
                  <h2 className="text-[12px] font-semibold">持仓拆分</h2>
                  <span className="text-[10px] text-faint">点击行打开持仓详情</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_78px_78px_78px_62px_62px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[9.5px] font-medium uppercase tracking-wide text-faint">
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
                        <span className="block truncate text-[12px] font-medium">
                          {position.trade.name}
                        </span>
                        <span className="block truncate text-[10px] text-faint">
                          {position.trade.symbol} · {position.trade.legs.length} 条腿
                        </span>
                      </span>
                    </span>
                    <span className="text-right text-[11px] tnum">
                      {money(position.current, { sign: true })}
                    </span>
                    <span
                      className={`text-right text-[11px] tnum ${
                        position.scenario >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {money(position.scenario, { sign: true })}
                    </span>
                    <span
                      className={`text-right text-[11px] tnum ${
                        position.change >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {money(position.change, { sign: true })}
                    </span>
                    <span className="text-right text-[11px] tnum text-dim">
                      {num(position.delta, 0)}
                    </span>
                    <span className="text-right text-[11px] tnum text-dim">
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
        <span className="text-[11.5px] text-muted">{label}</span>
        <span className="tnum text-[12px] font-semibold">{display}</span>
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
      <span className="mt-0.5 flex justify-between text-[9.5px] tnum text-faint">
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
    <div className="rounded-lg border border-line bg-white px-3.5 py-3">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-faint">{label}</p>
      <p className={`mt-1 text-[18px] font-semibold leading-6 tracking-[-0.02em] tnum ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-dim tnum">{sub}</p>
    </div>
  );
}
