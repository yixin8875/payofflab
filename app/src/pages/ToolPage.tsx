import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DetailScroll, PaneHeader } from "../desktop/Split";
import { bsPrice, greeks, normCdf, r as RATE, q as DIV } from "../lib/options";
import { money, pct } from "../lib/format";

export type ToolMode = "bs" | "greeks" | "iv" | "breakeven";

const COPY: Record<ToolMode, { title: string; lead: string; note: string }> = {
  bs: {
    title: "Black-Scholes 计算器",
    lead: "给定期权与市场的参数，算出模型下的理论价值、内在价值与时间价值。所有数值都按同一套假设计算，方便你对照市场价格。",
    note: "利率固定为 4.02%，股息率 1.03%；期限以日历天数为准。",
  },
  greeks: {
    title: "希腊值计算器",
    lead: "把模型里的偏导数换算成看得懂的美元敞口：标的变化 $1、时间过一天、波动率变一个点，这张合约会怎么动。",
    note: "美元希腊值按 100 股合约乘数计算，方向为买入一张。",
  },
  iv: {
    title: "隐含波动率计算器",
    lead: "输入市场上看到的期权价格，反解出模型隐含的波动率——也就是“这个报价假设未来有多大的波动”。",
    note: "用二分法在 1% 到 300% 之间求解；无解时会提示价格超出模型范围。",
  },
  breakeven: {
    title: "盈亏平衡计算器",
    lead: "单腿期权到期时，标的价格要走到哪里才不赚不亏。看涨是行权价加权利金，看跌是行权价减权利金。",
    note: "只计算到期结算，不包含提前平仓与分红。",
  },
};

function Field({
  label,
  value,
  onChange,
  suffix,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] text-dim">{label}</span>
      <span className="mt-1 flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[12px] outline-none tnum"
        />
        {suffix && <span className="text-[10px] text-dim">{suffix}</span>}
      </span>
    </label>
  );
}

