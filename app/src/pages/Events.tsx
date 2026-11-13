import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Trash } from "../components/Icons";
import { PaneHeader, Workspace } from "../desktop/Split";
import {
  addEvent,
  deleteEvent,
  daysToEvent,
  EVENT_KIND_LABEL,
  eventLabel,
  lastEarningsSync,
  syncEarnings,
  todayIso,
  useEvents,
  type EarningsSyncResult,
  type EarningsSyncState,
  type EventKind,
} from "../lib/events";
import { hasOpenLegs, useTrades } from "../lib/store";
import { useWatchlist } from "../lib/watchlist";

const KINDS: EventKind[] = ["earnings", "macro", "dividend", "other"];

export default function Events() {
  const events = useEvents();
  const trades = useTrades();
  const watchlist = useWatchlist();
  const today = todayIso();
  const [symbol, setSymbol] = useState("");
  const [iso, setIso] = useState(today);
  const [kind, setKind] = useState<EventKind>("earnings");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [syncState, setSyncState] = useState<EarningsSyncState | null>(() => lastEarningsSync());
  const [syncResult, setSyncResult] = useState<EarningsSyncResult | null>(null);
  const [syncError, setSyncError] = useState("");
  const busy = useRef(false);
  const autoRan = useRef(false);

  const targets = useMemo(() => {
    const held = trades.filter(hasOpenLegs).map((trade) => trade.symbol);
    const watched = watchlist.flatMap((group) => group.symbols);
    return [...new Set([...held, ...watched])].slice(0, 24);
  }, [trades, watchlist]);

  const runSync = useCallback(async () => {
    if (busy.current || targets.length === 0) return;
    busy.current = true;
    setSyncing(true);
    setProgress({ done: 0, total: 0 });
    setSyncError("");
    try {
      const result = await syncEarnings(targets, (done, total) =>
        setProgress({ done, total }),
      );
      setSyncResult(result);
      setSyncState(lastEarningsSync());
    } catch (reason) {
      setSyncError(
        reason instanceof Error ? reason.message : "同步失败，检查网络后重试。",
      );
    } finally {
      busy.current = false;
      setSyncing(false);
      setProgress(null);
    }
  }, [targets]);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (targets.length === 0) return;
    const last = lastEarningsSync();
    const lastTime = last ? new Date(last.at).getTime() : Number.NaN;
    const stale =
      !last ||
      !Number.isFinite(lastTime) ||
      Date.now() - lastTime > 24 * 60 * 60 * 1000;
    if (stale) void runSync();
  }, [runSync, targets.length]);

  const syncTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
  };

  const upcoming = useMemo(
    () => events.filter((event) => event.iso >= today),
    [events, today],
  );
  const pastCount = events.length - upcoming.length;

  const affected = (eventSymbol: string, eventIso: string) =>
    trades.filter(
      (trade) =>
        trade.legs.some((leg) => leg.qty > 0) &&
        (eventSymbol === "ALL" || trade.symbol === eventSymbol) &&
        trade.expiry >= eventIso,
    ).length;

  const submit = () => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) {
      setError("先填一个标的代码；宏观事件可以填 ALL。");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setError("日期格式不正确。");
      return;
    }
    const created = addEvent({ symbol: clean, iso, kind, note });
    if (!created) {
      setError("没能保存，检查一下标的与日期。");
      return;
    }
    setError("");
    setNote("");
  };

  return (
    <Workspace>
      <PaneHeader
        title="事件日历"
        subtitle={`${upcoming.length} 个未来事件 · 财报、宏观与分红 · 只保存在本机`}
      >
        <Link to="/calculator" className="btn-secondary h-7 px-2.5">
          打开构建器
          <ArrowRight size={12} />
        </Link>
      </PaneHeader>

      <div className="scroll-pane flex-1">
        <div className="mx-auto w-full max-w-[980px] px-7 py-5">
          <section className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold">自动同步财报日</h2>
                <p className="mt-1 max-w-[660px] text-[11px] leading-4 text-faint">
                  从纳斯达克公开日历获取未来 60 天的已确认财报日，只保留持仓与自选标的。
                  手工条目不会被覆盖；删掉的财报条目在下次同步时也不会重新出现。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runSync()}
                disabled={syncing || targets.length === 0}
                className="btn-secondary h-7 shrink-0 px-3 disabled:opacity-40"
              >
                {syncing
                  ? progress && progress.total > 0
                    ? `同步中 ${progress.done}/${progress.total}`
                    : "同步中…"
                  : "立即同步"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
              <span>标的 {targets.length} 个（持仓 + 自选，最多 24 个）</span>
              {syncState && <span>上次同步 {syncTime(syncState.at)}</span>}
              {syncState && !syncState.complete && (
                <span className="text-loss">上次同步不完整</span>
              )}
              {syncResult && (
                <span>
                  更新 {syncResult.updated} 个 · 未找到 {syncResult.missing.length} 个
                  {(syncResult.dismissed?.length ?? 0) > 0
                    ? ` · 已忽略 ${syncResult.dismissed?.length ?? 0} 个`
                    : ""}
                  {syncResult.failed > 0 ? ` · ${syncResult.failed} 天获取失败` : ""}
                </span>
              )}
            </div>
            {syncResult && syncResult.missing.length > 0 && (
              <p className="mt-1 text-[11px] leading-4 text-faint">
                未找到：{syncResult.missing.slice(0, 10).join("、")}
                {syncResult.missing.length > 10 ? "…" : ""}
                。ETF 或不发布财报的标的会出现在这里。
              </p>
            )}
            {syncError && <p className="mt-1 text-[11px] text-loss">{syncError}</p>}
            {targets.length === 0 && (
              <p className="mt-1 text-[11px] text-faint">
                先在自选或持仓里添加标的，才能自动同步。
              </p>
            )}
          </section>

          <section className="mt-3 rounded-xl border border-line bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold">添加事件</h2>
              <span className="text-[11px] text-faint">可手工补充宏观、分红或日历未收录的事件</span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-[11px] text-dim">标的</span>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  placeholder="NVDA"
                  aria-label="事件标的"
                  className="mt-0.5 block h-7 w-24 rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-dim">日期</span>
                <input
                  type="date"
                  value={iso}
                  min={today}
                  onChange={(event) => setIso(event.target.value)}
                  aria-label="事件日期"
                  className="mt-0.5 block h-7 rounded border border-line bg-white px-2 text-[12px] tnum outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-dim">类型</span>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as EventKind)}
                  aria-label="事件类型"
                  className="mt-0.5 block h-7 rounded border border-line bg-white px-1.5 text-[12px] outline-none focus:border-accent"
                >
                  {KINDS.map((value) => (
                    <option key={value} value={value}>
                      {EVENT_KIND_LABEL[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[180px] flex-1">
                <span className="text-[11px] text-dim">备注（可选）</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="盘后 / 预计波动 ±8%"
                  aria-label="事件备注"
                  className="mt-0.5 block h-7 w-full rounded border border-line bg-white px-2 text-[12px] outline-none focus:border-accent"
                />
              </label>
              <button type="button" onClick={submit} className="btn-primary h-7 px-3">
                添加
              </button>
            </div>
            {error && <p className="mt-2 text-[11px] text-loss">{error}</p>}
            <p className="mt-2.5 text-[11px] leading-4 text-faint">
              标的一栏填 <b className="font-medium text-dim">ALL</b> 可添加影响全市场的事件（如 FOMC、CPI）。
              构建器、持仓和情景分析都会读取这里的数据：到期日跨过事件时会提示，情景分析提供
              “财报后 IV −30%”预设。
            </p>
          </section>

          <section className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
              <h2 className="text-[13px] font-semibold">未来事件</h2>
              {pastCount > 0 && (
                <span className="text-[11px] text-faint">
                  另有 {pastCount} 个已过去的事件
                </span>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-[#fbfaf8] text-faint">
                  <Calendar size={16} />
                </span>
                <p className="mt-3 text-[12px] text-dim">还没有未来事件</p>
                <p className="mt-1 text-[11px] leading-4 text-faint">
                  先在上方添加一个财报日，跨事件的到期日会在构建器里标出来。
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[92px_64px_minmax(0,1fr)_72px_minmax(0,1.3fr)_80px_36px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[11px] font-medium text-faint">
                  <span>日期</span>
                  <span className="text-right">剩余</span>
                  <span>标的</span>
                  <span>类型</span>
                  <span>备注</span>
                  <span className="text-right">影响持仓</span>
                  <span />
                </div>
                {upcoming.map((event) => {
                  const days = daysToEvent(event);
                  const count = affected(event.symbol, event.iso);
                  return (
                    <div
                      key={event.id}
                      className="grid grid-cols-[92px_64px_minmax(0,1fr)_72px_minmax(0,1.3fr)_80px_36px] items-center gap-2 border-b border-line-subtle px-4 py-2 text-[12px] last:border-0"
                    >
                      <span className="tnum text-muted">{event.iso}</span>
                      <span
                        className={`text-right tnum ${
                          days <= 7 ? "font-medium text-loss" : "text-dim"
                        }`}
                      >
                        {days === 0 ? "今天" : `${days} 天`}
                      </span>
                      <span className="font-medium">{event.symbol}</span>
                      <span className="text-dim">{EVENT_KIND_LABEL[event.kind]}</span>
                      <span className="flex min-w-0 items-center gap-1 text-dim">
                        <span className="truncate">{event.note || "—"}</span>
                        {event.source === "nasdaq" && (
                          <span className="shrink-0 rounded border border-line bg-[#fbfaf8] px-1 text-[11px] text-faint">
                            自动
                          </span>
                        )}
                      </span>
                      <span className="text-right tnum text-dim">
                        {count > 0 ? `${count} 笔` : "—"}
                      </span>
                      <span className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => deleteEvent(event.id)}
                          aria-label={`删除 ${eventLabel(event)}`}
                          className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-hover hover:text-loss"
                        >
                          <Trash size={12} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </section>

          <p className="mt-4 border-t border-line-subtle pt-3 text-[11px] leading-4 text-faint">
            自动条目来自纳斯达克公开财报日历，公司改期或日历滞后时可能不准确；手工条目只保存在本机。
            “影响持仓”统计到期日不早于该事件的未平仓策略。跨事件提醒只做提示，不会自动调整定价。
          </p>
        </div>
      </div>
    </Workspace>
  );
}
