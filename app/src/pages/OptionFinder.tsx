import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ArrowRight, Bolt, Calendar, ChartLine, ChevronLeft, Sigma, Target } from "../components/Icons";
import { EXPIRIES, ticker as findTicker } from "../data/tickers";
import { analyse, type Instrument } from "../lib/options";
import { legsFor } from "../lib/presets";
import { money, pct } from "../lib/format";

const OUTLOOKS = [
  { key: "bullish", label: "看涨", keys: ["long-call", "bull-call-spread", "bull-put-spread", "cash-secured-put"] },
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
  maxLoss: number | null;
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
  const [target, setTarget] = useState("");
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
      const risk = Math.abs(Math.min(a.maxLoss ?? -1, a.maxProfit === null ? 0 : 0)) || 1;
      const credit = Math.abs(a.premium);
      return [
        {
          key,
          name: NAMES[key] ?? key,
          legs: legs
            .filter((l) => l.kind !== "stock")
            .map((l) => `${l.kind === "call" ? "C" : "P"}${l.strike}`)
            .join(" / "),
          pop: a.probProfit,
          credit,
          maxProfit: a.maxProfit,
          maxLoss: a.maxLoss,
          ror: a.maxProfit !== null && a.maxLoss ? Math.abs(a.maxProfit / a.maxLoss) : Math.abs(a.expectedValue / risk),
          ev: a.expectedValue,
        },
      ];
    });
    return list.sort((x, y) =>
      rank === "概率" ? y.pop - x.pop : rank === "风险回报" ? y.ror - x.ror : rank === "预期价值" ? y.ev - x.ev : y.ror - x.ror,
    );
  }, [scanned, outlook, t, expiry.iso, expiry.dte, instrument, rank]);

  const pill = (active: boolean) =>
    `h-7 shrink-0 rounded-full border px-2.5 text-[12px] font-medium transition-colors ${
      active ? "border-accent/40 bg-accent/10 text-accent" : "border-line bg-panel text-muted hover:text-text"
    }`;

  return (
    <AppShell title="期权扫描" footer>
      <div className="pb-20 pt-1">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-3 sm:px-6">
          <Link to="/tools" aria-label="返回工具" className="icon-btn h-7 w-7 shrink-0">
            <ChevronLeft size={15} />
          </Link>
          <h1 className="shrink-0 text-[15px] font-semibold tracking-[-0.01em]">期权扫描</h1>
          <span className="hidden truncate text-[13px] text-dim sm:inline">扫描一条期权链里的交易</span>
          <span className="ml-auto hidden rounded-full border border-line bg-panel px-2 py-0.5 text-[10.5px] text-dim sm:inline">
            未平仓 ≥ 100
          </span>
        </div>

        {/* scan card */}
        <section className="mx-auto max-w-[1280px] px-4 sm:px-5">
          <div className="rounded-xl border border-line bg-panel px-4 py-10 text-center shadow-panel sm:px-6 sm:py-12">
            <form
              aria-label="期权扫描条件"
              onSubmit={(e) => {
                e.preventDefault();
                setScanned(true);
              }}
            >
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-text">为你的观点找一笔交易</h2>
              <p className="mx-auto mt-2 max-w-[560px] text-[12.5px] leading-relaxed text-muted">
                选一个标的和观点——想更具体的话，再加一个目标价或日期。扫描会先把每条腿的流动性筛一遍，
                再按回报、概率与预期价值排名。
              </p>
              <div className="mt-4 flex justify-center">
                <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                  <Target size={14} />
                  扫描 {t.symbol}
                </button>
              </div>
            </form>

            {scanned && (
              <div className="mx-auto mt-8 max-w-[980px] text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="h-8 w-[88px] rounded-md border border-line bg-sunken px-2.5 font-code text-[13px] font-semibold outline-none focus:border-accent/50"
                    aria-label="标的代码"
                  />
                  <div className="flex rounded-md border border-line bg-surface/60 p-0.5">
                    {OUTLOOKS.map((o) => (
                      <button
                        type="button"
                        key={o.key}
                        onClick={() => setOutlook(o.key)}
                        className={`rounded px-2 py-1 text-[12px] font-medium ${
                          outlook === o.key ? "bg-white text-text shadow-sm" : "text-dim"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="目标价"
                    aria-label="目标价"
                    className="h-8 w-[96px] rounded-md border border-line bg-sunken px-2.5 text-[12px] outline-none placeholder:text-dim focus:border-accent/50 tnum"
                  />
                  <span className="text-[12px] text-dim">±</span>
                  <input
                    placeholder="区间 %"
                    aria-label="区间百分比"
                    className="h-8 w-[72px] rounded-md border border-line bg-sunken px-2.5 text-[12px] outline-none placeholder:text-dim focus:border-accent/50 tnum"
                  />
                  <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
                  {EXPIRIES.slice(2, 5).map((e) => (
                    <button type="button" key={e.iso} onClick={() => setExpiryIso(e.iso)} className={pill(expiryIso === e.iso)}>
                      {e.dte}天
                    </button>
                  ))}
                  <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
                  {["严格", "标准", "宽松"].map((v) => (
                    <button type="button" key={v} onClick={() => setLiquidity(v)} className={pill(liquidity === v)}>
                      {v}
                    </button>
                  ))}
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="h-8 rounded-md border border-line bg-sunken px-2 text-[12px] outline-none"
                    aria-label="排序方式"
                  >
                    {["回报率", "概率", "风险回报", "预期价值"].map((o) => (
                      <option key={o} value={o}>
                        排序：{o}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setScanned(true)}
                    className="btn-primary ml-auto h-8 px-3 text-[12.5px]"
                  >
                    <Target size={13} />
                    重新扫描
                  </button>
                </div>

                <div className="flex items-baseline justify-between">
                  <h3 className="text-[13px] font-semibold">
                    {t.symbol} · {OUTLOOKS.find((o) => o.key === outlook)?.label} · {expiry.label}
                  </h3>
                  <span className="text-[11px] text-dim">
                    {results.length} 个结果 · 按{rank}排序
                  </span>
                </div>
                <div className="mt-2 overflow-hidden rounded-lg border border-line bg-paper">
                  <div className="grid grid-cols-[1fr_54px_64px_58px] gap-2 border-b border-line-subtle bg-surface/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-dim">
                    <span>交易</span>
                    <span className="text-right">盈利概率</span>
                    <span className="text-right">风险回报</span>
                    <span className="text-right">最大盈利</span>
                  </div>
                  {results.map((r) => (
                    <div
                      key={r.key}
                      className="grid grid-cols-[1fr_54px_64px_58px] items-center gap-2 border-b border-line-subtle px-3 py-2.5 last:border-0 hover:bg-hover/50"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/calculator?preset=${r.key}&ticker=${t.symbol}&expiry=${expiry.iso}`}
                          className="block truncate text-[12.5px] font-medium hover:text-accent"
                        >
                          {r.name}
                        </Link>
                        <p className="truncate text-[10.5px] text-dim tnum">
                          {r.legs} · {r.credit > 0 ? `净收 ${money(r.credit)}` : `净付 ${money(r.credit)}`}
                        </p>
                      </div>
                      <span className="text-right text-[12px] font-medium text-profit tnum">{pct(r.pop)}</span>
                      <span className="text-right text-[12px] tnum">{r.ror.toFixed(2)}</span>
                      <span className="text-right text-[12px] tnum">
                        {r.maxProfit === null ? "无限" : money(r.maxProfit)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-faint">
                  结果按合成报价计算，未计佣金与滑点。{liquidity}流动性筛选：买卖价差与未平仓量均达标才保留。
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto mt-10 max-w-[728px] px-4 sm:px-0">
          <section className="space-y-3 text-[14px] leading-relaxed text-muted">
            <h2 className="text-[16px] font-semibold tracking-[-0.005em] text-text">期权扫描是怎么运作的</h2>
            <p>
              扫描会把所选标的、到期日下的整条期权链逐腿读一遍，按你的观点拼出候选交易。
              它会评估几百个行权价组合，而不是只看最显眼的那几个。
              看涨、看跌与波动类扫描评估单腿与价差；中性扫描则偏向收权利金的结构，例如铁鹰式与铁蝶式。
            </p>
            <p>
              看涨扫描会先找平值附近、Delta 在 30 到 60 之间的看涨，再试着用更高行权价的腿把它变成价差，
              把成本压下来。看跌扫描反过来做。波动类扫描要求两边的行权价尽量对称，
              让方向性风险互相抵消；中性扫描则用两条看跌和两条看涨围出一个区间，收一笔净权利金。
            </p>
            <p>
              每个候选都重新计算最大盈利、最大亏损、盈亏平衡点和盈利概率。概率采用风险中性测度，
              并把每个行权价的隐含波动率偏斜考虑进去，而不是拿一个平均值套所有合约。
              预期价值算的是“按今天的价格持有到期，平均能赚多少”——扣掉你付出的权利金，
              再把概率加权，所以它通常比最大盈利小得多。
            </p>
            <p>
              默认会剔除流动性不足的腿：买卖价差过宽、未平仓量太少的合约不参与排名。
              严格筛选要求买卖价差在中点的 10% 以内（便宜合约则要求不超过 $0.10），
              并且未平仓量至少 100 张；“标准”和“宽松”会放宽这两条，看看被筛掉的交易长什么样。
              放宽以后也别忘了看一眼买卖价差——同一个行权价，来回一次就可能吃掉一大半权利金。
            </p>
            <p>
              排序方式决定你看到的第一屏：回报率适合找资本效率高的结构，盈利概率适合找胜率高的，
              风险回报与预期价值则更接近“这笔交易值不值得做”的问题。
              按回报率排序时，小额投入、高杠杆的结构会排在最前，但它们通常只有百分之十几的胜率。
              先想清楚自己要的是胜率、回报还是稳妥的预期价值，再决定用哪种排序，读起来会顺很多。
            </p>
            <p>
              目标价与区间是可选项。填了以后，扫描会优先保留到期时落在目标区间的结构，
              并把盈亏平衡点与目标价的距离写进结果，免得你拿到一串数字还要自己对照。
              不填就按当前现价与隐含波动率来判断。目标价只是筛选条件，不会改变盈亏图上的任何一条线。
            </p>
            <p>
              结果里的“净收”与“净付”指整组腿的现金流：净收的交易一开始就把权利金放进你的账户，
              但之后要承担被行权或价格穿过区间的风险；净付的交易先花钱买入保护，
              最大亏损就是你付出的那笔钱。两者在盈亏图上的形状完全不同。
            </p>
            <p>
              每条腿的成交价都按合成链的买价或卖价取：买入付卖价，卖出收买价。
              所以同一组行权价，来回一次就已经亏掉了买卖价差，这也是扫描把流动性放在第一位的原因。
              真实成交还会有佣金、滑点与提前指派，扫描结果不会替你承担这些成本。
              如果某一腿的买卖价差实在太宽，排名再靠前也建议先放一放。
            </p>
            <p>
              如果某个观点一个结果都没扫出来，通常不是链里没有合约，而是过不了流动性筛选，
              或者到期日太近、行权价间距太大，拼不出形状合适的结构。
              把筛选放宽到“标准”、换一个更远的到期日，或者干脆不填目标价，往往就能看到候选。
            </p>
            <p>
              收盘后的报价来自上一交易时段，不会自动更新；开盘后扫描会使用新的合成链。
              合成报价按 Black-Scholes 与逐行权价偏斜生成，成交量与未平仓量仅为情景模拟。
              所有数字都是情景分析，不构成投资建议。
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.005em]">相关工具</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                ["Black-Scholes 计算器", "用 Black-Scholes-Merton 模型算看涨与看跌的理论价，含股息与希腊值。", "/tools/black-scholes", Sigma],
                ["希腊值计算器", "整笔持仓的 Delta、Gamma、Theta、Vega 与 Rho，按美元换算。", "/tools/greeks-calculator", ChartLine],
                ["隐含波动率计算器", "从期权报价反解波动率，以及它隐含的预期波动。", "/tools/iv-calculator", Bolt],
                ["盈亏平衡计算器", "最多四腿的盈亏平衡点、最大盈利与最大亏损。", "/tools/breakeven-calculator", Calendar],
              ].map(([title, body, href, Icon]) => {
                const Glyph = Icon as typeof Sigma;
                return (
                  <li key={href as string} className="h-full">
                    <Link
                      to={href as string}
                      className="group flex h-full min-h-[96px] items-start gap-3 rounded-lg border border-line-subtle bg-panel px-3 py-3 transition-colors hover:border-line-strong"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/8 text-accent">
                        <Glyph size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold group-hover:text-accent">{title as string}</span>
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{body as string}</span>
                      </span>
                      <ArrowRight size={14} className="mt-0.5 shrink-0 text-faint" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="text-[13px]">
              或者打开{" "}
              <Link to="/calculator" className="font-medium text-accent hover:text-accent-hover">
                期权计算器
              </Link>
              ，在实时合成链上手动搭任意策略，也可以看看{" "}
              <Link to="/methodology" className="font-medium text-accent hover:text-accent-hover">
                我们如何定价期权
              </Link>
              ，或浏览{" "}
              <Link to="/strategies" className="font-medium text-accent hover:text-accent-hover">
                策略指南
              </Link>
              。
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
