import { useId, useMemo } from "react";
import { EXPIRIES, type Ticker } from "../data/tickers";
import { analyse, markAt, type Analysis, type Instrument, type Leg } from "../lib/options";
import { legsFor } from "../lib/presets";
import { pricedLeg } from "../lib/chain";
import { money, pct } from "../lib/format";
import {
  ArrowRight,
  Bars,
  Book,
  Calendar,
  Check,
  Chain,
  ChartLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Lock,
  More,
  Plus,
  Share,
  Star,
  Target,
} from "./Icons";

const HERO_TICKER: Ticker = {
  symbol: "SPY",
  name: "SPDR 标普500 ETF",
  spot: 778.03,
  change: 3.12,
  changePct: 0.004,
  iv: 0.125,
  ivRank: 14,
  strikeStep: 5,
  group: "etf",
};

const HERO_INSTRUMENT: Instrument = { ...HERO_TICKER, expiries: EXPIRIES };

const EXPIRY = EXPIRIES[3];
const LABEL = "12月4日";
const DAYS = 27;
const CAP = 790;

const COMPARE = [
  { key: "covered-call", name: "备兑看涨", color: "#007558" },
  { key: "iron-condor", name: "铁鹰式", color: "#1f5bdf" },
  { key: "bull-call-spread", name: "牛市看涨价差", color: "#bc3722" },
  { key: "long-straddle", name: "买入跨式", color: "#8a93a1" },
];

/** The hero shows a covered call capped at 790 — the strike the chart labels. */
function heroLegs(key: string): Leg[] {
  if (key === "covered-call") {
    return [
      pricedLeg(HERO_TICKER, "stock", 1, 1, HERO_TICKER.spot, EXPIRY.iso),
      pricedLeg(HERO_TICKER, "call", -1, 1, CAP, EXPIRY.iso),
    ];
  }
  return legsFor(key, HERO_TICKER, EXPIRY.iso);
}

function payoffSeries(legs: Leg[], spot: number) {
  const lo = spot * 0.9;
  const hi = spot * 1.1;
  const pts: { p: number; v: number }[] = [];
  for (let i = 0; i <= 80; i++) {
    const p = lo + ((hi - lo) * i) / 80;
    pts.push({ p, v: seriesValue(legs, p) });
  }
  return pts;
}

function seriesValue(legs: Leg[], S: number): number {
  return legs.reduce((sum, leg) => {
    const dir = leg.side * leg.qty * 100;
    if (leg.kind === "stock") return sum + dir * (S - leg.fill);
    const intrinsic = leg.kind === "call" ? Math.max(S - leg.strike, 0) : Math.max(leg.strike - S, 0);
    return sum + dir * (intrinsic - leg.fill);
  }, 0);
}

