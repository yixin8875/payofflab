import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { MarketingHeader } from "../components/MarketingHeader";
import { HeroMockup, HeroMockupMobile } from "../components/HeroMockup";
import { Sparkline } from "../components/Sparkline";
import { legsFor } from "../lib/presets";
import { EXPIRIES, ticker } from "../data/tickers";
import {
  ArrowRight,
  Bolt,
  Calendar,
  ChartLine,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  Sigma,
  Target,
  TrendUp,
} from "../components/Icons";

const SPY = ticker("SPY");
const EXPIRY = EXPIRIES[3];

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="home-hero relative overflow-hidden">
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[1300px] w-full"
        viewBox="0 0 1440 1300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            className="hero-envelope"
            d={`M ${-260 + i * 120} 1300 C ${280 - i * 40} ${760 + i * 60}, ${1160 + i * 40} ${760 + i * 60}, ${1700 - i * 120} 1300`}
          />
        ))}
        <path className="hero-envelope" d="M720 0 V 690" strokeOpacity="0.5" />
        <path className="hero-envelope" d="M360 0 V 760 M1080 0 V 760" strokeOpacity="0.35" />
        <ellipse cx="720" cy="700" rx="620" ry="240" className="hero-envelope" strokeOpacity="0.6" />
      </svg>

      <div className="relative mx-auto max-w-[1240px] px-4 pb-14 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1 text-[13px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-profit" />
            免费 · 无需账户 · 41 个策略指南
          </p>
          <h1 className="mt-6 break-words text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-text sm:text-[60px] lg:text-[68px]">
            看清每笔期权的盈亏
            <span className="mt-1 block font-serif text-[1.02em] tracking-[-0.03em]">在下单之前。</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[19px]">
            免费，无需账户。别处收费的专业期权工具箱——盈利概率、净希腊值、IV 排名与扫描，
            全部在这儿，用中文说明白。
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/calculator" className="btn-primary h-12 px-6 text-[15px]">
              打开应用
              <ArrowRight size={16} />
            </Link>
            <Link to="/strategies" className="btn-secondary h-12 px-6 text-[15px]">
              浏览策略
            </Link>
          </div>
          <Link
            to="/strategies/covered-call"
            className="mt-2 inline-block py-2 text-[15px] font-medium text-accent transition-colors hover:text-accent-hover"
          >
            第一次接触期权？看看备兑看涨到底在做什么
            <ArrowRight size={15} className="ml-1 inline" />
          </Link>
          <p className="mt-3 text-[13px] text-dim">
            延迟行情 · 基于国债曲线的 Black-Scholes · 为检查自己的交易而建
          </p>
        </div>
        <HeroMockup />
        <HeroMockupMobile />
      </div>
    </section>
  );
}

/* --------------------------------------------------------- mini previews */

