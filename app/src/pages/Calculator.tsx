import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PayoffChart } from "../components/PayoffChart";
import {
  ArrowsOut,
  Bars,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  More,
  Plus,
  Search,
  Share,
  Star,
  Target,
  TrendDown,
  TrendUp,
  X,
} from "../components/Icons";
import { analyse, type Analysis, type Instrument, type Leg } from "../lib/options";
import { CHIP_GROUPS, OUTLOOK_LABEL, PRESET_BY_KEY, legsFor } from "../lib/presets";
import { pricedLeg, roundStrike } from "../lib/chain";
import { EXPIRIES, TICKERS, ticker as findTicker } from "../data/tickers";
import { money, pct, price } from "../lib/format";

/* --------------------------------------------------------------- topbar */

function TickerPicker({
  symbol,
  onPick,
  onClose,
}: {
  symbol: string;
  onPick: (s: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = TICKERS.filter(
    (t) => t.symbol.toLowerCase().includes(q.toLowerCase()) || t.name.includes(q),
  );
  return (
    <div className="absolute left-2 top-11 z-50 w-[320px] rounded-xl border border-line bg-panel p-2 shadow-pop">
      <div className="flex items-center gap-2 rounded-md border border-line bg-white px-2">
        <Search size={14} className="text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索代码或名称"
          className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
        />
        <button onClick={onClose} aria-label="关闭" className="text-faint hover:text-text">
          <X size={13} />
        </button>
      </div>
      <ul className="mt-1 max-h-[300px] overflow-y-auto">
        {list.map((t) => (
          <li key={t.symbol}>
            <button
              onClick={() => {
                onPick(t.symbol);
                onClose();
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-hover ${
                t.symbol === symbol ? "bg-accent/8" : ""
              }`}
            >
              <span className="w-12 text-[12.5px] font-semibold">{t.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-dim">{t.name}</span>
              <span className="text-[12px] tnum">${t.spot.toFixed(2)}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="px-2 py-4 text-center text-[12px] text-dim">没有匹配的标的</li>}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------------- greeks */

function GreekList({ analysis }: { analysis: Analysis }) {
  const rows: [string, number, (v: number) => string, string][] = [
    ["Delta", analysis.greeks.delta, money, "每 $1 标的变动"],
    ["Gamma", analysis.greeks.gamma, (v) => v.toFixed(3), "Delta 的变化率"],
    ["Theta", analysis.greeks.theta, money, "每天"],
    ["Vega", analysis.greeks.vega, money, "每 1 点 IV"],
    ["Rho", analysis.greeks.rho, money, "每 1% 利率"],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-3">
      {rows.map(([label, value, fmt, hint]) => (
        <div key={label} className="border-b border-line-subtle py-1.5">
          <p className="text-[10.5px] text-dim">{label}</p>
          <p className="text-[12.5px] font-medium tnum">{fmt(value)}</p>
          <p className="text-[9.5px] text-faint">{hint}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- leg editor */

function SideToggle({ side, onChange }: { side: 1 | -1; onChange: (s: 1 | -1) => void }) {
  return (
    <div className="flex rounded-md border border-line bg-surface/70 p-0.5">
      {([1, -1] as const).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium ${
            side === s
              ? s === 1
                ? "bg-white text-profit shadow-sm"
                : "bg-white text-loss shadow-sm"
              : "text-dim"
          }`}
        >
          {s === 1 ? "买入" : "卖出"}
        </button>
      ))}
    </div>
  );
}

function QtyStepper({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-line bg-white">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="flex h-6 w-5 items-center justify-center text-dim hover:text-text"
        aria-label="减少数量"
      >
        <Minus size={10} />
      </button>
      <span className="w-5 text-center text-[11px] tnum">{qty}</span>
      <button
        onClick={() => onChange(Math.min(99, qty + 1))}
        className="flex h-6 w-5 items-center justify-center text-dim hover:text-text"
        aria-label="增加数量"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

function LegRow({
  leg,
  spot,
  step,
  onPatch,
  onRemove,
}: {
  leg: Leg;
  spot: number;
  step: number;
  onPatch: (patch: Partial<Leg>) => void;
  onRemove: () => void;
}) {
  const kindLabel = leg.kind === "call" ? "C" : leg.kind === "put" ? "P" : "股";
  const bump = (dir: 1 | -1) => {
    if (leg.kind === "stock") return;
    const next = roundStrike(leg.strike + dir * step, step);
    onPatch({ strike: Math.max(step, next) });
  };
  return (
    <div className="rounded-lg border border-line bg-panel px-2 py-2">
      <div className="flex items-center gap-1.5">
        <SideToggle side={leg.side} onChange={(s) => onPatch({ side: s })} />
        <QtyStepper qty={leg.qty} onChange={(q) => onPatch({ qty: q })} />
        <div className="flex rounded-md border border-line bg-surface/70 p-0.5">
          {(["call", "put", "stock"] as const).map((k) => (
            <button
              key={k}
              onClick={() => onPatch({ kind: k, strike: k === "stock" ? spot : leg.strike })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                leg.kind === k ? "bg-white text-text shadow-sm" : "text-dim"
              }`}
            >
              {k === "call" ? "看涨" : k === "put" ? "看跌" : "股票"}
            </button>
          ))}
        </div>
        <button onClick={onRemove} aria-label="删除这条腿" className="ml-auto text-faint hover:text-loss">
          <X size={12} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
        {leg.kind === "stock" ? (
          <span className="flex h-6 flex-1 items-center justify-between rounded-md border border-line bg-white px-2 tnum">
            <span className="text-dim">现价</span>
            <span>${spot.toFixed(2)}</span>
          </span>
        ) : (
          <div className="flex h-6 items-center rounded-md border border-line bg-white">
            <button onClick={() => bump(-1)} aria-label="下调行权价" className="flex h-full w-5 items-center justify-center text-dim hover:text-text">
              <ChevronLeft size={10} />
            </button>
            <input
              value={leg.strike}
              onChange={(e) => onPatch({ strike: Number(e.target.value) || 0 })}
              className="w-12 bg-transparent text-center text-[11px] outline-none tnum"
            />
            <button onClick={() => bump(1)} aria-label="上调行权价" className="flex h-full w-5 items-center justify-center text-dim hover:text-text">
              <ChevronRight size={10} />
            </button>
          </div>
        )}
        <span className="flex h-6 flex-1 items-center justify-center rounded-md border border-line bg-surface/50 px-1 text-dim">
          {EXPIRIES.find((e) => e.iso === leg.expiry)?.label ?? leg.expiry}
        </span>
        <span className="flex h-6 w-[52px] items-center justify-end rounded-md border border-line bg-white px-1.5 tnum">
          {price(leg.fill)}
        </span>
        <span className="w-3 text-center text-[9px] font-medium text-faint">{kindLabel}</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- starter */

const STARTERS = [
  { key: "long-call", mood: "上涨", title: "买入看涨", note: "只赔你付出的权利金", icon: TrendUp, tone: "profit" },
  { key: "long-put", mood: "下跌", title: "买入看跌", note: "只赔你付出的权利金", icon: TrendDown, tone: "loss" },
  { key: "iron-condor", mood: "区间内", title: "铁鹰式", note: "收一笔权利金，风险封顶", icon: ArrowsOut, tone: "accent" },
  { key: "covered-call", mood: "持股收租", title: "备兑看涨", note: "再卖一次看涨", icon: Target, tone: "neutral" },
];

function EmptyChart({ symbol, onPick }: { symbol: string; onPick: (key: string) => void }) {
  return (
    <div className="relative flex h-full min-h-[560px] items-center justify-center overflow-hidden">
      <svg viewBox="0 0 700 754" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`h${i}`} x1="18" x2="684" y1={70 + i * 100} y2={70 + i * 100} stroke="#e2e6eb" strokeDasharray="2 5" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={50 + i * 120} x2={50 + i * 120} y1="30" y2="710" stroke="#e2e6eb" strokeOpacity="0.55" />
        ))}
        <path
          d="M 42 700 H 286 C 372 700 434 664 482 522 C 528 386 570 208 640 92 L 660 56"
          fill="none"
          stroke="#c9d0d9"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="relative max-w-[568px] px-4 text-center sm:px-6">
        <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-text">
          你觉得 {symbol} 会怎么走？
        </h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-5 text-muted">
          选一个。我们会搭一笔起步交易，并用大白话解释它。
        </p>
        <div className="mx-auto mt-7 grid max-w-[578px] grid-cols-2 gap-2">
          {STARTERS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => onPick(s.key)}
                className="group flex min-h-[68px] items-center gap-2.5 rounded-lg border border-line bg-panel/95 px-3 py-2 text-left shadow-sm transition-colors hover:border-line-strong hover:bg-white"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    s.tone === "profit"
                      ? "bg-profit/10 text-profit"
                      : s.tone === "loss"
                        ? "bg-loss/10 text-loss"
                        : s.tone === "neutral"
                          ? "bg-neutral/10 text-neutral"
                          : "bg-accent/10 text-accent"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-text">{s.mood}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[12px] leading-snug text-dim">
                    {s.title} · {s.note}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
          <button onClick={() => onPick("iron-condor")} className="underline-offset-2 hover:text-text hover:underline">
            查看全部策略
          </button>
          <span aria-hidden="true" className="text-faint">
            ·
          </span>
          <button onClick={() => onPick("long-straddle")} className="underline-offset-2 hover:text-text hover:underline">
            我懂期权，跳过提示
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- analysis */

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  return (
    <div className="border-b border-line-subtle py-2.5 last:border-0">
      <p className="text-[11.5px] text-dim">{label}</p>
      <p
        className={`mt-0.5 text-[15px] font-semibold tnum ${
          tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "neutral" ? "text-neutral" : "text-text"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10.5px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ preset chips */

function PresetChips({
  expiry,
  expiryOpen,
  onToggleExpiry,
  onPickExpiry,
  presetKey,
  onApply,
}: {
  expiry: (typeof EXPIRIES)[number];
  expiryOpen: boolean;
  onToggleExpiry: () => void;
  onPickExpiry: (iso: string) => void;
  presetKey: string;
  onApply: (key: string) => void;
}) {
  return (
    <>
      <div className="relative">
        <button
          onClick={onToggleExpiry}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-[13px] font-medium"
        >
          <Calendar size={14} className="text-dim" />
          {expiry.label} · {expiry.dte}天
          <ChevronDown size={14} className="text-faint" />
        </button>
        {expiryOpen && (
          <ul className="absolute left-0 top-9 z-40 w-[168px] rounded-lg border border-line bg-panel p-1 shadow-pop">
            {EXPIRIES.map((e) => (
              <li key={e.iso}>
                <button
                  onClick={() => onPickExpiry(e.iso)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[12.5px] hover:bg-hover"
                >
                  <span>{e.label}</span>
                  <span className="text-dim tnum">{e.dte}天</span>
                  {e.iso === expiry.iso && <Check size={12} className="text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-1">
        {CHIP_GROUPS.filter((g) => g.outlook === "bullish" || g.outlook === "bearish").map((g) => (
          <div key={g.outlook} className="flex shrink-0 items-center gap-1.5">
            <span className="px-1 text-[11px] text-dim">{OUTLOOK_LABEL[g.outlook]}</span>
            {g.keys.map((key) => {
              const p = PRESET_BY_KEY[key];
              const selected = presetKey === key;
              return (
                <button
                  key={key}
                  onClick={() => onApply(key)}
                  className={`chip shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    selected
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line bg-panel text-muted hover:border-line-strong hover:text-text"
                  }`}
                >
                  {p?.name ?? key}
                </button>
              );
            })}
          </div>
        ))}
        <span className="shrink-0 px-1 text-[11px] text-dim">中性</span>
        <Link
          to="/strategies"
          className="chip ml-auto flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[12px] font-medium text-muted hover:text-text"
        >
          <ArrowsOut size={13} />
          短线自动Δ · 自动翼
          <ChevronDown size={12} className="text-faint" />
        </Link>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ page */

export default function Calculator() {
  const [params, setParams] = useSearchParams();
  const symbol = (params.get("ticker") ?? "SPY").toUpperCase();
  const t = findTicker(symbol);
  const instrument: Instrument = useMemo(() => ({ ...t, expiries: EXPIRIES }), [t]);
  const expiryIso = params.get("expiry") ?? EXPIRIES[3].iso;
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];
  const presetKey = params.get("preset") ?? "";

  const [legs, setLegs] = useState<Leg[]>(() =>
    presetKey ? legsFor(presetKey, t, expiryIso) : [],
  );
  const [mode, setMode] = useState<"pnl" | "pct">("pnl");
  const [envelope, setEnvelope] = useState(0);
  const [pro, setPro] = useState(false);
  const [picker, setPicker] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"position" | "analysis" | "greeks">("position");

  const analysis = useMemo(
    () => (legs.length ? analyse(legs, instrument, expiry.dte / 365) : null),
    [legs, instrument, expiry.dte],
  );

  const apply = (key: string) => {
    const preset = PRESET_BY_KEY[key];
    if (!preset) return;
    setLegs(preset.build(t, expiry.iso));
    setParams({ ticker: t.symbol, expiry: expiry.iso, preset: key });
  };

  const pickSymbol = (s: string) => {
    const next = findTicker(s);
    setParams({ ticker: next.symbol, expiry: expiry.iso, ...(presetKey ? { preset: presetKey } : {}) });
    if (presetKey) setLegs(legsFor(presetKey, next, expiry.iso));
  };

  const pickExpiry = (iso: string) => {
    setExpiryOpen(false);
    setParams({ ticker: t.symbol, expiry: iso, ...(presetKey ? { preset: presetKey } : {}) });
    if (presetKey) setLegs(legsFor(presetKey, t, iso));
  };

  const patchLeg = (id: string, patch: Partial<Leg>) =>
    setLegs((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLeg = () => {
    const strike = roundStrike(t.spot, t.strikeStep);
    setLegs((ls) => [...ls, pricedLeg(t, "call", 1, 1, strike, expiry.iso)]);
  };

  const reset = () => {
    setLegs([]);
    const next = new URLSearchParams(params);
    next.delete("preset");
    setParams(next);
  };

  return (
    <AppShell title="构建" statusTicker={t.symbol} showMobileBar={false}>
      <div className="relative flex min-h-[calc(100vh-var(--spacing-statusbar))] flex-col">
        <h1 className="sr-only">期权盈亏计算器</h1>
        {/* ticker + actions */}
        <div className="relative flex h-[58px] items-center gap-2 px-3 sm:px-5">
          <button
            onClick={() => setPicker((v) => !v)}
            className="group flex h-10 min-w-0 shrink items-center gap-2 rounded-md px-1 text-left transition-colors hover:bg-hover"
            aria-label={`${t.symbol} ${t.name}，切换标的`}
          >
            <span className="text-[13px] font-semibold tracking-[0.01em]">{t.symbol}</span>
            <span className="hidden min-w-0 truncate text-[13px] text-dim lg:inline">{t.name}</span>
            <span className="ml-2 text-[17px] font-semibold tracking-[-0.02em] tnum lg:text-[20px]">${t.spot.toFixed(2)}</span>
            <span className={`flex items-center gap-0.5 text-[12px] font-medium tnum ${t.change >= 0 ? "text-profit" : "text-loss"}`}>
              <span aria-hidden="true">{t.change >= 0 ? "▲" : "▼"}</span>
              {money(Math.abs(t.change))} ({t.changePct >= 0 ? "+" : "−"}
              {Math.abs(t.changePct * 100).toFixed(2)}%)
            </span>
            <ChevronDown size={14} className="text-faint" />
          </button>
          <button type="button" className="icon-btn h-7 w-7 shrink-0" aria-label="加入自选">
            <Star size={14} />
          </button>
          <div className="ml-auto flex items-center gap-1 text-[11.5px] text-dim">
            <button className="hidden h-7 items-center gap-1.5 rounded-md border border-line bg-panel px-2 tnum sm:flex" title="按 IV 估算的到期一个标准差区间">
              EM ±{money(analysis?.expectedMove ?? t.spot * t.iv * Math.sqrt(expiry.dte / 365))} · {expiry.label}
            </button>
            <button className="hidden h-7 items-center rounded-md border border-line bg-panel px-2 lg:flex" title="隐含波动率在过去一年区间中的排名">
              IVR {t.ivRank}
            </button>
            <span className="hidden h-7 items-center gap-1.5 px-1 lg:flex" title="行情来自上一交易时段">
              <span className="h-1.5 w-1.5 rounded-full bg-dim" />
              已收盘
            </span>
            <button className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted hover:bg-hover hover:text-text sm:flex">
              <Bars size={15} />
              保存
            </button>
            <button className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted hover:bg-hover hover:text-text sm:flex">
              <Share size={15} />
              分享
            </button>
            <button className="icon-btn h-8 w-8" aria-label="更多操作">
              <More size={16} />
            </button>
          </div>
          {picker && <TickerPicker symbol={t.symbol} onPick={pickSymbol} onClose={() => setPicker(false)} />}
        </div>

        {/* context lines (small screens only) */}
        <div className="px-3 pb-2 sm:px-5 lg:hidden">
          <p className="text-[11.5px] leading-relaxed text-dim">
            EM ±{money(analysis?.expectedMove ?? t.spot * t.iv * Math.sqrt(expiry.dte / 365))} · {expiry.label} · 报价 美东 4:14 PM · 参考
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
            选一个预设，或打开期权链来建一笔交易。
          </p>
        </div>

        {/* expiry + presets (wide screens) */}
        <div className="relative hidden h-[46px] items-center gap-2 px-3 sm:px-5 lg:flex">
          <PresetChips
            expiry={expiry}
            expiryOpen={expiryOpen}
            onToggleExpiry={() => setExpiryOpen((v) => !v)}
            onPickExpiry={pickExpiry}
            presetKey={presetKey}
            onApply={apply}
          />
        </div>

        {/* three panes */}
        <div className="min-w-0 flex-1 bg-canvas">
          <div className="grid min-h-[560px] grid-cols-1 gap-2 px-3 py-3 lg:h-[calc(100vh-144px)] lg:grid-cols-[308px_minmax(0,1fr)_328px] lg:px-2 lg:py-2">
            {/* position */}
            <section
              className={`order-4 min-h-[360px] rounded-xl border border-line bg-panel px-3 py-3 lg:order-none lg:min-h-0 lg:block ${
                mobilePane === "position" ? "" : "hidden"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold sm:text-[18px]">持仓</h2>
                <span className="flex items-center gap-1 text-[11px] text-dim">
                  ×{legs.reduce((n, l) => Math.max(n, l.qty), 0) || 1} ·
                  <button onClick={addLeg} className="flex items-center gap-0.5 font-medium text-muted hover:text-accent">
                    <Plus size={11} /> 加腿
                  </button>
                </span>
              </div>
              {legs.length === 0 ? (
                <p className="mt-8 max-w-[240px] text-[13px] leading-5 text-muted">
                  还没有腿。添加后会出现在这里，盈亏图也跟着更新。
                </p>
              ) : (
                <div className="mt-2.5 space-y-1.5">
                  {legs.map((leg) => (
                    <LegRow
                      key={leg.id}
                      leg={leg}
                      spot={t.spot}
                      step={t.strikeStep}
                      onPatch={(patch) => patchLeg(leg.id, patch)}
                      onRemove={() => setLegs((ls) => ls.filter((l) => l.id !== leg.id))}
                    />
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={addLeg} className="btn-secondary h-8 flex-1 justify-center text-[12px]">
                      <Plus size={13} />
                      加一条腿
                    </button>
                    <button onClick={reset} className="btn-ghost h-8 px-2 text-[12px] text-dim">
                      清空
                    </button>
                  </div>
                  <p className="pt-1.5 text-[10.5px] leading-relaxed text-faint">
                    成交价来自合成链：买入按卖价、卖出按买价。点行权价两侧的箭头可调到下一个挂牌合约。
                  </p>
                </div>
              )}
            </section>

            {/* chart */}
            <section className="order-1 min-h-[560px] min-w-0 overflow-hidden rounded-xl border border-line bg-panel lg:order-none lg:min-h-0">
              {legs.length === 0 ? (
                <EmptyChart symbol={t.symbol} onPick={apply} />
              ) : (
                <div className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-3 py-2">
                    <div className="flex rounded-md border border-line bg-surface/60 p-0.5">
                      {(
                        [
                          ["pnl", "盈亏"],
                          ["pct", "百分比"],
                        ] as const
                      ).map(([m, label]) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            mode === m ? "bg-white text-text shadow-sm" : "text-dim"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex rounded-md border border-line bg-surface/60 p-0.5">
                      {[
                        [0, "无"],
                        [1, "1σ"],
                        [2, "2σ"],
                      ].map(([v, label]) => (
                        <button
                          key={String(v)}
                          onClick={() => setEnvelope(Number(v))}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            envelope === v ? "bg-white text-text shadow-sm" : "text-dim"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="ml-auto flex items-center gap-3 text-[11px] text-dim">
                      <span className="flex items-center gap-1">
                        <span className="h-0.5 w-3 rounded bg-accent" /> 今日
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-0.5 w-3 rounded bg-loss" /> 到期
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 px-1 py-1">
                    <PayoffChart
                      legs={legs}
                      spot={t.spot}
                      iv={t.iv}
                      dte={expiry.dte}
                      expiryLabel={expiry.label}
                      mode={mode}
                      envelope={envelope as 0 | 1 | 2}
                      height={690}
                    />
                  </div>
                  {analysis && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line-subtle px-3 py-2 text-[11px] text-dim">
                      <span className="font-medium text-text">SPY · {analysis.isCredit ? "净收入" : "净支出"} {money(Math.abs(analysis.premium))}</span>
                      <span>
                        盈亏平衡 {analysis.breakevens.length ? analysis.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ") : "—"}
                      </span>
                      <span>盈利概率 {pct(analysis.probProfit)}</span>
                      <span className="ml-auto hidden sm:inline">BS 模型 · IV {pct(t.iv, 1)}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* expiry + presets (small screens) */}
            <div className="order-2 relative -mx-1 flex h-[46px] min-w-0 items-center gap-2 overflow-hidden px-1 lg:hidden">
              <PresetChips
                expiry={expiry}
                expiryOpen={expiryOpen}
                onToggleExpiry={() => setExpiryOpen((v) => !v)}
                onPickExpiry={pickExpiry}
                presetKey={presetKey}
                onApply={apply}
              />
            </div>

            {/* mobile pane tabs */}
            <div className="order-3 flex rounded-lg border border-line bg-surface/70 p-0.5 lg:hidden">
              {(
                [
                  ["position", "持仓"],
                  ["analysis", "分析"],
                  ["greeks", "希腊值"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMobilePane(key)}
                  className={`flex-1 rounded-md px-2 py-2 text-[12.5px] font-medium transition-colors ${
                    mobilePane === key ? "bg-panel text-text shadow-sm" : "text-dim"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* analysis */}
            <section
              className={`order-5 min-h-[360px] rounded-xl border border-line bg-panel px-3 py-3 lg:order-none lg:min-h-0 lg:block ${
                mobilePane === "analysis" ? "" : "hidden"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold sm:text-[18px]">分析</h2>
                <div className="seg flex rounded-md border border-line bg-surface/60 p-0.5">
                  {[
                    [false, "简单"],
                    [true, "专业"],
                  ].map(([v, label]) => (
                    <button
                      key={String(v)}
                      onClick={() => setPro(Boolean(v))}
                      className={`rounded px-2 py-1 text-[11.5px] font-medium ${
                        pro === v ? "bg-white text-text shadow-sm" : "text-dim"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {!analysis ? (
                <p className="mt-8 max-w-[280px] text-[13px] leading-5 text-muted">
                  构建一个持仓，看看它怎么付钱、在哪里赚钱，以及概率有多大。
                </p>
              ) : (
                <div className="mt-3">
                  <div className="rounded-lg border border-line bg-surface/40 p-2.5">
                    <p className="text-[12.5px] font-semibold">
                      {analysis.isCredit ? "你收到" : "你付出"} {money(Math.abs(analysis.premium))}。
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{analysis.sentence}</p>
                  </div>
                  <div className="mt-2">
                    <Metric
                      label="最大盈利"
                      value={analysis.maxProfit === null ? "无限" : money(analysis.maxProfit)}
                      tone="profit"
                      hint={analysis.bestCase}
                    />
                    <Metric
                      label="最大亏损"
                      value={analysis.maxLoss === null ? "无限" : money(analysis.maxLoss)}
                      tone="loss"
                      hint={analysis.worstCase}
                    />
                    <Metric label="盈亏平衡" value={analysis.breakevens.length ? analysis.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ") : "—"} />
                    <Metric label="盈利概率" value={pct(analysis.probProfit)} hint="风险中性，按行权价偏斜修正" />
                    <Metric label="预期价值" value={money(analysis.expectedValue, { sign: true })} />
                    <Metric label="风险回报" value={analysis.riskReward} />
                    <Metric label="到期预期波动" value={`±${money(analysis.expectedMove)}`} hint={`±${pct(analysis.expectedMovePct)}`} />
                  </div>
                  {pro && (
                    <div className="mt-2">
                      <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-faint">净希腊值（美元）</p>
                      <GreekList analysis={analysis} />
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* greeks (small screens) */}
            <section
              className={`order-6 min-h-[360px] rounded-xl border border-line bg-panel px-3 py-3 lg:hidden ${
                mobilePane === "greeks" ? "" : "hidden"
              }`}
            >
              <h2 className="text-[13px] font-semibold">希腊值</h2>
              {analysis ? (
                <div className="mt-3">
                  <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-faint">净希腊值（美元）</p>
                  <GreekList analysis={analysis} />
                </div>
              ) : (
                <p className="mt-8 max-w-[280px] text-[13px] leading-5 text-muted">
                  先建一个持仓，希腊值会在这里逐项列出。
                </p>
              )}
            </section>
          </div>
        </div>

        {/* about */}
        <section className="border-t border-line bg-canvas px-4 pb-16 pt-10 sm:px-6">
          <div className="mx-auto max-w-[1024px]">
            <h2 className="text-[15px] font-semibold">关于这个计算器</h2>
            <div className="mt-4 grid gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <h3 className="text-[14px] font-semibold">多腿期权策略建模</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  添加看涨、看跌，或直接持有正股，选择一个到期日，再逐个设定行权价与数量。
                  盈亏图会同时画出今天的理论价值与到期时的结算价值，标出每一段盈亏区间。
                  <span className="lg:hidden">建好以后可以直接保存进持仓，每天打开就能看到它现在值多少。</span>
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold">看懂这些估计值</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  到期前的估值与希腊值基于 Black-Scholes 假设；报价为延迟的上一交易时段数据，
                  不构成投资建议。概率与预期价值按风险中性测度计算，实际结果会不同。
                  <span className="lg:hidden">如果某个数字让你犹豫，先回到盈亏图上看它到底影响哪一段。</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
