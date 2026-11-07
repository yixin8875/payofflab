import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ArrowRight } from "../components/Icons";
import { bsPrice, greeks, normCdf, r as RATE, q as DIV } from "../lib/options";
import { money, pct } from "../lib/format";

type Mode = "bs" | "greeks" | "iv" | "breakeven";

const COPY: Record<Mode, { title: string; lead: string; note: string }> = {
  bs: {
    title: "Black-Scholes 计算器",
    lead: "给定期权与市场的参数，算出模型下的理论价值、内在价值与时间价值。所有数值都按同一套假设计算，方便你对照市场价格。",
    note: "利率固定为 4.02%，股息率 1.03%；期限以交易日历天数为准。",
  },
  greeks: {
    title: "希腊值计算器",
    lead: "把模型里的偏导数换算成看得懂的美元敞口：标的变化 $1、时间过一天、波动率变一个点，这笔期权会怎么动。",
    note: "美元希腊值按 100 股合约乘数计算。",
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
      <span className="text-[11.5px] text-dim">{label}</span>
      <span className="mt-1 flex h-9 items-center gap-1 rounded-md border border-line bg-white px-2.5 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none tnum"
        />
        {suffix && <span className="text-[11px] text-dim">{suffix}</span>}
      </span>
    </label>
  );
}

function Out({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2.5">
      <p className="text-[10.5px] text-dim">{label}</p>
      <p className={`mt-0.5 text-[15px] font-semibold tnum ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default function ToolPage({ mode }: { mode: Mode }) {
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

  const price = useMemo(() => (S && K ? bsPrice(kind, S, K, T, sigma) : 0), [S, K, T, sigma, kind]);
  const g = useMemo(() => (S && K ? greeks([{ id: "x", kind, side: 1, qty: 1, strike: K, expiry: "", dte: Number(days), fill: 0 }], S, T, sigma) : null), [S, K, T, sigma, kind, days]);
  const intrinsic = kind === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const timeValue = Math.max(price - intrinsic, 0);

  const implied = useMemo(() => {
    const target = Number(market) || 0;
    if (!S || !K || target <= 0) return null;
    let lo = 0.01;
    let hi = 3;
    let found = false;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      const p = bsPrice(kind, S, K, T, mid);
      if (p > target) hi = mid;
      else lo = mid;
      if (Math.abs(p - target) < 1e-6) {
        found = true;
        break;
      }
    }
    return found ? (lo + hi) / 2 : null;
  }, [S, K, T, kind, market]);

  const be = kind === "call" ? K + Number(premium) : K - Number(premium);

  return (
    <AppShell title={copy.title}>
      <div className="mx-auto max-w-[860px] px-4 pb-20 pt-4 sm:px-6">
        <Link to="/tools" className="text-[12px] text-dim hover:text-text">
          ← 工具
        </Link>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">{copy.lead}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-[300px_1fr]">
          <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
            <div className="flex rounded-md border border-line bg-surface/60 p-0.5">
              {(["call", "put"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded px-2 py-1 text-[12px] font-medium ${
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
            {mode === "iv" && <Field label="市场上的期权价格" value={market} onChange={setMarket} suffix="$" step="0.01" />}
            {mode === "breakeven" && <Field label="每股权利金" value={premium} onChange={setPremium} suffix="$" step="0.01" />}
            <p className="pt-1 text-[10.5px] leading-relaxed text-faint">{copy.note}</p>
          </div>

          <div>
            {(mode === "bs" || mode === "greeks") && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Out label="理论价格" value={`$${price.toFixed(3)}`} />
                <Out label="内在价值" value={money(intrinsic, { cents: true })} />
                <Out label="时间价值" value={money(timeValue, { cents: true })} />
                {g && (
                  <>
                    <Out label="Delta（每股）" value={g.delta.toFixed(3)} />
                    <Out label="Gamma" value={g.gamma.toFixed(4)} />
                    <Out label="Theta / 天" value={money(g.theta)} tone={g.theta < 0 ? "loss" : "profit"} />
                    <Out label="Vega / 1% IV" value={money(g.vega)} />
                    <Out label="Rho / 1% 利率" value={money(g.rho)} />
                    <Out label="N(d1)" value={normCdf((Math.log(S / K) + (RATE - DIV + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T))).toFixed(3)} />
                  </>
                )}
              </div>
            )}

            {mode === "iv" && (
              <div className="rounded-xl border border-line bg-panel p-5">
                <p className="text-[11.5px] text-dim">模型隐含波动率</p>
                <p className="mt-1 text-[30px] font-semibold tnum">
                  {implied === null ? "超出范围" : `${(implied * 100).toFixed(2)}%`}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {implied === null
                    ? "这个价格在当前参数下无解：要么低于内在价值，要么高得模型无法解释。检查现价、行权价与期限。"
                    : `也就是说，市场为这个合约定价时，假设未来 ${T * 365} 天的年化波动约为 ${(implied * 100).toFixed(1)}%。`}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Out label="你输入的价格" value={`$${(Number(market) || 0).toFixed(2)}`} />
                  <Out label="按此波动率重算" value={`$${bsPrice(kind, S, K, T, implied ?? sigma).toFixed(3)}`} />
                </div>
              </div>
            )}

            {mode === "breakeven" && (
              <div className="rounded-xl border border-line bg-panel p-5">
                <p className="text-[11.5px] text-dim">到期盈亏平衡点</p>
                <p className="mt-1 text-[30px] font-semibold tnum">${Math.max(be, 0).toFixed(2)}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {kind === "call"
                    ? `标的价格高于 $${Math.max(be, 0).toFixed(2)} 时，这张看涨期权到期才赚钱；低于它则亏损全部已付权利金。`
                    : `标的价格低于 $${Math.max(be, 0).toFixed(2)} 时，这张看跌期权到期才赚钱；高于它则亏损全部已付权利金。`}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Out label="每股权利金" value={money(Number(premium), { cents: true })} />
                  <Out label="行权价" value={money(K, { cents: true })} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Link to="/calculator" className="btn-primary h-10 px-4 text-[13.5px]">
            在构建器里试这笔交易
            <ArrowRight size={14} />
          </Link>
          <Link to="/tools/option-finder" className="btn-secondary h-10 px-4 text-[13.5px]">
            扫描候选交易
          </Link>
          <span className="ml-auto text-[11px] text-faint">
            模型输出 · 非投资建议 · IV {pct(sigma, 1)}
          </span>
        </div>
      </div>
    </AppShell>
  );
}