function StatBar({ label, value, tone }: { label: string; value: string; tone?: "profit" | "text" }) {
  return (
    <div>
      <p className="truncate text-[11px] text-dim">{label}</p>
      <p className={`mt-0.5 text-[16px] font-semibold tnum ${tone === "profit" ? "text-profit" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}

function LegRow({ side, qty, kind, strike, price }: { side: "买入" | "卖出"; qty: number; kind: string; strike: string; price: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-line-subtle px-2 py-1.5 last:border-0">
      <span
        className={`w-8 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-medium ${
          side === "卖出" ? "bg-loss-soft text-loss" : "bg-profit-soft text-profit"
        }`}
      >
        {side}
      </span>
      <span className="w-5 text-right text-[12px] tnum">{qty}</span>
      <span className="w-9 rounded border border-line px-1 text-center text-[11px]">{kind}</span>
      <span className="min-w-[38px] rounded border border-line px-1 text-center text-[11px] tnum">{strike}</span>
      <span className="flex-1 text-[11px] text-dim">{EXPIRY.label}</span>
      <span className="text-[11px] text-dim tnum">{price}</span>
      <ChevronDown size={11} className="text-faint" />
    </div>
  );
}

function BuildPreview() {
  return (
    <div className="relative h-[290px] overflow-hidden bg-sunken/70 px-6 pt-6">
      <div className="rounded-xl border border-line bg-panel shadow-[0_6px_20px_#1018280d]">
        <div className="flex items-center justify-between border-b border-line-subtle px-3 py-2 text-[11px]">
          <span className="font-semibold">SPY · 铁鹰式 · {EXPIRY.label}</span>
          <span className="text-[10px] text-dim">×1 · 加腿</span>
        </div>
        <LegRow side="卖出" qty={1} kind="P" strike="715" price="2.26" />
        <LegRow side="买入" qty={1} kind="P" strike="710" price="1.21" />
        <LegRow side="卖出" qty={1} kind="C" strike="765" price="2.04" />
        <LegRow side="买入" qty={1} kind="C" strike="770" price="1.22" />
        <div className="px-3 py-2">
          <div className="rounded-lg border border-line bg-white p-2.5">
            <p className="text-[12px] font-semibold">你收到 $218。</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              SPY 在 {EXPIRY.label} 收于 $742.82 与 $807.18 之间时盈利（−4.5% / +3.1%）。
            </p>
          </div>
        </div>
      </div>
      <div className="mx-2 mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[11px] text-muted shadow-sm">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Info size={11} />
        </span>
        已切换到 QQQ · 交易保留
        <button className="ml-auto text-[11px] font-medium text-accent">撤销</button>
      </div>
    </div>
  );
}

function ChainPreview() {
  const rows = [
    { k: 760, c: ["3.02", "3.18"], p: ["1.12", "1.24"] },
    { k: 770, c: ["1.95", "2.08"], p: ["1.86", "1.99"] },
    { k: 778, c: ["1.41", "1.52"], p: ["2.58", "2.71"], spot: true },
    { k: 780, c: ["1.21", "1.33"], p: ["2.94", "3.07"] },
    { k: 790, c: ["0.72", "0.81"], p: ["4.02", "4.18"] },
    { k: 800, c: ["0.41", "0.49"], p: ["5.16", "5.34"] },
  ];
  return (
    <div className="relative h-[290px] overflow-hidden bg-sunken/70 px-6 pt-6">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1 rounded-xl border border-line bg-panel shadow-[0_6px_20px_#1018280d]">
          <div className="grid grid-cols-[1fr_1fr_52px_1fr_1fr] gap-1 border-b border-line px-3 py-2 text-[9px] font-medium uppercase tracking-wide text-dim">
            <span>买价</span>
            <span>卖价</span>
            <span className="text-center">行权价</span>
            <span>买价</span>
            <span className="text-right">卖价</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.k}
              className={`grid grid-cols-[1fr_1fr_52px_1fr_1fr] items-center gap-1 px-3 py-[5px] text-[10.5px] tnum ${
                r.spot ? "bg-accent/8 font-semibold text-accent" : "text-muted"
              }`}
            >
              <span>{r.c[0]}</span>
              <span>{r.c[1]}</span>
              <span className="rounded border border-line-subtle bg-surface/60 px-1 text-center">{r.k}</span>
              <span>{r.p[0]}</span>
              <span className="text-right">{r.p[1]}</span>
            </div>
          ))}
        </div>
        <div className="w-[124px] shrink-0 rounded-xl border border-line bg-panel p-3 shadow-[0_6px_20px_#1018280d]">
          <p className="text-[12px] font-semibold">波动率</p>
          <p className="mt-3 text-[11px] text-dim">IV 排名</p>
          <p className="text-[15px] font-semibold tnum">
            14 <span className="text-[10px] font-normal text-faint">百分位 20</span>
          </p>
          <p className="mt-2 text-[11px] text-dim">预期波动</p>
          <p className="text-[15px] font-semibold tnum">±$13.71</p>
          <svg viewBox="0 0 100 44" className="mt-3 w-full" aria-hidden="true">
            <path d="M2 34 L14 30 L25 33 L36 22 L48 26 L60 18 L71 21 L83 12 L98 15" fill="none" stroke="#1f5bdf" strokeWidth="1.4" />
            <circle cx="98" cy="15" r="2" fill="#1f5bdf" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PositionsPreview() {
  const rows = [
    { sym: "SPY", name: "备兑看涨", days: "27天", pnl: "+$186", tone: "profit" },
    { sym: "QQQ", name: "铁鹰式", days: "14天", pnl: "−$64", tone: "loss" },
    { sym: "NVDA", name: "牛市看涨价差", days: "42天", pnl: "+$290", tone: "profit" },
  ];
  return (
    <div className="relative h-[290px] overflow-hidden bg-sunken/70 px-6 pt-6">
      <div className="rounded-xl border border-line bg-panel shadow-[0_6px_20px_#1018280d]">
        <div className="grid grid-cols-3 gap-2 px-3 py-3">
          <StatBar label="未平仓盈亏" value="+$412" tone="profit" />
          <StatBar label="本月权利金" value="$1,284" />
          <StatBar label="净 Theta" value="+$38/天" />
        </div>
        <p className="flex items-center gap-2 border-y border-line-subtle bg-surface/40 px-3 py-2 text-[12px] font-semibold">
          需要注意 <span className="rounded-full bg-loss/10 px-1.5 text-[10px] text-loss">3</span>
        </p>
        <div>
          {rows.map((r) => (
            <div key={r.sym + r.name} className="flex items-center gap-2 border-b border-line-subtle px-3 py-2 last:border-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface text-[9px] font-semibold">
                {r.sym.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium">{r.name}</p>
                <p className="text-[10px] text-dim">
                  {r.sym} · {r.days}
                </p>
              </div>
              <span className={`ml-auto text-[12px] font-medium tnum ${r.tone === "loss" ? "text-loss" : "text-profit"}`}>
                {r.pnl}
              </span>
              <ChevronRight size={12} className="text-faint" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScanPreview() {
  const rows = [
    { trade: "铁鹰式 715/710 · 765/770", pop: "78%", ror: "0.24", risk: "$218" },
    { trade: "牛市看涨价差 780/790", pop: "61%", ror: "0.42", risk: "$793" },
    { trade: "现金担保看跌 715", pop: "72%", ror: "0.31", risk: "$1,021" },
    { trade: "铁蝶式 770/778/786", pop: "66%", ror: "0.19", risk: "$331" },
  ];
  return (
    <div className="relative h-[290px] overflow-hidden bg-sunken/70 px-6 pt-6">
      <div className="rounded-xl border border-line bg-panel shadow-[0_6px_20px_#1018280d]">
        <div className="flex items-center gap-1.5 border-b border-line-subtle px-3 py-2 text-[10px]">
          {["SPY", "中性", `${EXPIRY.dte}天`, "严格流动性"].map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-md border border-line bg-white px-1.5 py-1 text-muted">
              {t}
              <ChevronDown size={9} className="text-faint" />
            </span>
          ))}
          <span className="ml-auto rounded-md bg-accent px-2 py-1 text-[10px] font-medium text-white">扫描</span>
        </div>
        <div className="grid grid-cols-[1fr_44px_44px_58px] gap-2 border-b border-line-subtle px-3 py-1.5 text-[9px] font-medium uppercase tracking-wide text-dim">
          <span>交易</span>
          <span className="text-right">盈利概率</span>
          <span className="text-right">回报率</span>
          <span className="text-right">风险</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.trade}
            className="grid grid-cols-[1fr_44px_44px_58px] items-center gap-2 border-b border-line-subtle px-3 py-[7px] text-[10.5px] last:border-0"
          >
            <span className="truncate font-medium text-text">{r.trade}</span>
            <span className="text-right text-profit tnum">{r.pop}</span>
            <span className="text-right tnum">{r.ror}</span>
            <span className={`text-right tnum ${i === 1 ? "text-loss" : "text-muted"}`}>{r.risk}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Sigma,
    title: "盈利概率",
    body: "在每一笔交易上按风险中性计算，并对盈亏平衡点做偏斜修正。",
  },
  {
    icon: ChartLine,
    title: "净希腊值",
    body: "整个持仓的 Delta、Gamma、Theta、Vega 与 Rho，全部换算成美元。",
  },
  {
    icon: Bolt,
    title: "IV 排名与分位",
    body: "今天的平值隐含波动率处在过去一年区间的什么位置。",
  },
  {
    icon: Target,
    title: "扫描",
    body: "按流动性筛选的价差、铁鹰式与现金担保看跌，排好序等你挑。",
  },
  {
    icon: Lock,
    title: "保存的交易与提醒",
    body: "持仓按市价重估，浏览器提醒；数据只留在你自己的设备上。",
  },
];

const CARDS = [
  { slug: "covered-call", preset: "covered-call", name: "备兑看涨", outlook: "中性", icon: TrendUp },
  { slug: "cash-secured-put", preset: "cash-secured-put", name: "现金担保看跌", outlook: "看涨", icon: TrendUp },
  { slug: "bull-call-spread", preset: "bull-call-spread", name: "牛市看涨价差", outlook: "看涨", icon: TrendUp },
  { slug: "iron-condor", preset: "iron-condor", name: "铁鹰式", outlook: "中性", icon: ArrowRight },
  { slug: "long-straddle", preset: "long-straddle", name: "买入跨式", outlook: "波动", icon: Bolt },
  { slug: "calendar-spread", preset: "calendar", name: "日历价差", outlook: "中性", icon: Calendar },
];

function FeaturedCard({ card }: { card: (typeof CARDS)[number] }) {
  const legs = legsFor(card.preset, SPY, EXPIRY.iso);
  const Icon = card.icon;
  return (
    <Link
      to={`/strategies/${card.slug}`}
      className="group flex flex-col rounded-xl border border-line bg-panel p-3.5 transition-colors hover:border-line-strong"
    >
      <Sparkline legs={legs} spot={SPY.spot} width={140} height={52} className="mx-auto" sample />
      <h3 className="mt-3 text-[14px] font-semibold leading-snug text-text group-hover:text-accent">{card.name}</h3>
      <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-muted">
        <Icon size={13} className="text-faint" />
        {card.outlook}
      </p>
    </Link>
  );
}

/* --------------------------------------------------------------- sections */

function Workspace() {
  const cards = [
    {
      label: "构建",
      title: "塑造交易，读出结论",
      body: "把行权价一格一格调到下一个挂牌合约，或从预设起步——图、盈亏平衡点和一句话结论会跟着变。每一腿的成交价都写得清清楚楚，不用回头翻表格。",
      href: "/calculator",
      link: "打开构建",
      preview: <BuildPreview />,
    },
    {
      label: "期权链",
      title: "密集的期权链，旁边就是波动率全景",
      body: "看涨、行权价与看跌挤在一张表里，带现价参考线，每个到期日都能一键带进构建器。行权价按间距排好，滚动时列标题一直留在顶上。",
      href: "/options-chain",
      link: "打开期权链",
      preview: <ChainPreview />,
    },
    {
      label: "持仓",
      title: "早间巡检，标出需要你处理的事",
      body: "保存的交易按市价重估，附上盈亏、Theta 与剩余天数。规则到期、接近行权价时提醒你。不用每天手动抄一遍价格，打开应用就有当天的体检结果。",
      href: "/trades",
      link: "打开持仓",
      preview: <PositionsPreview />,
    },
    {
      label: "扫描",
      title: "为你的观点排出候选交易",
      body: "选一个标的和方向，扫描会把每条腿的流动性筛一遍，再按盈利概率与回报排序。结果里的每一笔都能直接带进构建器，改完腿再看。",
      href: "/tools/option-finder",
      link: "运行扫描",
      preview: <ScanPreview />,
    },
  ];
  return (
    <section className="border-t border-line/70 pb-12 pt-20 sm:pb-16 sm:pt-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="text-[13px] font-medium text-accent">工作区</p>
        <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-text sm:text-[38px]">
          一笔交易的全程，一个应用
        </h2>
        <p className="mt-4 max-w-[672px] text-[16px] leading-relaxed text-muted sm:text-[17px]">
          先建出来，再拿去期权链对照，扫一遍替代方案，最后放进持仓每天盯着。全程不用切换标签页。
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <article key={c.label} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
              {c.preview}
              <div className="flex flex-1 flex-col px-6 pb-6 pt-6">
                <p className="flex items-center gap-2 text-[13px] font-medium text-accent">
                  {c.label}
                  <ArrowRight size={15} />
                </p>
                <h3 className="mt-2 text-[19px] font-semibold leading-snug tracking-[-0.015em] text-text">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
                <Link
                  to={c.href}
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-medium text-text transition-colors hover:text-accent"
                >
                  {c.link}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FreeFeatures() {
  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-7">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-text sm:text-[22px]">
                别处要付费的功能，这里免费。
              </h2>
              <p className="mt-1.5 text-[15px] text-muted">没有试用期，不要银行卡，不设账户——也不藏功能。</p>
            </div>
            <Link
              to="/options-chain/spy"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:text-accent-hover"
            >
              在 SPY 上试试
              <ArrowRight size={15} />
            </Link>
          </div>
          <ul className="grid border-t border-line-subtle sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <li
                  key={f.title}
                  className={`flex gap-3 border-line-subtle px-5 py-4 lg:block lg:py-6 ${
                    i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""
                  } ${i % 2 === 0 && i > 0 ? "sm:border-t sm:border-l-0" : ""}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-semibold text-text lg:mt-4">{f.title}</h3>
                      <Check size={15} className="mt-1 hidden shrink-0 text-profit lg:block" />
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Learn() {
  return (
    <section className="pb-20 pt-12 sm:pb-24 sm:pt-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[672px]">
            <p className="text-[13px] font-medium text-accent">学习</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-text sm:text-[38px]">
              每个策略，都有一份指南
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-muted sm:text-[17px]">
              41 个策略，每一个都有盈亏图、最大盈利与亏损、一个算好的例子，以及什么时候不该用它。
            </p>
          </div>
          <Link to="/strategies" className="btn-secondary h-10 shrink-0 self-start px-4 text-[14px] sm:self-auto">
            全部策略
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CARDS.map((c) => (
            <FeaturedCard key={c.slug} card={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Methodology() {
  const rows = [
    ["报价时间", "2026 年 11 月 6 日收盘"],
    ["定价模型", "Black-Scholes-Merton"],
    ["无风险利率", "4.02% · 国债曲线"],
    ["股息率", "1.03% · 指数预估"],
    ["隐含波动率", "按行权价偏斜，逐个合约"],
  ];
  return (
    <section className="border-y border-line/70 bg-panel/40 py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-[453px_1fr] lg:gap-16">
        <div>
          <p className="text-[13px] font-medium text-accent">方法</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-text sm:text-[38px]">
            数字经得起你核对
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted sm:text-[17px]">
            每个数字都说得出出处：报价时间、所用模型和它的假设。怀疑哪个值，就照着公式自己算一遍——
            我们宁可你算得比我们更清楚。
          </p>
          <Link to="/methodology" className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent hover:text-accent-hover">
            阅读计算方法
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="min-w-0 rounded-xl border border-line bg-panel p-7 shadow-panel">
          <dl className="divide-y divide-line-subtle">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col gap-1.5 py-5 first:pt-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 sm:py-4"
              >
                <dt className="text-[12px] text-dim">{k}</dt>
                <dd className="text-[13.5px] font-medium text-text tnum sm:text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-lg bg-surface/70 p-4">
            <p className="text-[12px] text-dim">收在某个盈亏平衡点 K 之上的概率</p>
            <p className="mt-1.5 w-full min-w-0 overflow-x-auto whitespace-nowrap font-code text-[13.5px] text-text">
              P(S<sub>T</sub> &gt; K) = N(d₂) − e<sup>rT</sup>·S·e<sup>−qT</sup>·φ(d₁)·√T·∂σ/∂K
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-dim">
              概率按对数正态分布计算，并纳入逐行权价的波动率偏斜；它描述的是模型里的情形，不是对结果的承诺。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="rounded-2xl border border-line bg-panel px-6 py-16 text-center shadow-panel sm:px-12 sm:py-20">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-text sm:text-[44px]">
            下一笔交易，
            <span className="font-serif font-normal tracking-[-0.02em]">先画出来。</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-muted sm:text-[17px]">
            无需安装，也不用注册。保存的交易只留在本机。
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/calculator" className="btn-primary h-12 px-6 text-[15px]">
              打开应用
              <ArrowRight size={16} />
            </Link>
            <Link to="/options-chain/spy" className="btn-secondary h-12 px-6 text-[15px]">
              看看 SPY 期权链
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-chrome">
      <MarketingHeader />
      <main className="relative z-10">
        <Hero />
        <Workspace />
        <FreeFeatures />
        <Learn />
        <Methodology />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
