import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Trash } from "../components/Icons";
import { PaneHeader, Workspace } from "../desktop/Split";
import {
  addEvent,
  deleteEvent,
  daysToEvent,
  EVENT_KIND_LABEL,
  eventLabel,
  todayIso,
  useEvents,
  type EventKind,
} from "../lib/events";
import { useTrades } from "../lib/store";

const KINDS: EventKind[] = ["earnings", "macro", "dividend", "other"];

export default function Events() {
  const events = useEvents();
  const trades = useTrades();
  const today = todayIso();
  const [symbol, setSymbol] = useState("");
  const [iso, setIso] = useState(today);
  const [kind, setKind] = useState<EventKind>("earnings");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

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
          <section className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[12px] font-semibold">添加事件</h2>
              <span className="text-[10px] text-faint">CBOE 行情不含财报日，需要手工录入</span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-[10px] text-dim">标的</span>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  placeholder="NVDA"
                  aria-label="事件标的"
                  className="mt-0.5 block h-7 w-24 rounded border border-line bg-white px-2 text-[11.5px] uppercase outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-dim">日期</span>
                <input
                  type="date"
                  value={iso}
                  min={today}
                  onChange={(event) => setIso(event.target.value)}
                  aria-label="事件日期"
                  className="mt-0.5 block h-7 rounded border border-line bg-white px-2 text-[11.5px] tnum outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-dim">类型</span>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as EventKind)}
                  aria-label="事件类型"
                  className="mt-0.5 block h-7 rounded border border-line bg-white px-1.5 text-[11.5px] outline-none focus:border-accent"
                >
                  {KINDS.map((value) => (
                    <option key={value} value={value}>
                      {EVENT_KIND_LABEL[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[180px] flex-1">
                <span className="text-[10px] text-dim">备注（可选）</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="盘后 / 预计波动 ±8%"
                  aria-label="事件备注"
                  className="mt-0.5 block h-7 w-full rounded border border-line bg-white px-2 text-[11.5px] outline-none focus:border-accent"
                />
              </label>
              <button type="button" onClick={submit} className="btn-primary h-7 px-3">
                添加
              </button>
            </div>
            {error && <p className="mt-2 text-[10.5px] text-loss">{error}</p>}
            <p className="mt-2.5 text-[10px] leading-4 text-faint">
              标的一栏填 <b className="font-medium text-dim">ALL</b> 可添加影响全市场的事件（如 FOMC、CPI）。
              构建器、持仓和情景分析都会读取这里的数据：到期日跨过事件时会提示，情景分析提供
              “财报后 IV −30%”预设。
            </p>
          </section>

          <section className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
            <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
              <h2 className="text-[12px] font-semibold">未来事件</h2>
              {pastCount > 0 && (
                <span className="text-[10px] text-faint">
                  另有 {pastCount} 个已过去的事件
                </span>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-[#fbfaf8] text-faint">
                  <Calendar size={16} />
                </span>
                <p className="mt-3 text-[11.5px] text-dim">还没有未来事件</p>
                <p className="mt-1 text-[10.5px] leading-4 text-faint">
                  先在上方添加一个财报日，跨事件的到期日会在构建器里标出来。
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[92px_64px_minmax(0,1fr)_72px_minmax(0,1.3fr)_80px_36px] gap-2 border-y border-line-subtle bg-[#fbfaf8] px-4 py-1.5 text-[9.5px] font-medium uppercase tracking-wide text-faint">
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
                      className="grid grid-cols-[92px_64px_minmax(0,1fr)_72px_minmax(0,1.3fr)_80px_36px] items-center gap-2 border-b border-line-subtle px-4 py-2 text-[11px] last:border-0"
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
                      <span className="truncate text-dim">{event.note || "—"}</span>
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

          <p className="mt-4 border-t border-line-subtle pt-3 text-[10px] leading-4 text-faint">
            事件日期为手工录入，不保证与实际公告一致；“影响持仓”统计到期日不早于该事件的未平仓策略。
            跨事件提醒只做提示，不会自动调整定价。
          </p>
        </div>
      </div>
    </Workspace>
  );
}
