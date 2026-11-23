import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PayoffChart } from "../components/PayoffChart";
import {
  ArrowsOut,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Target,
  TrendDown,
  TrendUp,
  X,
} from "../components/Icons";
import { Workspace } from "../desktop/Split";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { decodeDraft } from "../lib/draft";
import { eventLabel, eventsUntil, useEvents } from "../lib/events";
import { analyse, type Analysis, type Instrument, type Leg } from "../lib/options";
import { CHIP_GROUPS, OUTLOOK_LABEL, PRESET_BY_KEY, legsFor } from "../lib/presets";
import { pricedLeg, quote, roundStrike } from "../lib/chain";
import { useLiveChain } from "../lib/useLiveChain";
import { EXPIRIES, TICKERS, ticker as findTicker, type Expiry } from "../data/tickers";
import { money, pct, price } from "../lib/format";
import { saveTrade } from "../lib/store";

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
  const query = q.trim();
  const custom =
    /^[A-Za-z][A-Za-z.]{0,5}$/.test(query) &&
    !TICKERS.some((t) => t.symbol.toLowerCase() === query.toLowerCase())
      ? query.toUpperCase()
      : "";
  return (
    <Card className="absolute left-2 top-[50px] z-50 w-[320px] gap-0 p-1.5 shadow-lg">
      <div className="relative">
        <Input
          autoFocus
          size="sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索代码或名称"
          className="[&_input]:pr-8"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-0.5 top-1/2 -translate-y-1/2"
        >
          <X size={12} />
        </Button>
      </div>
      <ul className="mt-1 max-h-[290px] overflow-y-auto">
        {list.map((t) => (
          <li key={t.symbol}>
            <button
              onClick={() => {
                onPick(t.symbol);
                onClose();
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent ${
                t.symbol === symbol ? "bg-brand/10" : ""
              }`}
            >
              <span className="w-11 text-[13px] font-semibold">{t.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{t.name}</span>
              <span className="text-[12px] tnum">${t.spot.toFixed(2)}</span>
            </button>
          </li>
        ))}
        {custom && (
          <li>
            <button
              onClick={() => {
                onPick(custom);
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
            >
              <span className="w-11 text-[13px] font-semibold">{custom}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
                在线查询 · CBOE 延迟行情
              </span>
            </button>
          </li>
        )}
        {list.length === 0 && !custom && (
          <li className="px-2 py-4 text-center text-[12px] text-muted-foreground">没有匹配的标的</li>
        )}
      </ul>
    </Card>
  );
}

/* ----------------------------------------------------------------- greeks */

function GreekList({ analysis }: { analysis: Analysis }) {
  const rows: [string, number, (v: number) => string, string][] = [
    ["Delta", analysis.greeks.delta, money, "每 $1 标的变动"],
    ["Gamma", analysis.greeks.gamma, (v) => v.toFixed(2), "Delta 的变化率"],
    ["Theta", analysis.greeks.theta, money, "每天"],
    ["Vega", analysis.greeks.vega, money, "每 1 点 IV"],
    ["Rho", analysis.greeks.rho, money, "每 1% 利率"],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-3">
      {rows.map(([label, value, fmt, hint]) => (
        <div key={label} className="border-b border-border/60 py-1.5">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-[13px] font-medium tnum">{fmt(value)}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- leg editor */

function SideToggle({ side, onChange }: { side: 1 | -1; onChange: (s: 1 | -1) => void }) {
  return (
    <ToggleGroup
      size="sm"
      value={[side === 1 ? "buy" : "sell"]}
      onValueChange={(value) => {
        const next = value[0];
        if (next) onChange(next === "buy" ? 1 : -1);
      }}
    >
      <ToggleGroupItem
        value="buy"
        className="h-6 min-w-0 px-1.5 text-[11px] data-pressed:text-profit sm:h-6"
      >
        买入
      </ToggleGroupItem>
      <ToggleGroupItem
        value="sell"
        className="h-6 min-w-0 px-1.5 text-[11px] data-pressed:text-loss sm:h-6"
      >
        卖出
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function QtyStepper({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  return (
    <div className="flex items-center rounded border border-border bg-card">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="flex h-[22px] w-5 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="减少数量"
      >
        <Minus size={9} />
      </button>
      <span className="w-4 text-center text-[11px] tnum">{qty}</span>
      <button
        onClick={() => onChange(Math.min(99, qty + 1))}
        className="flex h-[22px] w-5 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="增加数量"
      >
        <Plus size={9} />
      </button>
    </div>
  );
}

function LegRow({
  leg,
  spot,
  step,
  expiryLabel,
  onPatch,
  onRemove,
}: {
  leg: Leg;
  spot: number;
  step: number;
  expiryLabel: string;
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
    <div className="rounded-lg border border-border bg-card px-2 py-1.5">
      <div className="flex items-center gap-1">
        <SideToggle side={leg.side} onChange={(s) => onPatch({ side: s })} />
        <QtyStepper qty={leg.qty} onChange={(q) => onPatch({ qty: q })} />
        <ToggleGroup
          size="sm"
          value={[leg.kind]}
          onValueChange={(value) => {
            const next = value[0];
            if (!next) return;
            onPatch({
              kind: next as Leg["kind"],
              strike: next === "stock" ? spot : leg.strike,
            });
          }}
        >
          {(["call", "put", "stock"] as const).map((k) => (
            <ToggleGroupItem
              key={k}
              value={k}
              className="h-6 min-w-0 px-1.5 text-[11px] sm:h-6"
            >
              {k === "call" ? "看涨" : k === "put" ? "看跌" : "股票"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label="删除这条腿"
          className="ml-auto hover:text-loss"
        >
          <X size={12} />
        </Button>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
        {leg.kind === "stock" ? (
          <span className="flex h-6 flex-1 items-center justify-between rounded border border-border bg-card px-1.5 tnum">
            <span className="text-muted-foreground">现价</span>
            <span>${spot.toFixed(2)}</span>
          </span>
        ) : (
          <div className="flex h-6 items-center rounded border border-border bg-card">
            <button
              onClick={() => bump(-1)}
              aria-label="下调行权价"
              className="flex h-full w-5 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={9} />
            </button>
            <input
              value={leg.strike}
              onChange={(e) => onPatch({ strike: Number(e.target.value) || 0 })}
              className="w-11 bg-transparent text-center text-[11px] outline-none tnum"
            />
            <button
              onClick={() => bump(1)}
              aria-label="上调行权价"
              className="flex h-full w-5 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={9} />
            </button>
          </div>
        )}
        <span className="flex h-6 flex-1 items-center justify-center rounded border border-border bg-muted px-1 text-[11px] text-muted-foreground">
          {expiryLabel}
        </span>
        <span className="flex h-6 w-[46px] items-center justify-end rounded border border-border bg-card px-1 tnum">
          {price(leg.fill)}
        </span>
        <span className="w-3 text-center text-[11px] font-medium text-muted-foreground">{kindLabel}</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- starter */

const STARTERS = [
  { key: "long-call", mood: "上涨", title: "买入看涨", icon: TrendUp, tone: "profit" },
  { key: "long-put", mood: "下跌", title: "买入看跌", icon: TrendDown, tone: "loss" },
  { key: "iron-condor", mood: "区间内", title: "铁鹰式", icon: ArrowsOut, tone: "accent" },
  { key: "covered-call", mood: "持股收租", title: "备兑看涨", icon: Target, tone: "neutral" },
];

function EmptyChart({ symbol, onPick }: { symbol: string; onPick: (key: string) => void }) {
  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 700 600"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`h${i}`}
            x1="18"
            x2="684"
            y1={60 + i * 92}
            y2={60 + i * 92}
            stroke="#f0f0f0"
            strokeDasharray="2 5"
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`v${i}`}
            x1={50 + i * 120}
            x2={50 + i * 120}
            y1="30"
            y2="566"
            stroke="#f1eee9"
          />
        ))}
        <path
          d="M 42 558 H 286 C 372 558 434 528 482 420 C 528 312 570 170 640 80 L 660 52"
          fill="none"
          stroke="#d5d0c8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="relative max-w-[470px] px-5 text-center">
        <h2 className="text-[16px] font-semibold text-foreground">
          你觉得 {symbol} 会怎么走？
        </h2>
        <p className="mx-auto mt-1 max-w-[360px] text-[12px] leading-4 text-muted-foreground">
          选一个观点，我们会搭一笔起步交易，盈亏图立刻画出来。
        </p>
        <div className="mx-auto mt-4 grid max-w-[430px] grid-cols-2 gap-1.5">
          {STARTERS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => onPick(s.key)}
                className="group flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-input"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted ${
                    s.tone === "profit"
                      ? "text-profit"
                      : s.tone === "loss"
                        ? "text-loss"
                        : "text-muted-foreground"
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground">{s.mood}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.title}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Link to="/strategies" className="hover:text-brand">
            查看全部策略
          </Link>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => onPick("long-straddle")} className="hover:text-brand">
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
  tone?: "profit" | "loss";
}) {
  return (
    <div className="border-b border-border/60 py-2 last:border-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-[14px] font-semibold tnum ${
          tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ preset chips */

function PresetChips({
  expiry,
  expiries,
  onPickExpiry,
  presetKey,
  onApply,
}: {
  expiry: Expiry;
  expiries: Expiry[];
  onPickExpiry: (iso: string) => void;
  presetKey: string;
  onApply: (key: string) => void;
}) {
  return (
    <>
      <Select
        value={expiry.iso}
        items={expiries.map((e) => ({
          value: e.iso,
          label: `${e.label} · ${e.dte}天`,
        }))}
        onValueChange={(value) => {
          if (value) onPickExpiry(String(value));
        }}
      >
        <SelectTrigger size="sm" className="w-[178px] shrink-0">
          <Calendar size={11} className="opacity-70" />
          <SelectValue />
        </SelectTrigger>
        <SelectPopup alignItemWithTrigger={false}>
          {expiries.map((e) => (
            <SelectItem key={e.iso} value={e.iso}>
              <span className="flex w-full items-center justify-between gap-4">
                <span>{e.label}</span>
                <span className="tnum text-xs text-muted-foreground">{e.dte}天</span>
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>

      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {CHIP_GROUPS.filter((g) => g.outlook === "bullish" || g.outlook === "bearish").map((g) => (
          <div key={g.outlook} className="flex shrink-0 items-center gap-1">
            <span className="px-0.5 text-[11px] text-muted-foreground">{OUTLOOK_LABEL[g.outlook]}</span>
            {g.keys.map((key) => {
              const p = PRESET_BY_KEY[key];
              return (
                <Toggle
                  key={key}
                  size="sm"
                  variant="outline"
                  pressed={presetKey === key}
                  onPressedChange={() => onApply(key)}
                  className="h-7 shrink-0 px-2 text-[13px] data-pressed:border-brand-line data-pressed:bg-brand-soft data-pressed:text-brand"
                >
                  {p?.name ?? key}
                </Toggle>
              );
            })}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 shrink-0 gap-1 text-muted-foreground"
          render={<Link to="/strategies" />}
        >
          全部策略
          <ChevronRight size={11} />
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ page */

export default function Calculator() {
  const [params, setParams] = useSearchParams();
  const symbol = (params.get("ticker") ?? "SPY").toUpperCase();
  const t = useMemo(() => findTicker(symbol), [symbol]);
  const live = useLiveChain(t.symbol);
  const chain = live.chain;
  const market = useMemo(
    () =>
      chain
        ? {
            ...t,
            spot: chain.spot || t.spot,
            change: chain.change,
            changePct: chain.changePct,
            iv: chain.iv30 || t.iv,
          }
        : t,
    [t, chain],
  );
  const expiries = chain?.expiries ?? EXPIRIES;
  const fallbackExpiry = useMemo(
    () =>
      expiries.reduce(
        (best, e) => (Math.abs(e.dte - 27) < Math.abs(best.dte - 27) ? e : best),
        expiries[0],
      ),
    [expiries],
  );
  const expiry = expiries.find((e) => e.iso === params.get("expiry")) ?? fallbackExpiry;
  const events = useEvents();
  const expiryEvents = eventsUntil(events, t.symbol, expiry.iso);
  const presetKey = params.get("preset") ?? "";
  const encodedDraft = params.get("legs");
  const draft = useMemo(() => decodeDraft(encodedDraft), [encodedDraft]);
  const [pristine, setPristine] = useState(true);

  const [legs, setLegs] = useState<Leg[]>(() =>
    draft?.legs ?? (presetKey ? legsFor(presetKey, market, expiry.iso) : []),
  );
  const instrument: Instrument = useMemo(() => ({ ...market, expiries }), [market, expiries]);
  const [mode, setMode] = useState<"pnl" | "pct">("pnl");
  const [envelope, setEnvelope] = useState(0);
  const [pro, setPro] = useState(false);
  const [picker, setPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  const analysis = useMemo(
    () => (legs.length ? analyse(legs, instrument, expiry.dte / 365) : null),
    [legs, instrument, expiry.dte],
  );

  const liveStamp = useRef("");
  useEffect(() => {
    if (!chain || !presetKey || !pristine) return;
    const stamp = `${chain.symbol}:${expiry.iso}:${chain.asOf}`;
    if (liveStamp.current === stamp) return;
    liveStamp.current = stamp;
    setLegs(legsFor(presetKey, market, expiry.iso));
  }, [chain, presetKey, pristine, market, expiry.iso]);

  // A scanner result arrives as encoded legs; keep the builder in sync when
  // the URL changes without a full page reload.
  useEffect(() => {
    if (!encodedDraft) return;
    const next = decodeDraft(encodedDraft);
    if (!next) return;
    setPristine(false);
    setLegs(next.legs);
  }, [encodedDraft]);

  const apply = (key: string) => {
    const preset = PRESET_BY_KEY[key];
    if (!preset) return;
    setPristine(true);
    setLegs(preset.build(market, expiry.iso));
    setParams({ ticker: t.symbol, expiry: expiry.iso, preset: key });
  };

  const pickSymbol = (s: string) => {
    const next = findTicker(s);
    setParams({
      ticker: next.symbol,
      expiry: expiry.iso,
      ...(presetKey ? { preset: presetKey } : {}),
    });
    if (presetKey) {
      setPristine(true);
      setLegs(legsFor(presetKey, next, expiry.iso));
    } else if (encodedDraft) {
      setPristine(false);
      setLegs([]);
    }
  };

  const pickExpiry = (iso: string) => {
    setParams({ ticker: t.symbol, expiry: iso, ...(presetKey ? { preset: presetKey } : {}) });
    if (presetKey) {
      setPristine(true);
      setLegs(legsFor(presetKey, market, iso));
    } else if (encodedDraft) {
      setPristine(false);
      setLegs([]);
    }
  };

  const patchLeg = (id: string, patch: Partial<Leg>) => {
    setPristine(false);
    setLegs((ls) =>
      ls.map((leg) => {
        if (leg.id !== id) return leg;
        const next = { ...leg, ...patch };
        if (next.kind === "stock") {
          next.strike = market.spot;
          next.fill = market.spot;
          delete next.iv;
          return next;
        }
        if (patch.strike === undefined && patch.kind === undefined) return next;
        if (!(next.strike > 0)) return next;
        const legExpiry = expiries.find((item) => item.iso === next.expiry) ?? expiry;
        const nextQuote = quote(market, next.kind, next.strike, legExpiry.dte, next.expiry);
        next.iv = nextQuote.iv;
        next.fill = Number(
          Math.max(0.01, next.side === 1 ? nextQuote.ask : nextQuote.bid).toFixed(2),
        );
        return next;
      }),
    );
  };

  const addLeg = () => {
    setPristine(false);
    const strike = roundStrike(market.spot, t.strikeStep);
    setLegs((ls) => [...ls, pricedLeg(market, "call", 1, 1, strike, expiry.iso)]);
  };

  const reset = () => {
    setPristine(true);
    setLegs([]);
    setSaved(false);
    const next = new URLSearchParams(params);
    next.delete("preset");
    next.delete("legs");
    setParams(next);
  };

  const save = () => {
    if (!legs.length) return;
    saveTrade({
      name: draft?.name ?? PRESET_BY_KEY[presetKey]?.name ?? "自定义策略",
      symbol: t.symbol,
      expiry: expiry.iso,
      legs,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Workspace>
      <div className="relative flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <button
          onClick={() => setPicker((v) => !v)}
          className="group flex h-8 min-w-0 shrink items-center gap-1.5 rounded-lg px-1 text-left transition-colors hover:bg-accent"
          aria-label={`${t.symbol} ${t.name}，切换标的`}
        >
          <span className="text-[14px] font-semibold">{t.symbol}</span>
          <span className="hidden min-w-0 truncate text-[12px] text-muted-foreground lg:inline">{t.name}</span>
          <span className="ml-1.5 text-[18px] font-semibold tnum">
            ${market.spot.toFixed(2)}
          </span>
          <span
            className={`flex items-center gap-0.5 text-[12px] font-medium tnum ${
              market.change >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            <span aria-hidden="true">{market.change >= 0 ? "▲" : "▼"}</span>
            {money(Math.abs(market.change))} ({market.changePct >= 0 ? "+" : "−"}
            {Math.abs(market.changePct * 100).toFixed(2)}%)
          </span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="hidden h-6 items-center rounded border border-border bg-muted/40 px-2 text-[11px] text-muted-foreground tnum xl:flex"
            title="按 IV 估算的到期一个标准差区间"
          >
            EM ±{money(analysis?.expectedMove ?? market.spot * market.iv * Math.sqrt(expiry.dte / 365))}
          </span>
          <span
            className="hidden h-6 items-center rounded border border-border bg-muted/40 px-2 text-[11px] text-muted-foreground tnum 2xl:flex"
            title={chain ? "CBOE 30 天隐含波动率" : "隐含波动率在过去一年区间中的排名"}
          >
            {chain ? `IV30 ${pct(chain.iv30, 1)}` : `IVR ${t.ivRank}`}
          </span>
          <span className="hidden h-6 items-center gap-1.5 px-1 text-[11px] text-muted-foreground lg:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${chain ? "bg-profit" : "bg-muted-foreground"}`}
            />
            {chain ? "在线 · 延迟" : "已收盘"}
          </span>
          <Button
            size="sm"
            onClick={save}
            disabled={!legs.length}
          >
            {saved ? <Check size={12} /> : <Bookmark size={12} />}
            {saved ? "已保存" : "保存策略"}
          </Button>
        </div>

        {picker && (
          <TickerPicker symbol={t.symbol} onPick={pickSymbol} onClose={() => setPicker(false)} />
        )}
      </div>

      <div className="relative z-30 flex h-[38px] shrink-0 items-center gap-1.5 border-b border-border bg-background px-3">
        <PresetChips
          expiry={expiry}
          expiries={expiries}
          onPickExpiry={pickExpiry}
          presetKey={presetKey}
          onApply={apply}
        />
      </div>

      {expiryEvents.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border bg-muted/40 px-3 py-1 text-[11px]">
          <span className="font-medium text-loss">事件提醒</span>
          <span className="text-muted-foreground">
            {expiry.label} 到期跨过 {expiryEvents.map(eventLabel).join("、")}；
            持有跨事件头寸要单独考虑 IV crush。
          </span>
          <Link to="/events" className="ml-auto text-brand hover:underline">
            事件日历
          </Link>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[290px_minmax(0,1fr)_300px] gap-2 p-2">
        <Card className="min-h-0 gap-0 overflow-hidden">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
            <h2 className="text-[13px] font-semibold">持仓</h2>
            <span className="text-[11px] text-muted-foreground tnum">
              {legs.length} 条腿 · ×{legs.reduce((n, l) => Math.max(n, l.qty), 0) || 1}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={addLeg}
              className="ml-auto gap-0.5 text-muted-foreground"
            >
              <Plus size={11} /> 加腿
            </Button>
          </div>

          <div className="scroll-pane flex-1 p-2">
            {legs.length === 0 ? (
              <div className="px-2 py-6">
                <p className="text-[12px] leading-4 text-muted-foreground">
                  还没有腿。添加后会出现在这里，盈亏图也跟着更新。
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={addLeg}>
                  <Plus size={12} />
                  加一条腿
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {legs.map((leg) => (
                  <LegRow
                    key={leg.id}
                    leg={leg}
                    spot={market.spot}
                    step={t.strikeStep}
                    expiryLabel={expiries.find((e) => e.iso === leg.expiry)?.label ?? leg.expiry}
                    onPatch={(patch) => patchLeg(leg.id, patch)}
                    onRemove={() => setLegs((ls) => ls.filter((l) => l.id !== leg.id))}
                  />
                ))}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={addLeg}
                  >
                    <Plus size={12} />
                    加一条腿
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-muted-foreground"
                  >
                    清空
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-3 border-t border-border/60 pt-2 text-[11px] leading-4 text-muted-foreground">
              {chain
                ? "成交价来自 CBOE 延迟行情：买入按卖价、卖出按买价。箭头会把行权价调到下一个挂牌合约。"
                : "成交价来自合成链：买入按卖价、卖出按买价。箭头会把行权价调到下一个挂牌合约。"}
            </p>
          </div>
        </Card>

        <Card className="min-h-0 min-w-0 gap-0 overflow-hidden">
          {legs.length === 0 ? (
            <EmptyChart symbol={t.symbol} onPick={apply} />
          ) : (
            <>
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2.5">
                <ToggleGroup
                  size="sm"
                  value={[mode]}
                  onValueChange={(value) => {
                    const next = value[0];
                    if (next === "pnl" || next === "pct") setMode(next);
                  }}
                >
                  <ToggleGroupItem value="pnl" className="h-6 min-w-0 px-1.5 text-[11px] sm:h-6">
                    盈亏
                  </ToggleGroupItem>
                  <ToggleGroupItem value="pct" className="h-6 min-w-0 px-1.5 text-[11px] sm:h-6">
                    百分比
                  </ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  size="sm"
                  value={[String(envelope)]}
                  onValueChange={(value) => {
                    const next = Number(value[0]);
                    if (next === 0 || next === 1 || next === 2) setEnvelope(next);
                  }}
                >
                  {[
                    ["0", "无"],
                    ["1", "1σ"],
                    ["2", "2σ"],
                  ].map(([v, label]) => (
                    <ToggleGroupItem
                      key={v}
                      value={v}
                      className="h-6 min-w-0 px-1.5 text-[11px] sm:h-6"
                    >
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <span className="ml-auto flex items-center gap-2.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-0.5 w-3 rounded bg-brand" /> 今日
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-0.5 w-3 rounded bg-loss" /> 到期
                  </span>
                </span>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden px-1 py-1">
                <PayoffChart
                  legs={legs}
                  spot={market.spot}
                  iv={market.iv}
                  dte={expiry.dte}
                  expiryLabel={expiry.label}
                  mode={mode}
                  envelope={envelope as 0 | 1 | 2}
                  height={500}
                />
              </div>
              {analysis && (
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t.symbol} · {analysis.isCredit ? "净收入" : "净支出"}{" "}
                    {money(Math.abs(analysis.premium))}
                  </span>
                  <span>
                    盈亏平衡{" "}
                    {analysis.breakevens.length
                      ? analysis.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ")
                      : "—"}
                  </span>
                  <span>盈利概率 {pct(analysis.probProfit)}</span>
                  <span className="ml-auto hidden xl:inline">
                    BS 模型 ·{" "}
                    {legs.some((leg) => leg.kind !== "stock" && leg.iv)
                      ? "逐腿 IV"
                      : `IV ${pct(market.iv, 1)}`}{" "}
                    · {expiry.label}
                  </span>
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="min-h-0 gap-0 overflow-hidden">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
            <h2 className="text-[13px] font-semibold">分析</h2>
            <ToggleGroup
              size="sm"
              value={[pro ? "pro" : "simple"]}
              onValueChange={(value) => {
                const next = value[0];
                if (next) setPro(next === "pro");
              }}
              className="ml-auto"
            >
              <ToggleGroupItem
                value="simple"
                className="h-6 min-w-0 px-1.5 text-[11px] sm:h-6"
              >
                简单
              </ToggleGroupItem>
              <ToggleGroupItem value="pro" className="h-6 min-w-0 px-1.5 text-[11px] sm:h-6">
                专业
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="scroll-pane flex-1 p-2.5">
            {!analysis ? (
              <p className="py-4 text-[12px] leading-4 text-muted-foreground">
                构建一个持仓，看看它怎么付钱、在哪里赚钱，以及概率有多大。
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-2">
                  <p className="text-[12px] font-semibold">
                    {analysis.isCredit ? "你收到" : "你付出"} {money(Math.abs(analysis.premium))}。
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{analysis.sentence}</p>
                </div>
                <div className="mt-1">
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
                  <Metric
                    label="盈亏平衡"
                    value={
                      analysis.breakevens.length
                        ? analysis.breakevens.map((b) => `$${b.toFixed(2)}`).join(" · ")
                        : "—"
                    }
                  />
                  <Metric
                    label="盈利概率"
                    value={pct(analysis.probProfit)}
                    hint="风险中性，含偏斜修正"
                  />
                  <Metric label="预期价值" value={money(analysis.expectedValue, { sign: true })} />
                  <Metric label="风险回报" value={analysis.riskReward} />
                  <Metric
                    label="到期预期波动"
                    value={`±${money(analysis.expectedMove)}`}
                    hint={`±${pct(analysis.expectedMovePct)}`}
                  />
                </div>
                {pro && (
                  <div className="mt-2">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      净希腊值（美元）
                    </p>
                    <GreekList analysis={analysis} />
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </Workspace>
  );
}
