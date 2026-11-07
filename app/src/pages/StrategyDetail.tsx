import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PayoffChart } from "../components/PayoffChart";
import { ArrowRight, ChevronLeft } from "../components/Icons";
import {
  CATEGORY_ZH,
  LEVEL_ZH,
  OUTLOOK_ZH,
  RISK_ZH,
  STRATEGIES,
  STRATEGY_BY_SLUG,
} from "../data/strategies";
import { legsFor } from "../lib/presets";
import { analyse, type Instrument } from "../lib/options";
import { EXPIRIES, ticker } from "../data/tickers";
import { money, pct, price } from "../lib/format";

const SPY = ticker("SPY");
const EXPIRY = EXPIRIES[3];
const INSTRUMENT: Instrument = { ...SPY, expiries: EXPIRIES };

export default function StrategyDetail() {
  const { slug = "" } = useParams();
  const s = STRATEGY_BY_SLUG[slug];
  const legs = useMemo(() => (s?.preset ? legsFor(s.preset, SPY, EXPIRY.iso) : []), [s]);
  const a = useMemo(() => (legs.length ? analyse(legs, INSTRUMENT, EXPIRY.dte / 365) : null), [legs]);
  const related = s ? STRATEGIES.filter((x) => x.category === s.category && x.slug !== s.slug).slice(0, 3) : [];

  if (!s) {
    return (
      <AppShell title="策略">
        <div className="mx-auto max-w-[720px] px-4 py-20 text-center">
          <h1 className="text-[20px] font-semibold">没有找到这个策略</h1>
          <p className="mt-2 text-[14px] text-muted">它可能改了名字。回到策略列表重新找找。</p>
          <Link to="/strategies" className="btn-primary mt-6 h-10 px-4 text-[13.5px]">
            全部策略
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={s.name}>
      <div className="mx-auto max-w-[1000px] px-4 pb-20 pt-4 sm:px-6">
        <Link to="/strategies" className="inline-flex items-center gap-1 text-[12.5px] text-dim hover:text-text">
          <ChevronLeft size={14} />
          策略
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11.5px] text-muted">{OUTLOOK_ZH[s.outlook]}</span>
          <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11.5px] text-muted">{RISK_ZH[s.risk]}</span>
          <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11.5px] text-muted">{LEVEL_ZH[s.level]}</span>
          <span className="text-[11.5px] text-dim">{CATEGORY_ZH[s.category] ?? s.category}</span>
        </div>
        <h1 className="mt-4 text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[38px]">{s.name}</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{s.desc}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {s.preset && (
            <Link to={`/calculator?preset=${s.preset}&ticker=SPY`} className="btn-primary h-10 px-4 text-[13.5px]">
              在构建器中打开
              <ArrowRight size={14} />
            </Link>
          )}
          <Link to={`/options-chain/spy`} className="btn-secondary h-10 px-4 text-[13.5px]">
            看看 SPY 期权链
          </Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="rounded-xl border border-line bg-panel p-4">
            {legs.length ? (
              <>
                <div className="flex items-baseline justify-between px-1">
                  <p className="text-[12px] text-dim">
                    SPY · {s.name} · {EXPIRY.label}（{EXPIRY.dte}天）
                  </p>
                  {a && (
                    <p className={`text-[12px] font-medium tnum ${a.isCredit ? "text-profit" : "text-text"}`}>
                      净{a.isCredit ? "收入" : "支出"} {money(Math.abs(a.premium))}
                    </p>
                  )}
                </div>
                <PayoffChart
                  legs={legs}
                  spot={SPY.spot}
                  iv={SPY.iv}
                  dte={EXPIRY.dte}
                  expiryLabel={EXPIRY.label}
                  mode="pnl"
                  envelope={1}
                  height={360}
                />
              </>
            ) : (
              <div className="flex h-[360px] items-center justify-center text-center">
                <div>
                  <p className="text-[14px] font-medium">这是一个说明性策略</p>
                  <p className="mt-1 max-w-[320px] text-[12.5px] leading-relaxed text-muted">
                    它没有一键预设。可以照下面的腿，在构建器里手动拼出来。
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-line bg-panel p-4">
              <h2 className="text-[13px] font-semibold">关键数字</h2>
              {a ? (
                <dl className="mt-2 divide-y divide-line-subtle text-[12.5px]">
                  {[
                    ["最大盈利", a.maxProfit === null ? "无限" : money(a.maxProfit)],
                    ["最大亏损", a.maxLoss === null ? "无限" : money(a.maxLoss)],
                    ["盈亏平衡", a.breakevens.length ? a.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ") : "—"],
                    ["盈利概率", pct(a.probProfit)],
                    ["风险回报", a.riskReward],
                    ["每日 Theta", `${a.theta > 0 ? "+" : ""}${money(a.theta)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                      <dt className="text-dim">{k}</dt>
                      <dd className="text-right font-medium tnum">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  这个策略没有固定的一键预设，取决于你选择的行权价与到期日。
                </p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-panel p-4">
              <h2 className="text-[13px] font-semibold">示例腿（SPY）</h2>
              {legs.length ? (
                <ul className="mt-2 space-y-1.5">
                  {legs.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-[12px]">
                      <span
                        className={`w-8 rounded px-1 py-0.5 text-center text-[10px] font-medium ${
                          l.side === -1 ? "bg-loss-soft text-loss" : "bg-profit-soft text-profit"
                        }`}
                      >
                        {l.side === -1 ? "卖出" : "买入"}
                      </span>
                      <span className="tnum">×{l.qty}</span>
                      <span className="text-muted">{l.kind === "call" ? "看涨" : l.kind === "put" ? "看跌" : "正股"}</span>
                      <span className="ml-auto tnum">{l.kind === "stock" ? `$${l.fill.toFixed(2)}` : l.strike}</span>
                      <span className="w-10 text-right text-dim tnum">{price(l.fill)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12.5px] text-muted">在构建器中自行添加各条腿。</p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-[15px] font-semibold">它是怎么运作的</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              {s.desc}
              盈亏图把到期时的结算价值画成一条折线；折线与零轴的交点就是盈亏平衡点，
              曲线在零轴以上的区间，就是这笔交易赚钱的价格范围。
            </p>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">什么时候不该用它</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              任何策略都有它不适用的行情。先确认自己的观点、能承受的最大亏损和持有期限，
              再对照上面的关键数字；如果最大亏损超出你的承受范围，就换一个结构，而不是缩小止损。
            </p>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-10 border-t border-line pt-8">
            <h2 className="text-[13px] font-semibold">同类策略</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/strategies/${r.slug}`}
                  className="rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong"
                >
                  <p className="text-[11.5px] text-dim">
                    {OUTLOOK_ZH[r.outlook]} · {RISK_ZH[r.risk]} · {LEVEL_ZH[r.level]}
                  </p>
                  <p className="mt-1 text-[14px] font-semibold">{r.name}</p>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{r.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
