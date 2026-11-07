import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Target } from "../components/Icons";
import { PaneHeader, Workspace } from "../desktop/Split";
import { EXPIRIES, ticker as findTicker } from "../data/tickers";
import { analyse, type Instrument } from "../lib/options";
import { legsFor } from "../lib/presets";
import { money, pct } from "../lib/format";

const OUTLOOKS = [
  {
    key: "bullish",
    label: "看涨",
    keys: ["long-call", "bull-call-spread", "bull-put-spread", "cash-secured-put"],
  },
  { key: "bearish", label: "看跌", keys: ["long-put", "bear-put-spread", "bear-call-spread"] },
  { key: "neutral", label: "中性", keys: ["iron-condor", "iron-butterfly", "butterfly", "covered-call"] },
  { key: "volatile", label: "波动", keys: ["long-straddle", "long-strangle"] },
] as const;

type Result = {
  key: string;
  name: string;
  legs: string;
  pop: number;
  credit: number;
  maxProfit: number | null;
  ror: number;
  ev: number;
};

const NAMES: Record<string, string> = {
  "long-call": "买入看涨",
  "bull-call-spread": "牛市看涨价差",
  "bull-put-spread": "牛市看跌价差",
  "cash-secured-put": "现金担保看跌",
  "long-put": "买入看跌",
  "bear-put-spread": "熊市看跌价差",
  "bear-call-spread": "熊市看涨价差",
  "iron-condor": "铁鹰式",
  "iron-butterfly": "铁蝶式",
  butterfly: "蝶式价差",
  "covered-call": "备兑看涨",
  "long-straddle": "买入跨式",
  "long-strangle": "买入宽跨式",
};

