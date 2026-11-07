import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Plus, Star, Trash } from "../components/Icons";
import { PayoffChart } from "../components/PayoffChart";
import { WatchlistMenu } from "../components/WatchlistMenu";
import {
  Badge,
  DetailScroll,
  EmptyDetail,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import { EXPIRIES, ticker } from "../data/tickers";
import { money, pct } from "../lib/format";
import { legsFor } from "../lib/presets";
import { useLiveChain } from "../lib/useLiveChain";
import {
  addGroup,
  addSymbol,
  countSymbols,
  deleteGroup,
  removeSymbol,
  renameGroup,
  useWatchlist,
  type WatchGroup,
} from "../lib/watchlist";

export default function Watchlist() {
  const { symbol } = useParams<{ symbol?: string }>();
  const selected = symbol?.toUpperCase();
  const groups = useWatchlist();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const total = countSymbols(groups);

  const createGroup = () => {
    const group = addGroup(groupName);
    if (!group) return;
    setGroupName("");
    setCreating(false);
  };

  const promptAdd = (group: WatchGroup) => {
    const code = window.prompt(`输入要加入「${group.name}」的代码，例如 NVDA`);
    if (!code) return;
    if (!addSymbol(group.id, code)) {
      window.alert("请输入有效的美股代码；如果该代码已在分组中，也会提示此消息。");
    }
  };

  const promptRename = (group: WatchGroup) => {
    const next = window.prompt("分组名称", group.name);
    if (next?.trim()) renameGroup(group.id, next);
  };

  const removeGroup = (group: WatchGroup) => {
    const message = `删除分组「${group.name}」？组内 ${group.symbols.length} 个标的会从该分组移除。`;
    if (!window.confirm(message)) return;
    deleteGroup(group.id);
    if (selected && group.symbols.includes(selected)) navigate("/watchlist");
  };

  return (
    <Split
      list={
        <ListPane
          title="自选"
          count={`${total} 个标的`}
          actions={
            <button
              type="button"
              onClick={() => setCreating((value) => !value)}
              className="icon-btn h-6 w-6"
              title="新建分组"
              aria-label="新建分组"
            >
              <Plus size={14} />
            </button>
          }
        >
          {creating && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createGroup();
              }}
              className="flex items-center gap-1 px-2 pb-2"
            >
              <input
                autoFocus
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="分组名称"
                maxLength={20}
                className="field h-7 flex-1 px-2 text-[11.5px]"
                aria-label="分组名称"
              />
              <button type="submit" disabled={!groupName.trim()} className="btn-secondary h-7 px-2">
                新建
              </button>
            </form>
          )}

          {groups.map((group) => (
            <section key={group.id} className="pb-1">
              <div className="flex items-center gap-1 px-3 pb-1 pt-3">
                <h3 className="flex min-w-0 flex-1 items-baseline gap-1.5 text-[10.5px] font-semibold tracking-[0.02em] text-faint">
                  <span className="truncate">{group.name}</span>
                  <span className="shrink-0 font-normal text-faint/80">{group.symbols.length}</span>
                </h3>
                <div className="flex shrink-0 items-center gap-0.5 text-faint">
                  <button
                    type="button"
                    onClick={() => promptAdd(group)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-hover hover:text-text"
                    title={`向「${group.name}」添加代码`}
                    aria-label={`向「${group.name}」添加代码`}
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => promptRename(group)}
                    className="rounded px-1 py-0.5 text-[9.5px] hover:bg-hover hover:text-text"
                    title="重命名分组"
                  >
                    改名
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(group)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-hover hover:text-loss"
                    title="删除分组"
                    aria-label={`删除分组「${group.name}」`}
                  >
                    <Trash size={11} />
                  </button>
                </div>
              </div>
              <ul>
                {group.symbols.map((sym) => {
                  const t = ticker(sym);
                  return (
                    <ListRow
                      key={`${group.id}:${sym}`}
                      to={`/watchlist/${sym.toLowerCase()}`}
                      selected={selected === sym}
                      badge={<Badge label={sym.slice(0, 2)} seed={sym} />}
                      title={sym}
                      subtitle={t.name}
                      action={
                        <button
                          type="button"
                          onClick={() => removeSymbol(group.id, sym)}
                          className="flex h-5 w-5 items-center justify-center rounded text-faint hover:bg-[#f5efec] hover:text-loss"
                          title={`从「${group.name}」移除`}
                          aria-label={`从「${group.name}」移除 ${sym}`}
                        >
                          <Trash size={11} />
                        </button>
                      }
                    />
                  );
                })}
                {group.symbols.length === 0 && (
                  <li className="px-3 py-1.5 text-[10.5px] text-faint">还没有标的，点上方 + 添加</li>
                )}
              </ul>
            </section>
          ))}

          <div className="mx-3 mt-3 border-t border-line-subtle pt-2 text-[10px] leading-4 text-faint">
            自选只保存在本机。也可以在期权链页面点「自选」直接收藏。
          </div>
        </ListPane>
      }
    >
      {selected ? (
        <WatchView key={selected} symbol={selected} />
      ) : (
        <>
          <PaneHeader title="自选" subtitle="按分组管理常用标的 · 本机保存" />
          <EmptyDetail
            title={groups.length ? "选择一个标的" : "建立第一个分组"}
            body="收藏常用标的并按主题分组，随时查看实时价格、隐含波动率与示例盈亏曲线。"
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="btn-secondary h-8 px-3"
                >
                  <Star size={12} />
                  新建分组
                </button>
                <Link to="/chain" className="btn-primary h-8 px-3">
                  打开期权链
                </Link>
              </div>
            }
          />
        </>
      )}
    </Split>
  );
}