function Out({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-2.5 py-2">
      <p className="text-[10px] text-faint">{label}</p>
      <p
        className={`mt-0.5 text-[14px] font-semibold tnum ${
          tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ToolDetail({ mode }: { mode: ToolMode }) {
  const copy = COPY[mode];
  const [spot, setSpot] = useState("100");
  const [strike, setStrike] = useState("105");
  const [days, setDays] = useState("30");
  const [iv, setIv] = useState("28");
  const [kind, setKind] = useState<"call" | "put">("call");
  const [market, setMarket] = useState("2.40");
  const [premium, setPremium] = useState("2.40");

  const S = Number(spot) || 0;
  const K = Number(strike) || 0;
  const T = Math.max(Number(days) || 0, 0.5) / 365;
  const sigma = Math.max(Number(iv) || 0, 1) / 100;

  const price = useMemo(
    () => (S && K ? bsPrice(kind, S, K, T, sigma) : 0),
    [S, K, T, sigma, kind],
  );
  const g = useMemo(
    () =>
      S && K
        ? greeks(
            [
              {
                id: "x",
                kind,
                side: 1,
                qty: 1,
                strike: K,
                expiry: "",
                dte: Number(days),
                fill: 0,
              },
            ],
            S,
            T,
            sigma,
          )
        : null,
    [S, K, T, sigma, kind, days],
  );
  const intrinsic = kind === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const timeValue = Math.max(price - intrinsic, 0);

  const implied = useMemo(() => {
    const target = Number(market) || 0;
    if (!S || !K || target <= 0) return null;
    let lo = 0.01;
    let hi = 3;
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      const p = bsPrice(kind, S, K, T, mid);
      if (p > target) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }, [S, K, T, kind, market]);

  const be = kind === "call" ? K + Number(premium) : K - Number(premium);

  return (
    <>
      <PaneHeader title={copy.title} subtitle="工具 · 模型输出">
        <Link to="/calculator" className="btn-secondary h-7 px-2.5">
          在构建器中试
        </Link>
      </PaneHeader>

      <DetailScroll>
        <p className="max-w-[640px] text-[12.5px] leading-5 text-muted">{copy.lead}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-3 rounded-lg border border-line bg-white p-3">
            <div className="flex rounded-md border border-line bg-surface p-0.5">
              {(["call", "put"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors ${
                    kind === k ? "bg-white text-text shadow-sm" : "text-dim"
                  }`}
                >
                  {k === "call" ? "看涨" : "看跌"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="标的价格" value={spot} onChange={setSpot} suffix="$" />
              <Field label="行权价" value={strike} onChange={setStrike} suffix="$" />
              <Field label="剩余天数" value={days} onChange={setDays} suffix="天" step="1" />
              <Field label="波动率" value={iv} onChange={setIv} suffix="%" />
            </div>
            {mode === "iv" && (
              <Field label="市场上的期权价格" value={market} onChange={setMarket} suffix="$" step="0.01" />
            )}
            {mode === "breakeven" && (
              <Field label="每股权利金" value={premium} onChange={setPremium} suffix="$" step="0.01" />
            )}
            <p className="text-[10px] leading-4 text-faint">{copy.note}</p>
          </div>

          <div>
            {(mode === "bs" || mode === "greeks") && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Out label="理论价格" value={`$${price.toFixed(3)}`} />
                <Out label="内在价值" value={money(intrinsic, { cents: true })} />
                <Out label="时间价值" value={money(timeValue, { cents: true })} />
                {g && (
                  <>
                    <Out label="Delta / 张" value={g.delta.toFixed(1)} />
                    <Out label="Gamma / 张" value={g.gamma.toFixed(2)} />
                    <Out
                      label="Theta / 天"
                      value={money(g.theta, { cents: true })}
                      tone={g.theta < 0 ? "loss" : "profit"}
                    />
                    <Out label="Vega / 1% IV" value={money(g.vega, { cents: true })} />
                    <Out label="Rho / 1% 利率" value={money(g.rho, { cents: true })} />
                    <Out
                      label="N(d1)"
                      value={normCdf(
                        (Math.log(S / K) + (RATE - DIV + (sigma * sigma) / 2) * T) /
                          (sigma * Math.sqrt(T)),
                      ).toFixed(3)}
                    />
                  </>
                )}
              </div>
            )}

            {mode === "iv" && (
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="text-[10.5px] text-dim">模型隐含波动率</p>
                <p className="mt-1 text-[26px] font-semibold tracking-[-0.02em] tnum">
                  {implied === null ? "超出范围" : `${(implied * 100).toFixed(2)}%`}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-5 text-muted">
                  {implied === null
                    ? "这个价格在当前参数下无解：要么低于内在价值，要么高得模型无法解释。检查现价、行权价与期限。"
                    : `也就是说，市场为这个合约定价时，假设未来 ${days} 天的年化波动约为 ${(implied * 100).toFixed(1)}%。`}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Out label="你输入的价格" value={`$${(Number(market) || 0).toFixed(2)}`} />
                  <Out
                    label="按此波动率重算"
                    value={`$${bsPrice(kind, S, K, T, implied ?? sigma).toFixed(3)}`}
                  />
                </div>
              </div>
            )}

            {mode === "breakeven" && (
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="text-[10.5px] text-dim">到期盈亏平衡点</p>
                <p className="mt-1 text-[26px] font-semibold tracking-[-0.02em] tnum">
                  ${Math.max(be, 0).toFixed(2)}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-5 text-muted">
                  {kind === "call"
                    ? `标的价格高于 $${Math.max(be, 0).toFixed(2)} 时，这张看涨期权到期才赚钱；低于它则亏损全部已付权利金。`
                    : `标的价格低于 $${Math.max(be, 0).toFixed(2)} 时，这张看跌期权到期才赚钱；高于它则亏损全部已付权利金。`}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Out label="每股权利金" value={money(Number(premium), { cents: true })} />
                  <Out label="行权价" value={money(K, { cents: true })} />
                </div>
              </div>
            )}

            <p className="mt-3 text-[10px] text-faint">
              模型输出 · 非投资建议 · 当前 IV {pct(sigma, 1)}
            </p>
          </div>
        </div>
      </DetailScroll>
    </>
  );
}