function MiniCurve({
  legs,
  spot,
  color,
  width,
  height,
  label,
}: {
  legs: Leg[];
  spot: number;
  color: string;
  width: number;
  height: number;
  label?: string;
}) {
  const clipId = useId();
  const pts = payoffSeries(legs, spot);
  const values = pts.map((d) => d.v);
  const mn = Math.min(...values, 0);
  const mx = Math.max(...values, 0);
  const pad = 6;
  const x = (p: number) => pad + ((p - spot * 0.9) / (spot * 0.2)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - mn) / (mx - mn || 1)) * (height - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.p).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  const area = `${d} L${x(spot * 1.1).toFixed(1)} ${zeroY} L${x(spot * 0.9).toFixed(1)} ${zeroY} Z`;
  const spotValue = seriesValue(legs, spot);
  const sx = x(spot);
  const sy = y(spotValue);
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={area} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={width} height={Math.max(zeroY, 0)} fill={color} fillOpacity="0.1" clipPath={`url(#${clipId})`} />
      <rect
        x="0"
        y={zeroY}
        width={width}
        height={Math.max(height - zeroY, 0)}
        fill="#bc3722"
        fillOpacity="0.08"
        clipPath={`url(#${clipId})`}
      />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={sx} cy={sy} r="2.3" fill="#0f141c" />
      {label && (
        <g transform={`translate(${sx.toFixed(1)} ${Math.max(sy - 17, 8).toFixed(1)})`}>
          <rect x="-27" y="-9" width="54" height="12" rx="3" fill="#fff" stroke="#d4d9e0" />
          <text x="0" y="-0.5" fontSize="7.5" textAnchor="middle" fill="#465060">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------- the payoff canvas */

function HeroChart({ analysis, legs }: { analysis: Analysis; legs: Leg[] }) {
  const spot = HERO_TICKER.spot;
  const lo = spot * 0.9;
  const hi = spot * 1.1;
  const yMin = -6500;
  const yMax = 4500;
  const W = 540;
  const H = 300;
  const top = 12;

  const px = (p: number) => ((p - lo) / (hi - lo)) * W;
  const py = (v: number) => top + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * H;

  const path = (fn: (p: number) => number, from: number, to: number) => {
    const pts: string[] = [];
    const n = 140;
    for (let i = 0; i <= n; i++) {
      const p = from + ((to - from) * i) / n;
      pts.push(`${i === 0 ? "M" : "L"}${px(p).toFixed(1)} ${py(fn(p)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  const expiry = (p: number) => seriesValue(legs, p);
  const today = (p: number) => markAt(legs, p, (DAYS - 1) / 365, HERO_TICKER.iv);
  const breakeven = analysis.breakevens[0] ?? spot;
  const expiryAtSpot = py(expiry(spot));

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex items-baseline gap-2 px-3 py-2 text-[10.5px]">
        <span className="font-medium text-text">
          SPY · {COMPARE[0].name} · {LABEL}（{DAYS}天）·{" "}
          <span className="text-profit tnum">+${Math.round(Math.abs(analysis.debit))} 收入</span>
        </span>
        <span className="ml-auto flex items-center gap-3 text-[10px] text-dim">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 rounded bg-accent" /> 今日
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 rounded bg-profit" /> 到期
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 600 ${H + 40}`} className="min-h-0 w-full flex-1" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id="hero-plot">
            <rect x="0" y={top - 4} width={W} height={H + 8} />
          </clipPath>
        </defs>
        {/* loss / profit zones */}
        <rect x={px(lo)} y={top} width={Math.max(0, px(breakeven) - px(lo))} height={H} fill="#bc3722" fillOpacity="0.045" />
        <rect
          x={px(breakeven)}
          y={top}
          width={Math.max(0, px(hi) - px(breakeven))}
          height={H}
          fill="#007558"
          fillOpacity="0.055"
        />
        <rect x={px(spot)} y={top} width={Math.max(0, px(hi) - px(spot))} height={H} fill="#1f5bdf" fillOpacity="0.03" />
        {[4000, 0, -2000, -4000, -6000].map((v) => (
          <line key={v} x1="0" x2={W} y1={py(v)} y2={py(v)} stroke="#e2e6eb" strokeDasharray="2 4" />
        ))}
        <g clipPath="url(#hero-plot)">
          <path d={path(expiry, lo, Math.min(breakeven, hi))} fill="none" stroke="#bc3722" strokeWidth="1.6" />
          <path d={path(expiry, Math.max(breakeven, lo), hi)} fill="none" stroke="#007558" strokeWidth="1.6" />
          <path d={path(today, lo, hi)} fill="none" stroke="#1f5bdf" strokeWidth="1.5" />
        </g>
        <line x1={px(spot)} x2={px(spot)} y1={top} y2={top + H} stroke="#465060" strokeOpacity="0.35" strokeDasharray="3 4" />
        <circle cx={px(spot)} cy={expiryAtSpot} r="4" fill="#0f141c" />
        <circle cx={px(spot)} cy={expiryAtSpot} r="2" fill="#fff" />
        {/* spot tooltip */}
        <g>
          <rect x={px(spot) - 34} y={top + 4} width="72" height="18" rx="4" fill="#fff" stroke="#d4d9e0" />
          <text x={px(spot) - 30} y={top + 17} fontSize="9.5" fill="#0f141c" className="tnum">
            SPY {spot.toFixed(2)}
          </text>
          <text x={px(spot) + 42} y={top + 17} fontSize="9" fill="#1f5bdf" className="tnum">
            ±${analysis.expectedMove.toFixed(2)}
          </text>
        </g>
        {/* strike marker */}
        <g>
          <rect x={px(CAP) - 18} y={top + H - 4} width="40" height="16" rx="4" fill="#fff" stroke="#d4d9e0" />
          <text x={px(CAP) - 12} y={top + H + 7} fontSize="9" fill="#465060" className="tnum">
            C {CAP}
          </text>
        </g>
        {[4000, 0, -2000, -4000, -6000].map((v) => (
          <text
            key={v}
            x={W + 8}
            y={py(v) + 3}
            fontSize="9.5"
            fill="#8a93a1"
            className="tnum"
          >
            {v === 0 ? "$0" : `${v < 0 ? "−" : ""}$${Math.abs(v) / 1000}k`}
          </text>
        ))}
        {[720, 760, 800, 840].map((v) => (
          <text key={v} x={px(v)} y={H + 32} fontSize="9.5" fill="#8a93a1" textAnchor="middle" className="tnum">
            {v}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------ the preview */

export function HeroMockup() {
  const built = useMemo(
    () => COMPARE.map((c) => ({ ...c, legs: heroLegs(c.key) })),
    [],
  );
  const analyses = useMemo(
    () => built.map((b) => ({ ...b, a: analyse(b.legs, HERO_INSTRUMENT, DAYS / 365) })),
    [built],
  );
  const spot = HERO_TICKER.spot;
  const covered = analyses[0];
  const a = covered.a;
  const legs = covered.legs;

  const stats: { label: string; value: string; tone?: "profit" | "loss" }[] = [
    { label: "净收入", value: money(Math.abs(a.premium)) },
    { label: "盈利概率", value: pct(a.probProfit) },
    { label: "最大盈利", value: a.maxProfit === null ? "无限" : money(a.maxProfit), tone: "profit" },
    { label: "最大亏损", value: a.maxLoss === null ? "无限" : money(a.maxLoss), tone: "loss" },
    { label: "盈亏平衡", value: a.breakevens.length ? a.breakevens.map((b) => b.toFixed(2)).join(" / ") : "—" },
    { label: "每日 Theta", value: `${a.theta > 0 ? "+" : ""}$${a.theta.toFixed(0)}/天`, tone: a.theta > 0 ? "profit" : "loss" },
    { label: "风险回报", value: a.riskReward },
    { label: "预期波动", value: `±$${a.expectedMove.toFixed(2)}` },
  ];

  const rail: { label: string; Icon: typeof ChartLine }[] = [
    { label: "构建", Icon: ChartLine },
    { label: "期权链", Icon: Chain },
    { label: "持仓", Icon: Bars },
    { label: "自选", Icon: Star },
    { label: "扫描", Icon: Target },
    { label: "学习", Icon: Book },
  ];

  return (
    <div className="relative mx-auto mt-16 hidden w-full max-w-[1192px] md:block">
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_64px_#1018281a]">
        {/* window chrome */}
        <div className="relative flex h-[37px] items-center border-b border-line-subtle bg-surface/70 px-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#d4d9e0]" />
            <span className="h-2 w-2 rounded-full bg-[#d4d9e0]" />
            <span className="h-2 w-2 rounded-full bg-[#d4d9e0]" />
          </div>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-line-subtle bg-white px-2.5 py-0.5 text-[10.5px] text-dim">
            <Lock size={10} />
            期权盈亏图 / 构建
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-dim">
            <Share size={12} />
            <span className="h-3 w-3 rounded-sm border border-line-strong" />
          </div>
        </div>

        <div className="flex h-[500px] lg:h-[557px]">
          {/* rail */}
          <nav className="hidden w-[52px] shrink-0 flex-col items-center gap-0.5 border-r border-line-subtle bg-chrome pt-2 lg:flex">
            {rail.map((item, i) => (
              <span
                key={item.label}
                className={`flex w-full flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] ${
                  i === 0 ? "bg-accent/10 font-medium text-accent" : "text-dim"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    i === 0 ? "text-accent" : "text-muted"
                  }`}
                >
                  <item.Icon size={15} />
                </span>
                {item.label}
              </span>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* ticker bar */}
            <div className="flex h-[43px] items-center gap-2 border-b border-line-subtle px-3 text-[10.5px]">
              <span className="text-[13px] font-semibold tracking-[0.02em]">SPY</span>
              <span className="text-dim">SPDR 标普500 ETF</span>
              <ChevronDown size={10} className="text-dim" />
              <span className="ml-1 text-[14px] font-semibold tnum">${spot.toFixed(2)}</span>
              <span className="rounded border border-line px-1.5 py-0.5 text-[9.5px] text-dim">示例</span>
              <span className="ml-auto flex items-center gap-2 text-[9.5px] text-dim tnum">
                <span className="flex h-[22px] items-center gap-1 rounded border border-line bg-panel px-2">
                  EM ±$27.88 · 12月4日
                </span>
                <span className="flex h-[22px] items-center rounded border border-line bg-panel px-2">IVR 14</span>
                <span className="flex items-center gap-1 px-1">
                  <span className="h-1 w-1 rounded-full bg-dim" />
                  示意价格
                </span>
                <span className="flex items-center gap-1">
                  <Bars size={11} /> 保存
                </span>
                <span className="flex items-center gap-1">
                  <Share size={11} /> 分享
                </span>
              </span>
            </div>

            {/* chips */}
            <div className="no-scrollbar flex h-[45px] items-center gap-1.5 overflow-hidden border-b border-line-subtle px-3 text-[10px]">
              <button className="flex h-[22px] shrink-0 items-center gap-1 rounded-md border border-line bg-white px-2 font-medium text-text">
                <Calendar size={10} className="text-dim" />
                {LABEL} · {DAYS}天
                <ChevronDown size={9} className="text-dim" />
              </button>
              {[
                { g: "看涨", items: ["牛市看涨价差", "备兑看涨", "牛市看跌价差"] },
                { g: "中性", items: ["铁鹰式", "铁蝶式"] },
                { g: "波动", items: ["买入跨式", "买入宽跨式"] },
              ].map((group) => (
                <span key={group.g} className="flex shrink-0 items-center gap-1">
                  <span className="px-0.5 text-dim">{group.g}</span>
                  {group.items.map((t) => {
                    const active = t === "备兑看涨";
                    return (
                      <span
                        key={t}
                        className={`rounded-full border px-2 py-0.5 ${
                          active
                            ? "border-accent/40 bg-accent/10 font-medium text-accent"
                            : "border-line bg-panel text-muted"
                        }`}
                      >
                        {t}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>

            <div className="flex min-h-0 flex-1">
              {/* position */}
              <section className="hidden w-[268px] shrink-0 border-r border-line-subtle bg-panel lg:block">
                <div className="flex items-center gap-1.5 px-2.5 pt-2">
                  <span className="text-[11.5px] font-semibold">持仓</span>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">备兑看涨</span>
                  <span className="ml-auto flex items-center gap-1 text-[9px] text-dim">
                    ×1 · <Plus size={9} /> 加腿
                  </span>
                </div>

                <div className="mx-2.5 mt-2 rounded-md border border-line-subtle bg-white px-2 py-1.5">
                  <div className="flex items-center gap-1 text-[9.5px] text-muted">
                    <span className="w-[26px] rounded bg-profit/12 px-1 py-0.5 text-center text-[8.5px] font-medium text-profit">
                      买入
                    </span>
                    <span className="flex items-center rounded border border-line px-0.5">
                      <ChevronLeft size={8} />
                      <span className="px-0.5 tnum">100</span>
                      <ChevronRight size={8} />
                    </span>
                    <span className="text-text">SPY 股票</span>
                    <More size={11} className="ml-auto text-faint" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 pl-0.5 text-[9px] text-dim">
                    <span className="w-[26px]">股票</span>
                    <span className="ml-auto text-text tnum">@ {spot.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mx-2.5 mb-2 mt-1 rounded-md border border-line-subtle bg-white px-2 py-1.5">
                  <div className="flex items-center gap-1 text-[9.5px] text-muted">
                    <span className="w-[26px] rounded bg-loss/12 px-1 py-0.5 text-center text-[8.5px] font-medium text-loss">
                      卖出
                    </span>
                    <span className="flex items-center rounded border border-line px-0.5">
                      <ChevronLeft size={8} />
                      <span className="px-0.5 tnum">1</span>
                      <ChevronRight size={8} />
                    </span>
                    <span className="rounded border border-line px-1 text-center text-text">C</span>
                    <span className="flex items-center rounded border border-line px-0.5 tnum text-text">
                      <ChevronLeft size={8} />
                      <span className="px-0.5">790</span>
                      <ChevronRight size={8} />
                    </span>
                    <More size={11} className="ml-auto text-faint" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 pl-0.5 text-[9px] text-dim">
                    <span>
                      {LABEL} · {DAYS}天
                    </span>
                    <span className="ml-auto">
                      成交 <span className="rounded bg-surface px-1 py-0.5 text-text tnum">6.31</span>
                    </span>
                  </div>
                </div>
              </section>

              {/* chart */}
              <section className="relative flex min-w-0 flex-1 flex-col bg-panel pt-1">
                <HeroChart analysis={a} legs={legs} />
              </section>

              {/* analysis */}
              <section className="w-[260px] shrink-0 border-l border-line-subtle bg-panel lg:w-[280px]">
                <div className="flex items-center justify-between px-2.5 py-2">
                  <span className="text-[11.5px] font-semibold">分析</span>
                  <span className="flex items-center gap-0.5 rounded-md border border-line p-0.5 text-[9px]">
                    <span className="rounded bg-white px-1.5 py-0.5 font-medium text-text">简单</span>
                    <span className="px-1.5 py-0.5 text-dim">专业</span>
                  </span>
                </div>
                <div className="px-2.5 pb-2">
                  <p className="text-[11px] font-semibold text-text">你收到 ${Math.round(Math.abs(a.premium))}。</p>
                  <p className="mt-1 text-[9.5px] leading-[1.5] text-dim">
                    {a.sentence}
                  </p>
                </div>
                <div className="grid grid-cols-2 border-t border-line-subtle">
                  {stats.map((s, i) => (
                    <div
                      key={s.label}
                      className={`px-2.5 py-1.5 ${i % 2 === 1 ? "border-l" : ""} ${
                        i > 1 ? "border-t" : ""
                      } border-line-subtle`}
                    >
                      <p className="text-[9px] text-dim">{s.label}</p>
                      <p
                        className={`mt-0.5 text-[10.5px] font-semibold tnum ${
                          s.tone === "profit" ? "text-profit" : s.tone === "loss" ? "text-loss" : "text-text"
                        }`}
                      >
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex h-[26px] items-center gap-2 border-t border-line-subtle px-3 text-[9px] text-dim">
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-dim" /> 示例交易
              </span>
              <span>示意价格 · SPY 期权，非实时报价 · Black-Scholes · r 4.10% · q 0.97% · IV 12.5%</span>
              <span className="ml-auto flex items-center gap-1">
                <Command size={10} /> K 命令
              </span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}

/** The phone-sized version of the preview, shown below md. */
export function HeroMockupMobile() {
  const legs = useMemo(() => heroLegs("covered-call"), []);
  const a = useMemo(() => analyse(legs, HERO_INSTRUMENT, DAYS / 365), [legs]);
  return (
    <div className="relative mx-auto mt-10 w-full md:hidden">
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_40px_#10182812]">
        <div className="flex items-center gap-1.5 border-b border-line-subtle bg-surface/60 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#d4d9e0]" />
          <span className="h-2 w-2 rounded-full bg-[#d4d9e0]" />
          <span className="h-2 w-2 rounded-full bg-[#d4d9e0]" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-[12px] font-semibold">SPY</span>
          <ChevronDown size={11} />
          <span className="text-[15px] font-semibold tnum">$778.03</span>
          <span className="rounded border border-line px-1.5 py-0.5 text-[9.5px] text-dim">示例</span>
          <span className="ml-auto flex items-center gap-2 text-dim">
            <Bars size={13} />
            <Share size={13} />
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 px-3 pb-2">
          {[
            ["收入", money(Math.abs(a.premium))],
            ["最大盈利", a.maxProfit === null ? "无限" : money(a.maxProfit)],
            ["最大亏损", a.maxLoss === null ? "无限" : money(a.maxLoss)],
            ["盈利概率", pct(a.probProfit)],
          ].map(([label, value], i) => (
            <div key={label}>
              <p className="text-[9.5px] text-dim">{label}</p>
              <p
                className={`mt-0.5 text-[11px] font-semibold tnum ${
                  i === 1 ? "text-profit" : i === 2 ? "text-loss" : "text-text"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-y border-line-subtle px-3 py-1.5">
          {["牛市看涨价差", "备兑看涨", "铁鹰式", "铁蝶式"].map((t, i) => (
            <span
              key={i}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                i === 1 ? "border-accent/40 bg-accent/10 text-accent" : "border-line bg-panel text-muted"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="px-3 pt-2 text-[9.5px] text-dim">
          SPY · 备兑看涨 · {LABEL}（{DAYS}天）
          <span className="ml-1.5 text-profit tnum">+{money(Math.abs(a.premium))} 收入</span>
        </div>
        <svg viewBox="0 0 340 180" className="w-full" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <line key={i} x1="8" x2="332" y1={36 + i * 50} y2={36 + i * 50} stroke="#e2e6eb" strokeDasharray="2 4" />
          ))}
          <rect x="8" y="20" width="324" height="140" fill="#1f5bdf" fillOpacity="0.04" />
          <MiniCurve
            legs={legs}
            spot={HERO_TICKER.spot}
            color="#007558"
            width={324}
            height={158}
            label={`SPY ${HERO_TICKER.spot.toFixed(2)}`}
          />
          <line x1="170" x2="170" y1="20" y2="160" stroke="#465060" strokeOpacity="0.3" strokeDasharray="3 4" />
          {[4000, 0, -2000, -4000].map((v, i) => (
            <text key={v} x="332" y={40 + i * 40} fontSize="8" fill="#8a93a1" textAnchor="end" className="tnum">
              {v === 0 ? "$0" : `${v < 0 ? "−" : ""}$${Math.abs(v) / 1000}k`}
            </text>
          ))}
          {[
            [14, "720"],
            [90, "760"],
            [170, "800"],
            [250, "840"],
          ].map(([x, t]) => (
            <text key={t} x={x} y="174" fontSize="8.5" fill="#8a93a1" textAnchor="middle" className="tnum">
              {t}
            </text>
          ))}
        </svg>
        <div className="mt-1 flex items-center gap-2 border-t border-line-subtle px-3 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Check size={11} />
          </span>
          <span className="text-[11px] font-semibold">期权盈亏图</span>
          <span className="ml-auto flex items-center gap-2 text-dim">
            <Calendar size={12} />
            <span className="btn-primary h-6 rounded-md px-2 text-[10px]">
              打开应用
              <ArrowRight size={10} />
            </span>
          </span>
        </div>
        <div className="mx-3 mb-3 mt-1 rounded-lg border border-line bg-white p-2.5">
          <p className="text-[11px] font-semibold">你收到 {money(Math.abs(a.premium))}。</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-muted">
            持有 100 股（约 $77,803）。SPY 在 {LABEL} 高于 $771.72（−0.8%）时盈利。
          </p>
        </div>
      </div>
      <div className="mt-2 text-center text-[10px] text-dim">
        示例价格，非实时报价 · Black-Scholes · IV 12.5%
      </div>
    </div>
  );
}

export function HeroChevron() {
  return <ChevronRight size={12} />;
}
