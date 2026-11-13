import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PayoffChart } from "../components/PayoffChart";
import { ArrowRight } from "../components/Icons";
import { DetailScroll, PaneHeader } from "../desktop/Split";
import {
  CATEGORY_ZH,
  LEVEL_ZH,
  OUTLOOK_ZH,
  RISK_ZH,
  STRATEGIES,
  type Strategy,
} from "../data/strategies";
import { legsFor } from "../lib/presets";
import { analyse, type Instrument } from "../lib/options";
import { EXPIRIES, ticker } from "../data/tickers";
import { money, pct, price } from "../lib/format";

const SPY = ticker("SPY");
const EXPIRY = EXPIRIES[3];
const INSTRUMENT: Instrument = { ...SPY, expiries: EXPIRIES };

export function StrategyView({ s }: { s: Strategy }) {
  const legs = useMemo(() => (s.preset ? legsFor(s.preset, SPY, EXPIRY.iso) : []), [s]);
  const a = useMemo(
    () => (legs.length ? analyse(legs, INSTRUMENT, EXPIRY.dte / 365) : null),
    [legs],
  );
  const related = STRATEGIES.filter((x) => x.category === s.category && x.slug !== s.slug).slice(0, 3);

  return (
    <>
      <PaneHeader
        title={s.name}
        subtitle={`${CATEGORY_ZH[s.category] ?? s.category} · ${OUTLOOK_ZH[s.outlook]} · ${RISK_ZH[s.risk]}`}
      >
        {s.preset && (
          <Link to={`/calculator?preset=${s.preset}&ticker=SPY`} className="btn-primary h-7 px-2.5">
            在构建器中打开
            <ArrowRight size={12} />
          </Link>
        )}
        <Link to="/chain/spy" className="btn-secondary h-7 px-2.5">
          看 SPY 链
        </Link>
      </PaneHeader>

      <DetailScroll>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip" data-selected="true">
            {OUTLOOK_ZH[s.outlook]}
          </span>
          <span className="chip">{RISK_ZH[s.risk]}</span>
          <span className="chip">{LEVEL_ZH[s.level]}</span>
          <span className="ml-1 text-[12px] text-faint">{CATEGORY_ZH[s.category] ?? s.category}</span>
        </div>

        <p className="mt-3 max-w-[680px] text-[14px] leading-5 text-muted">{s.desc}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-baseline justify-between px-0.5">
              <p className="text-[12px] text-dim">
                SPY · {EXPIRY.label}（{EXPIRY.dte}天）· 示例持仓
              </p>
              {a && (
                <p className={`text-[12px] font-medium tnum ${a.isCredit ? "text-profit" : "text-text"}`}>
                  净{a.isCredit ? "收入" : "支出"} {money(Math.abs(a.premium))}
                </p>
              )}
            </div>
            {legs.length ? (
              <PayoffChart
                legs={legs}
                spot={SPY.spot}
                iv={SPY.iv}
                dte={EXPIRY.dte}
                expiryLabel={EXPIRY.label}
                mode="pnl"
                envelope={1}
                height={300}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-[13px] font-medium">这是一个说明性策略</p>
                  <p className="mt-1 max-w-[300px] text-[12px] leading-5 text-dim">
                    它没有一键预设。可以照着右侧的腿，在构建器里手动拼出来。
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-line bg-white p-3">
              <h2 className="text-[13px] font-semibold">关键数字</h2>
              {a ? (
                <dl className="mt-1.5 divide-y divide-line-subtle text-[12px]">
                  {[
                    ["最大盈利", a.maxProfit === null ? "无限" : money(a.maxProfit)],
                    ["最大亏损", a.maxLoss === null ? "无限" : money(a.maxLoss)],
                    [
                      "盈亏平衡",
                      a.breakevens.length
                        ? a.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ")
                        : "—",
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
              ) : (
                <p className="mt-1.5 text-[12px] leading-5 text-dim">
                  这个策略没有固定的一键预设，取决于你选择的行权价与到期日。
                </p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-white p-3">
              <h2 className="text-[13px] font-semibold">示例腿（SPY）</h2>
              {legs.length ? (
                <ul className="mt-1.5 space-y-1">
                  {legs.map((leg) => (
                    <li key={leg.id} className="flex items-center gap-1.5 text-[12px]">
                      <span
                        className={`w-7 rounded px-1 py-0.5 text-center text-[11px] font-medium ${
                          leg.side === -1 ? "bg-loss-soft text-loss" : "bg-profit-soft text-profit"
                        }`}
                      >
                        {leg.side === -1 ? "卖出" : "买入"}
                      </span>
                      <span className="tnum text-dim">×{leg.qty}</span>
                      <span className="text-muted">
                        {leg.kind === "call" ? "看涨" : leg.kind === "put" ? "看跌" : "正股"}
                      </span>
                      <span className="ml-auto tnum">
                        {leg.kind === "stock" ? `$${leg.fill.toFixed(2)}` : leg.strike}
                      </span>
                      <span className="w-9 text-right text-dim tnum">{price(leg.fill)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[12px] text-dim">在构建器中自行添加各条腿。</p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <h2 className="text-[13px] font-semibold">它是怎么运作的</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-muted">
              {s.desc}盈亏图把到期时的结算价值画成一条折线；折线与零轴的交点就是盈亏平衡点，
              曲线在零轴以上的区间，就是这笔交易赚钱的价格范围。
            </p>
          </div>
          <div>
            <h2 className="text-[13px] font-semibold">什么时候不该用它</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-muted">
              任何策略都有它不适用的行情。先确认自己的观点、能承受的最大亏损和持有期限，
              再对照上面的关键数字；如果最大亏损超出承受范围，就换一个结构，而不是缩小止损。
            </p>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-6 border-t border-line-subtle pt-4">
            <h2 className="text-[12px] font-semibold">同类策略</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/strategies/${r.slug}`}
                  className="rounded-xl border border-line bg-white p-2.5 transition-colors hover:border-line-strong"
                >
                  <p className="text-[11px] text-faint">
                    {OUTLOOK_ZH[r.outlook]} · {RISK_ZH[r.risk]}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium">{r.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </DetailScroll>
    </>
  );
}