export default function OptionFinder() {
  const [params] = useSearchParams();
  const [symbol, setSymbol] = useState((params.get("ticker") ?? "SPY").toUpperCase());
  const [outlook, setOutlook] = useState<(typeof OUTLOOKS)[number]["key"]>("bullish");
  const [expiryIso, setExpiryIso] = useState(EXPIRIES[3].iso);
  const [liquidity, setLiquidity] = useState("严格");
  const [rank, setRank] = useState("回报率");
  const [scanned, setScanned] = useState(false);

  const t = findTicker(symbol);
  const instrument: Instrument = useMemo(() => ({ ...t, expiries: EXPIRIES }), [t]);
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];

  const results: Result[] = useMemo(() => {
    if (!scanned) return [];
    const group = OUTLOOKS.find((o) => o.key === outlook) ?? OUTLOOKS[0];
    const list = group.keys.flatMap((key) => {
      const legs = legsFor(key, t, expiry.iso);
      if (!legs.length) return [];
      const a = analyse(legs, instrument, expiry.dte / 365);
      const risk = Math.abs(Math.min(a.maxLoss ?? -1, 0)) || 1;
      return [
        {
          key,
          name: NAMES[key] ?? key,
          legs: legs
            .filter((l) => l.kind !== "stock")
            .map((l) => `${l.kind === "call" ? "C" : "P"}${l.strike}`)
            .join(" / "),
          pop: a.probProfit,
          credit: a.premium,
          maxProfit: a.maxProfit,
          ror:
            a.maxProfit !== null && a.maxLoss
              ? Math.abs(a.maxProfit / a.maxLoss)
              : Math.abs(a.expectedValue / risk),
          ev: a.expectedValue,
        },
      ];
    });
    return list.sort((x, y) =>
      rank === "概率"
        ? y.pop - x.pop
        : rank === "风险回报"
          ? y.ror - x.ror
          : rank === "预期价值"
            ? y.ev - x.ev
            : y.ror - x.ror,
    );
  }, [scanned, outlook, t, expiry.iso, expiry.dte, instrument, rank]);

  const pill = (active: boolean) =>
    `h-7 shrink-0 rounded-md border px-2 text-[11px] font-medium transition-colors ${
      active
        ? "border-accent-line bg-accent-soft text-accent"
        : "border-line bg-white text-dim hover:text-text"
    }`;

  return (
    <Workspace>
      <PaneHeader
        title="期权扫描"
        subtitle={`${t.symbol} · 逐腿评估整条期权链`}
        leading={
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Target size={14} />
          </span>
        }
      >
        <span className="chip">未平仓 ≥ 100</span>
      </PaneHeader>

      <div className="scroll-pane flex-1">
        <div className="mx-auto max-w-[1040px] px-6 py-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setScanned(true);
            }}
            className="rounded-lg border border-line bg-white p-4"
          >
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="block">
                <span className="text-[10.5px] text-dim">标的</span>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  className="mt-1 block h-8 w-[86px] rounded-md border border-line bg-white px-2 font-code text-[12px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  aria-label="标的代码"
                />
              </label>

              <div>
                <span className="text-[10.5px] text-dim">观点</span>
                <div className="mt-1 flex rounded-md border border-line bg-surface p-0.5">
                  {OUTLOOKS.map((o) => (
                    <button
                      type="button"
                      key={o.key}
                      onClick={() => setOutlook(o.key)}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        outlook === o.key ? "bg-white text-text shadow-sm" : "text-dim"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-[10.5px] text-dim">排序</span>
                <select
                  value={rank}
                  onChange={(event) => setRank(event.target.value)}
                  className="mt-1 block h-8 rounded-md border border-line bg-white px-2 text-[11.5px] outline-none focus:border-accent"
                  aria-label="排序方式"
                >
                  {["回报率", "概率", "风险回报", "预期价值"].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="btn-primary ml-auto h-8 px-3">
                <Target size={13} />
                扫描 {t.symbol}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3">
              <span className="mr-1 text-[10px] text-faint">到期</span>
              {EXPIRIES.slice(2, 5).map((e) => (
                <button
                  type="button"
                  key={e.iso}
                  onClick={() => setExpiryIso(e.iso)}
                  className={pill(expiryIso === e.iso)}
                >
                  {e.dte}天
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-line" />
              <span className="mr-1 text-[10px] text-faint">流动性</span>
              {["严格", "标准", "宽松"].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setLiquidity(value)}
                  className={pill(liquidity === value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </form>

          {scanned ? (
            <section className="mt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[12.5px] font-semibold">
                  {t.symbol} · {OUTLOOKS.find((o) => o.key === outlook)?.label} · {expiry.label}
                </h2>
                <span className="text-[10.5px] text-faint">
                  {results.length} 个结果 · 按{rank}排序 · {liquidity}流动性
                </span>
              </div>

              <div className="mt-2 overflow-hidden rounded-lg border border-line bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_90px_90px] gap-2 border-b border-line-subtle bg-[#fbfaf8] px-3 py-1.5 text-[9.5px] font-medium uppercase tracking-wide text-faint">
                  <span>交易</span>
                  <span className="text-right">盈利概率</span>
                  <span className="text-right">风险回报</span>
                  <span className="text-right">净权利金</span>
                  <span className="text-right">最大盈利</span>
                </div>
                {results.map((r) => (
                  <Link
                    key={r.key}
                    to={`/calculator?preset=${r.key}&ticker=${t.symbol}&expiry=${expiry.iso}`}
                    className="grid grid-cols-[minmax(0,1fr)_70px_70px_90px_90px] items-center gap-2 border-b border-line-subtle px-3 py-2 last:border-0 hover:bg-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium">{r.name}</span>
                      <span className="block truncate text-[10px] text-dim tnum">{r.legs}</span>
                    </span>
                    <span className="text-right text-[11.5px] font-medium text-profit tnum">
                      {pct(r.pop)}
                    </span>
                    <span className="text-right text-[11.5px] tnum">{r.ror.toFixed(2)}</span>
                    <span
                      className={`text-right text-[11.5px] tnum ${
                        r.credit >= 0 ? "text-profit" : "text-muted"
                      }`}
                    >
                      {r.credit >= 0 ? "+" : "−"}
                      {money(Math.abs(r.credit))}
                    </span>
                    <span className="text-right text-[11.5px] tnum">
                      {r.maxProfit === null ? "无限" : money(r.maxProfit)}
                    </span>
                  </Link>
                ))}
                {results.length === 0 && (
                  <p className="px-3 py-10 text-center text-[11.5px] text-dim">
                    这个观点下没有通过筛选的结构。试试“标准”流动性或更远的到期日。
                  </p>
                )}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-faint">
                结果按合成报价计算，未计佣金与滑点。点击任意一行可带入构建器。模型输出，非投资建议。
              </p>
            </section>
          ) : (
            <div className="mt-8 text-center">
              <p className="text-[12px] text-dim">
                选一个观点和到期日，扫描会把每条腿的流动性筛一遍，再按回报、概率与预期价值排名。
              </p>
              <p className="mt-1 text-[10.5px] text-faint">
                看涨、看跌与波动扫描评估单腿与价差；中性扫描偏向铁鹰式与铁蝶式。
              </p>
            </div>
          )}
        </div>
      </div>
    </Workspace>
  );
}