function WatchView({ symbol }: { symbol: string }) {
  const t = ticker(symbol);
  const live = useLiveChain(symbol);
  const chain = live.chain;
  const expiries = chain?.expiries ?? EXPIRIES;

  const expiry = useMemo(
    () =>
      expiries.reduce(
        (best, item) => (Math.abs(item.dte - 30) < Math.abs(best.dte - 30) ? item : best),
        expiries[0],
      ),
    [expiries],
  );

  const market = useMemo(() => {
    if (!chain) return t;
    return {
      ...t,
      spot: chain.spot || t.spot,
      change: chain.change,
      changePct: chain.changePct,
      iv: chain.iv30 || t.iv,
    };
  }, [t, chain]);

  const legs = useMemo(
    () => legsFor("long-call", market, expiry.iso),
    [market, expiry.iso],
  );
  const expectedMove = market.spot * market.iv * Math.sqrt(expiry.dte / 365);
  const online = Boolean(chain);

  return (
    <>
      <PaneHeader
        title={`${t.symbol} · ${t.name}`}
        subtitle={online ? "在线 · CBOE 延迟 15 分钟" : "自选 · 本机保存"}
      >
        <WatchlistMenu symbol={t.symbol} />
        <Link to={`/chain/${t.symbol.toLowerCase()}`} className="btn-primary h-7 px-2.5">
          查看期权链
          <ArrowRight size={12} />
        </Link>
        <Link to={`/tools/option-finder?ticker=${t.symbol}`} className="btn-secondary h-7 px-2.5">
          扫描价差
        </Link>
      </PaneHeader>

      <DetailScroll>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-faint">参考价</p>
            <p className="mt-0.5 text-[30px] font-semibold leading-9 tracking-[-0.03em] tnum">
              ${market.spot.toFixed(2)}
            </p>
          </div>
          <p
            className={`pb-1 text-[13px] font-medium tnum ${
              market.change >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {market.change >= 0 ? "▲" : "▼"} {money(Math.abs(market.change))} (
            {market.change >= 0 ? "+" : "−"}
            {Math.abs(market.changePct * 100).toFixed(2)}%)
          </p>
          <p className="pb-1 text-[11px] text-faint">
            {online ? `CBOE 延迟 15 分钟 · ${chain?.asOf}` : "上一交易时段 · 模型合成"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ["隐含波动率", pct(market.iv, 1), online ? "IV30 · 在线" : "年化"],
            [
              "IV 排名",
              online ? "—" : String(t.ivRank),
              online ? "在线行情未提供" : "过去一年",
            ],
            ["行权价间距", `$${t.strikeStep}`, online ? "按挂牌合约对齐" : "合成链"],
            ["到期预期波动", `±${money(expectedMove)}`, `±${pct(expectedMove / market.spot)}`],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-lg border border-line bg-white px-3 py-2.5">
              <p className="text-[10px] text-faint">{label}</p>
              <p className="mt-0.5 text-[15px] font-semibold tnum">{value}</p>
              <p className="mt-0.5 text-[9.5px] text-faint">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-line bg-white p-3">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 className="text-[12px] font-semibold">示例 · 买入平值看涨</h2>
            <span className="text-[10.5px] text-faint">
              {expiry.label} · {expiry.dte} 天
            </span>
          </div>
          <PayoffChart
            legs={legs}
            spot={market.spot}
            iv={market.iv}
            dte={expiry.dte}
            expiryLabel={expiry.label}
            mode="pnl"
            envelope={1}
            height={260}
          />
        </div>

        <section className="mt-5">
          <h2 className="text-[12px] font-semibold">用 {t.symbol} 做一笔</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              ["long-call", "买入看涨", "押注上涨，亏损有限"],
              ["bull-call-spread", "牛市看涨价差", "降低成本的看涨"],
              ["cash-secured-put", "现金担保看跌", "等回调时收权利金"],
            ].map(([preset, name, hint]) => (
              <Link
                key={preset}
                to={`/calculator?preset=${preset}&ticker=${t.symbol}&expiry=${expiry.iso}`}
                className="group rounded-lg border border-line bg-white p-2.5 transition-colors hover:border-line-strong"
              >
                <p className="text-[12px] font-medium group-hover:text-accent">{name}</p>
                <p className="mt-0.5 text-[10.5px] text-dim">{hint}</p>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-5 text-[10.5px] leading-4 text-faint">
          {online
            ? "示例按 CBOE 延迟报价与 Black-Scholes 计算，不代表可成交价格。自选分组只保存在本机。"
            : "示例按合成报价与 Black-Scholes 计算，不代表可成交价格。自选分组只保存在本机。"}
        </p>
      </DetailScroll>
    </>
  );
}
