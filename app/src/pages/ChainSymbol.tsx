import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ArrowRight, Calendar, Chain as ChainIcon, ChevronDown } from "../components/Icons";
import { buildChain } from "../lib/chain";
import { EXPIRIES, ticker as findTicker } from "../data/tickers";
import { pct } from "../lib/format";

export default function ChainSymbol() {
  const { symbol = "spy" } = useParams();
  const t = findTicker(symbol);
  const [expiryIso, setExpiryIso] = useState(EXPIRIES[3].iso);
  const expiry = EXPIRIES.find((e) => e.iso === expiryIso) ?? EXPIRIES[3];
  const rows = useMemo(() => buildChain(t, expiryIso, 13), [t, expiryIso]);

  return (
    <AppShell title={`${t.symbol} 期权链`} statusTicker={t.symbol}>
      <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-dim">
            <ChainIcon size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[16px] font-semibold tracking-[-0.01em]">
              {t.symbol}
              <span className="ml-2 text-[12px] font-normal text-dim">{t.name}</span>
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-[12px] tnum">
              <span className="font-medium">${t.spot.toFixed(2)}</span>
              <span className={t.change >= 0 ? "text-profit" : "text-loss"}>
                {t.change >= 0 ? "+" : "−"}
                {t.changePct.toFixed(2)}%
              </span>
              <span className="text-dim">IV {pct(t.iv, 1)} · IVR {t.ivRank}</span>
            </p>
          </div>
          <Link
            to={`/calculator?ticker=${t.symbol}&expiry=${expiryIso}`}
            className="btn-primary ml-auto h-9 px-3.5 text-[13px]"
          >
            在构建器中打开
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="no-scrollbar mt-5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="flex items-center gap-1 pr-1 text-[11px] text-dim">
            <Calendar size={13} /> 到期日
          </span>
          {EXPIRIES.map((e) => (
            <button
              key={e.iso}
              onClick={() => setExpiryIso(e.iso)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
                e.iso === expiryIso
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line bg-panel text-muted hover:text-text"
              }`}
            >
              {e.label}
              <span className={`text-[10px] tnum ${e.iso === expiryIso ? "text-accent/70" : "text-faint"}`}>
                {e.dte}天
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line-subtle bg-surface/50 px-3 py-2 text-[11.5px]">
            <span className="font-semibold">看涨期权</span>
            <span className="flex items-center gap-1.5 text-dim">
              行权价按 {t.strikeStep} 递增
              <ChevronDown size={12} />
            </span>
            <span className="font-semibold">看跌期权</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[11.5px] tnum">
              <thead>
                <tr className="border-b border-line-subtle text-[10px] uppercase tracking-wide text-dim">
                  <th className="px-3 py-1.5 text-right font-medium">买价</th>
                  <th className="px-2 py-1.5 text-right font-medium">卖价</th>
                  <th className="px-2 py-1.5 text-right font-medium">成交量</th>
                  <th className="px-2 py-1.5 text-right font-medium">未平仓</th>
                  <th className="px-2 py-1.5 text-right font-medium">IV</th>
                  <th className="px-2 py-1.5 text-right font-medium">Delta</th>
                  <th className="border-x border-line bg-surface/60 px-3 py-1.5 text-center font-semibold">行权价</th>
                  <th className="px-2 py-1.5 text-right font-medium">Delta</th>
                  <th className="px-2 py-1.5 text-right font-medium">IV</th>
                  <th className="px-2 py-1.5 text-right font-medium">未平仓</th>
                  <th className="px-2 py-1.5 text-right font-medium">成交量</th>
                  <th className="px-2 py-1.5 text-right font-medium">卖价</th>
                  <th className="px-3 py-1.5 text-right font-medium">买价</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const atm = Math.abs(row.strike - t.spot) === Math.min(...rows.map((r) => Math.abs(r.strike - t.spot)));
                  return (
                    <tr
                      key={row.strike}
                      className={`border-b border-line-subtle last:border-0 ${atm ? "bg-accent/8" : "hover:bg-hover/60"}`}
                    >
                      <td className={`px-3 py-2 text-right ${atm ? "text-accent" : "text-profit"}`}>{row.call.bid.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-muted">{row.call.ask.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-dim">{row.call.volume.toLocaleString("en-US")}</td>
                      <td className="px-2 py-2 text-right text-dim">{row.call.oi.toLocaleString("en-US")}</td>
                      <td className="px-2 py-2 text-right text-muted">{(row.call.iv * 100).toFixed(1)}%</td>
                      <td className="px-2 py-2 text-right text-muted">{row.call.delta.toFixed(2)}</td>
                      <td
                        className={`border-x border-line px-3 py-2 text-center font-semibold ${
                          atm ? "bg-accent/10 text-accent" : "bg-surface/50 text-text"
                        }`}
                      >
                        {row.strike.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-muted">{row.put.delta.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-muted">{(row.put.iv * 100).toFixed(1)}%</td>
                      <td className="px-2 py-2 text-right text-dim">{row.put.oi.toLocaleString("en-US")}</td>
                      <td className="px-2 py-2 text-right text-dim">{row.put.volume.toLocaleString("en-US")}</td>
                      <td className="px-2 py-2 text-right text-muted">{row.put.ask.toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right ${atm ? "text-accent" : "text-loss"}`}>{row.put.bid.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link to={`/calculator?ticker=${t.symbol}&expiry=${expiryIso}&preset=long-call`} className="btn-secondary h-9 px-3.5 text-[13px]">
            用平值看涨开始
          </Link>
          <Link to={`/tools/option-finder?ticker=${t.symbol}`} className="btn-ghost h-9 px-3 text-[13px] text-muted">
            扫描 {t.symbol} 的价差
          </Link>
          <span className="ml-auto text-[11px] text-faint">
            {expiry.label} · {expiry.dte} 天 · 延迟行情 · 合成报价
          </span>
        </div>
      </div>
    </AppShell>
  );
}
