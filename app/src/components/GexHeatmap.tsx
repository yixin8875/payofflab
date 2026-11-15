import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeGexHeatmap,
  gexLabel,
  strikeLabel,
  type GexOptions,
} from "../lib/gex";
import type { LiveChain } from "../lib/live";

const BANDS = [
  { value: 0.05, label: "±5%" },
  { value: 0.1, label: "±10%" },
  { value: 0.2, label: "±20%" },
] as const;

const POSITIVE_RGB = "11, 122, 82";
const NEGATIVE_RGB = "191, 59, 43";

/** Alpha ramp on white paper: near-zero reads as empty, the cap reads solid. */
function heatColor(value: number, scale: number): string {
  const intensity = Math.min(1, Math.abs(value) / Math.max(1, scale));
  const alpha = 0.06 + 0.78 * Math.pow(intensity, 0.55);
  return `rgba(${value >= 0 ? POSITIVE_RGB : NEGATIVE_RGB}, ${alpha.toFixed(3)})`;
}

export function GexHeatmap({
  chain,
  options,
  onSelectExpiry,
}: {
  chain: LiveChain;
  options?: GexOptions;
  onSelectExpiry?: (iso: string) => void;
}) {
  const [band, setBand] = useState<number>(0.1);
  const [hover, setHover] = useState<{ strike: number; iso: string } | null>(null);
  const data = useMemo(
    () => computeGexHeatmap(chain, band, options),
    [chain, band, options],
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const spotRowRef = useRef<HTMLTableRowElement | null>(null);

  // A strike window can be hundreds of rows tall; open centered on spot rather
  // than at the highest strike, where the interesting gamma never is.
  useEffect(() => {
    const container = scrollRef.current;
    const row = spotRowRef.current;
    if (!container || !row) return;
    const top =
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTop = Math.max(0, top - container.clientHeight / 2 + row.offsetHeight / 2);
  }, [data]);

  const spotStrike = useMemo(() => {
    if (!data.rows.length) return null;
    return data.rows.reduce(
      (best, row) =>
        Math.abs(row.strike - data.spot) < Math.abs(best - data.spot) ? row.strike : best,
      data.rows[0].strike,
    );
  }, [data]);

  const hovered = useMemo(() => {
    if (!hover) return null;
    const column = data.expiries.findIndex((expiry) => expiry.iso === hover.iso);
    const row = data.rows.find((item) => item.strike === hover.strike);
    if (column < 0 || !row) return null;
    return {
      expiry: data.expiries[column],
      strike: row.strike,
      cell: row.cells[column] ?? null,
    };
  }, [data, hover]);

  return (
    <section className="mt-3 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold">行权价 × 到期日热力图</h2>
          <p className="mt-0.5 text-[11px] text-dim">
            每个格子是一个到期日、一个行权价的净美元 Gamma；绿色为正、红色为负，用来定位 Gamma 集中在哪几天、哪些价位。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="mr-0.5 text-[11px] text-faint">窗口</span>
            {BANDS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setBand(item.value);
                  setHover(null);
                }}
                className={`h-6 rounded-lg border px-2 text-[12px] font-medium transition-colors ${
                  band === item.value
                    ? "border-accent-line bg-accent-soft text-accent"
                    : "border-line bg-white text-dim hover:text-text"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-faint">
            <span>负</span>
            <span
              className="h-2 w-20 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(191,59,43,0.85), rgba(191,59,43,0.06) 45%, rgba(11,122,82,0.06) 55%, rgba(11,122,82,0.85))",
              }}
            />
            <span>正</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {hovered ? (
          <>
            <span className="font-medium text-text tnum">
              行权价 {strikeLabel(hovered.strike)}
            </span>
            <span className="text-dim">
              {hovered.expiry.label} · {hovered.expiry.dte} 天
            </span>
            {hovered.cell ? (
              <>
                <span className="text-faint">净</span>
                <span
                  className={`tnum font-semibold ${
                    hovered.cell.net >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {gexLabel(hovered.cell.net, { sign: true })}
                </span>
                <span className="text-faint">看涨</span>
                <span className="tnum text-text">{gexLabel(hovered.cell.call, { sign: true })}</span>
                <span className="text-faint">看跌</span>
                <span className="tnum text-text">{gexLabel(hovered.cell.put, { sign: true })}</span>
              </>
            ) : (
              <span className="text-faint">该价位没有挂牌合约，或未平仓量为零</span>
            )}
          </>
        ) : (
          <span className="text-faint">
            悬停格子查看明细；点击到期日列头可把上方统计切换到该到期日。
          </span>
        )}
      </div>

      {data.rows.length === 0 ? (
        <div className="mt-2 rounded-lg border border-line-subtle bg-[#fbfaf8] px-4 py-8 text-center text-[12px] text-dim">
          当前窗口内没有可用的未平仓数据，试试放大窗口或刷新行情。
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="mt-2 overflow-auto rounded-lg border border-line-subtle bg-[#fbfaf8]"
          style={{ maxHeight: 500 }}
        >
          <table
            aria-label="行权价与到期日的净 Gamma 敞口热力图"
            className="w-full border-separate border-spacing-[1px] text-[11px]"
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 w-[64px] min-w-[64px] bg-[#fbfaf8] px-1 py-1.5 text-right text-[11px] font-medium text-faint"
                >
                  行权价
                </th>
                {data.expiries.map((expiry) => (
                  <th
                    key={expiry.iso}
                    scope="col"
                    className="sticky top-0 z-20 bg-[#fbfaf8] p-0 font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectExpiry?.(expiry.iso)}
                      className="w-full rounded px-0 py-1 text-center text-[11px] leading-4 text-dim transition-colors hover:bg-hover hover:text-text"
                      title={`只看 ${expiry.label} 的统计`}
                    >
                      {expiry.label}
                      <span className="block text-[11px] text-faint tnum">{expiry.dte}天</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const isSpot = row.strike === spotStrike;
                return (
                  <tr key={row.strike} ref={isSpot ? spotRowRef : undefined}>
                    <th
                      scope="row"
                      aria-label={
                        isSpot
                          ? `行权价 ${strikeLabel(row.strike)}，现价附近`
                          : `行权价 ${strikeLabel(row.strike)}`
                      }
                      className={`sticky left-0 z-10 whitespace-nowrap border-l-2 bg-white px-2 text-right text-[11px] font-normal tnum ${
                        isSpot
                          ? "border-accent font-semibold text-accent"
                          : "border-transparent text-dim"
                      }`}
                    >
                      {strikeLabel(row.strike)}
                    </th>
                    {row.cells.map((cell, index) => {
                      const expiry = data.expiries[index];
                      const active =
                        hover?.strike === row.strike && hover?.iso === expiry.iso;
                      return (
                        <td
                          key={expiry.iso}
                          title={
                            cell
                              ? `${expiry.label} · 行权价 ${strikeLabel(row.strike)} · 净 ${gexLabel(
                                  cell.net,
                                  { sign: true },
                                )}`
                              : `${expiry.label} · 行权价 ${strikeLabel(row.strike)} · 无数据`
                          }
                          onMouseEnter={() => setHover({ strike: row.strike, iso: expiry.iso })}
                          onMouseLeave={() => setHover(null)}
                          className={`h-[14px] p-0 ${cell ? "" : "bg-[#f1efea]"}`}
                          style={{
                            background: cell ? heatColor(cell.net, data.scale) : undefined,
                            boxShadow: active ? "inset 0 0 0 1.5px #1c1b19" : undefined,
                          }}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-faint">
        <span className="tnum">
          {data.rows.length} 个行权价 × {data.expiries.length} 个到期日 · 按
          {options?.weight === "volume" ? "成交量" : "未平仓量"} · 颜色按 90 分位截断
        </span>
        {(data.hiddenStrikes > 0 || data.hiddenExpiries > 0) && (
          <span>
            另有
            {data.hiddenExpiries > 0 ? ` ${data.hiddenExpiries} 个到期日` : ""}
            {data.hiddenExpiries > 0 && data.hiddenStrikes > 0 ? "、" : ""}
            {data.hiddenStrikes > 0 ? `${data.hiddenStrikes} 个行权价` : ""}
            未显示，已计入上方统计。
          </span>
        )}
      </div>
    </section>
  );
}
