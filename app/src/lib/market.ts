export type MarketSession = {
  open: boolean;
  label: string;
  detail: string;
};

const ET = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const WEEKEND = new Set(["Sat", "Sun"]);

/**
 * Regular US equity hours only: 09:30–16:00 ET, Monday to Friday.
 * Market holidays are not special-cased; the detail line says 常规时段.
 */
export function usMarketStatus(now = new Date()): MarketSession {
  const parts = ET.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const minutes = hour * 60 + minute;

  if (WEEKEND.has(weekday)) {
    return {
      open: false,
      label: "美股已收盘",
      detail: "周末休市 · 下个交易日 9:30 开盘（美东）",
    };
  }
  if (minutes < 9 * 60 + 30) {
    return { open: false, label: "美股已收盘", detail: "今日 9:30 开盘（美东）" };
  }
  if (minutes >= 16 * 60) {
    return {
      open: false,
      label: "美股已收盘",
      detail: "下个交易日 9:30 开盘（美东）",
    };
  }

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return { open: true, label: "美股交易中", detail: `美东 ${hh}:${mm} · 常规时段` };
}
