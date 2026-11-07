import { Link, useParams } from "react-router-dom";
import { ArrowRight, Star } from "../components/Icons";
import { PayoffChart } from "../components/PayoffChart";
import {
  Badge,
  DetailScroll,
  EmptyDetail,
  ListGroup,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import { EXPIRIES, ticker } from "../data/tickers";
import { legsFor } from "../lib/presets";
import { money, pct } from "../lib/format";

const SYMBOLS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "AMD", "META", "AMZN"];
const EXPIRY = EXPIRIES[3];

export default function Watchlist() {
  const { symbol } = useParams<{ symbol?: string }>();
  const selected = symbol?.toUpperCase();

  return (
    <Split
      list={
        <ListPane
          title="自选"
          count={SYMBOLS.length}
          actions={
            <span className="flex items-center gap-1 text-[10px] text-faint">
              <Star size={11} />
              本机
            </span>
          }
        >
          <ListGroup label="关注的标的">
            {SYMBOLS.map((sym) => {
              const t = ticker(sym);
              return (
                <ListRow
                  key={sym}
                  to={`/watchlist/${sym.toLowerCase()}`}
                  selected={selected === sym}
                  badge={<Badge label={sym.slice(0, 2)} seed={sym} />}
                  title={sym}
                  subtitle={t.name}
                  meta={
                    <span className={t.change >= 0 ? "text-profit" : "text-loss"}>
                      {t.change >= 0 ? "+" : "−"}
                      {Math.abs(t.changePct * 100).toFixed(2)}%
                    </span>
                  }
                />
              );
            })}
          </ListGroup>
        </ListPane>
      }
    >
      {selected ? (
        <WatchView key={selected} symbol={selected} />
      ) : (
        <>
          <PaneHeader title="自选" subtitle="只保存在本机" />
          <EmptyDetail
            title="选择一个标的"
            body="查看报价、隐含波动率与一条按当前参数画出的示例盈亏曲线。"
            action={
              <Link to="/chain" className="btn-secondary h-8 px-3">
                打开期权链
              </Link>
            }
          />
        </>
      )}
    </Split>
  );
}

function WatchView({ symbol }: { symbol: string }) {
  const t = ticker(symbol);
  const legs = legsFor("long-call", t, EXPIRY.iso);
  const expectedMove = t.spot * t.iv * Math.sqrt(EXPIRY.dte / 365);

  return (
    <>
      <PaneHeader title={`${t.symbol} · ${t.name}`} subtitle="自选 · 延迟行情">
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
              ${t.spot.toFixed(2)}
            </p>
          </div>
          <p
            className={`pb-1 text-[13px] font-medium tnum ${
              t.change >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {t.change >= 0 ? "▲" : "▼"} {money(Math.abs(t.change))} ({t.change >= 0 ? "+" : "−"}
            {Math.abs(t.changePct * 100).toFixed(2)}%)
          </p>
          <p className="pb-1 text-[11px] text-faint">美东 4:14 PM · 上一交易时段</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ["隐含波动率", pct(t.iv, 1), "年化"],
            ["IV 排名", String(t.ivRank), "过去一年"],
            ["行权价间距", `$${t.strikeStep}`, "合成链"],
            ["到期预期波动", `±${money(expectedMove)}`, `±${pct(expectedMove / t.spot)}`],
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
              {EXPIRY.label} · {EXPIRY.dte} 天
            </span>
          </div>
          <PayoffChart
            legs={legs}
            spot={t.spot}
            iv={t.iv}
            dte={EXPIRY.dte}
            expiryLabel={EXPIRY.label}
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
                to={`/calculator?preset=${preset}&ticker=${t.symbol}&expiry=${EXPIRY.iso}`}
                className="group rounded-lg border border-line bg-white p-2.5 transition-colors hover:border-line-strong"
              >
                <p className="text-[12px] font-medium group-hover:text-accent">{name}</p>
                <p className="mt-0.5 text-[10.5px] text-dim">{hint}</p>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-5 text-[10.5px] leading-4 text-faint">
          示例按合成报价与 Black-Scholes 计算，不代表可成交价格。自选列表只保存在本机。
        </p>
      </DetailScroll>
    </>
  );
}
