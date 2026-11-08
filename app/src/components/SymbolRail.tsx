import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "./Icons";
import { SYMBOL_GROUPS, symbolName } from "../data/symbolGroups";
import { ticker } from "../data/tickers";
import { Badge, ListGroup, ListPane, ListRow } from "../desktop/Split";
import { useWatchlist } from "../lib/watchlist";

/**
 * Shared symbol sidebar for /chain and /gex: search, watchlist groups, then
 * curated market groups. Rows navigate to `${basePath}/${symbol}`.
 */
export function SymbolRail({
  basePath,
  title,
  count,
  selectedSymbol,
}: {
  basePath: string;
  title: string;
  count: number | string;
  selectedSymbol?: string;
}) {
  const [query, setQuery] = useState("");
  const watchGroups = useWatchlist();
  const watchingGroups = watchGroups.filter((group) => group.symbols.length > 0);
  const q = query.trim().toUpperCase();

  const visibleGroups = SYMBOL_GROUPS.map((group) => ({
    ...group,
    symbols: group.symbols.filter(
      (symbol) => !q || symbol.includes(q) || symbolName(symbol).toUpperCase().includes(q),
    ),
  })).filter((group) => group.symbols.length > 0);

  const extra =
    visibleGroups.length === 0 && /^[A-Z][A-Z0-9.\-]{0,11}$/.test(q) ? q : "";

  return (
    <ListPane title={title} count={count}>
      <div className="px-2 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标的"
            className="field h-7 pl-7 text-[12px]"
            aria-label="搜索标的"
          />
        </div>
      </div>

      <section className="border-b border-line-subtle pb-1">
        <div className="flex items-baseline justify-between px-3 pb-1 pt-3">
          <h3 className="text-[10.5px] font-semibold tracking-[0.02em] text-faint">自选</h3>
          <Link to="/watchlist" className="text-[10px] font-medium text-accent hover:underline">
            管理
          </Link>
        </div>
        {watchingGroups.map((group) => (
          <div key={group.id} className="pb-1">
            <p className="flex items-baseline gap-1.5 px-3 pb-0.5 pt-1 text-[10px] text-dim">
              <span className="truncate">{group.name}</span>
              <span className="shrink-0 text-faint/80">{group.symbols.length}</span>
            </p>
            <ul>
              {group.symbols.map((symbol) => (
                <ListRow
                  key={`${group.id}:${symbol}`}
                  to={`${basePath}/${symbol.toLowerCase()}`}
                  selected={selectedSymbol === symbol}
                  badge={<Badge label={symbol.slice(0, 2)} seed={symbol} size={26} />}
                  title={symbol}
                  subtitle={symbolName(symbol)}
                />
              ))}
            </ul>
          </div>
        ))}
        {watchingGroups.length === 0 && (
          <p className="px-3 pb-1 text-[10.5px] text-faint">在标的页点「自选」即可收藏。</p>
        )}
      </section>

      {visibleGroups.map((group) => (
        <ListGroup key={group.title} label={group.title} count={group.symbols.length}>
          {group.symbols.map((symbol) => {
            const item = ticker(symbol);
            return (
              <ListRow
                key={symbol}
                to={`${basePath}/${symbol.toLowerCase()}`}
                selected={selectedSymbol === symbol}
                badge={<Badge label={symbol.slice(0, 2)} seed={symbol} size={26} />}
                title={symbol}
                subtitle={symbolName(symbol)}
                meta={`$${item.spot.toFixed(2)}`}
              />
            );
          })}
        </ListGroup>
      ))}

      {extra && (
        <ListGroup label="在线查询" count={1}>
          <ListRow
            to={`${basePath}/${extra.toLowerCase()}`}
            selected={selectedSymbol === extra}
            badge={<Badge label={extra.slice(0, 2)} seed={extra} size={26} />}
            title={extra}
            subtitle="CBOE 延迟行情中查询"
            meta="在线"
          />
        </ListGroup>
      )}

      {visibleGroups.length === 0 && !extra && (
        <p className="px-3 py-10 text-center text-[11.5px] text-dim">没有匹配的标的</p>
      )}
    </ListPane>
  );
}
