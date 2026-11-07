export type Expiry = { iso: string; label: string; dte: number };

export type Ticker = {
  symbol: string;
  name: string;
  spot: number;
  change: number;
  changePct: number;
  iv: number;
  ivRank: number;
  strikeStep: number;
  group: GroupKey;
};

export type GroupKey = "etf" | "mega" | "popular" | "meme" | "sector" | "leveraged";

export const AS_OF = "2026-11-06";

export const EXPIRIES: Expiry[] = [
  { iso: "2026-11-13", label: "11月13日", dte: 7 },
  { iso: "2026-11-20", label: "11月20日", dte: 14 },
  { iso: "2026-11-27", label: "11月27日", dte: 21 },
  { iso: "2026-12-04", label: "12月4日", dte: 27 },
  { iso: "2026-12-18", label: "12月18日", dte: 42 },
  { iso: "2027-01-15", label: "1月15日", dte: 70 },
];

export const TICKERS: Ticker[] = [
  { symbol: "SPY", name: "SPDR 标普500 ETF", spot: 736.07, change: 2.64, changePct: 0.0036, iv: 0.125, ivRank: 61, strikeStep: 1, group: "etf" },
  { symbol: "QQQ", name: "景顺 QQQ 信托", spot: 561.84, change: 4.12, changePct: 0.0074, iv: 0.168, ivRank: 48, strikeStep: 1, group: "etf" },
  { symbol: "IWM", name: "iShares 罗素2000 ETF", spot: 238.62, change: -1.16, changePct: -0.0048, iv: 0.214, ivRank: 55, strikeStep: 1, group: "etf" },
  { symbol: "DIA", name: "SPDR 道琼斯工业平均 ETF", spot: 462.18, change: 0.94, changePct: 0.002, iv: 0.142, ivRank: 39, strikeStep: 1, group: "etf" },

  { symbol: "AAPL", name: "苹果公司", spot: 245.23, change: 1.87, changePct: 0.0077, iv: 0.221, ivRank: 52, strikeStep: 2.5, group: "mega" },
  { symbol: "MSFT", name: "微软公司", spot: 468.91, change: -3.24, changePct: -0.0069, iv: 0.198, ivRank: 44, strikeStep: 5, group: "mega" },
  { symbol: "GOOGL", name: "Alphabet 公司", spot: 198.64, change: 2.06, changePct: 0.0105, iv: 0.246, ivRank: 63, strikeStep: 2.5, group: "mega" },
  { symbol: "AMZN", name: "亚马逊公司", spot: 227.88, change: 1.42, changePct: 0.0063, iv: 0.238, ivRank: 47, strikeStep: 2.5, group: "mega" },
  { symbol: "NVDA", name: "英伟达公司", spot: 182.34, change: 4.61, changePct: 0.0259, iv: 0.372, ivRank: 71, strikeStep: 1, group: "mega" },
  { symbol: "META", name: "Meta 平台公司", spot: 604.55, change: -8.31, changePct: -0.0136, iv: 0.289, ivRank: 58, strikeStep: 5, group: "mega" },
  { symbol: "TSLA", name: "特斯拉公司", spot: 316.42, change: 9.18, changePct: 0.0299, iv: 0.462, ivRank: 76, strikeStep: 2.5, group: "mega" },

  { symbol: "AMD", name: "超威半导体公司", spot: 148.72, change: 3.55, changePct: 0.0245, iv: 0.398, ivRank: 62, strikeStep: 1, group: "popular" },
  { symbol: "PLTR", name: "Palantir 科技公司", spot: 72.48, change: 2.94, changePct: 0.0423, iv: 0.487, ivRank: 69, strikeStep: 1, group: "popular" },
  { symbol: "SOFI", name: "SoFi 科技公司", spot: 26.14, change: 0.42, changePct: 0.0163, iv: 0.442, ivRank: 57, strikeStep: 0.5, group: "popular" },
  { symbol: "COIN", name: "Coinbase 全球公司", spot: 284.36, change: -9.87, changePct: -0.0335, iv: 0.512, ivRank: 74, strikeStep: 5, group: "popular" },
  { symbol: "HOOD", name: "Robinhood 市场公司", spot: 106.24, change: 3.18, changePct: 0.0308, iv: 0.478, ivRank: 66, strikeStep: 1, group: "popular" },
  { symbol: "NFLX", name: "奈飞公司", spot: 1024.6, change: -12.4, changePct: -0.012, iv: 0.276, ivRank: 41, strikeStep: 10, group: "popular" },
  { symbol: "BA", name: "波音公司", spot: 182.77, change: 2.31, changePct: 0.0128, iv: 0.318, ivRank: 51, strikeStep: 2.5, group: "popular" },
  { symbol: "DIS", name: "华特迪士尼公司", spot: 112.9, change: 0.88, changePct: 0.0079, iv: 0.259, ivRank: 43, strikeStep: 1, group: "popular" },

  { symbol: "GME", name: "GameStop 公司", spot: 24.12, change: 0.78, changePct: 0.0334, iv: 0.682, ivRank: 78, strikeStep: 0.5, group: "meme" },
  { symbol: "AMC", name: "AMC 娱乐控股", spot: 4.62, change: 0.18, changePct: 0.0405, iv: 0.745, ivRank: 81, strikeStep: 0.5, group: "meme" },
  { symbol: "MSTR", name: "微策略公司", spot: 264.85, change: -10.42, changePct: -0.0379, iv: 0.584, ivRank: 72, strikeStep: 5, group: "meme" },
  { symbol: "IBIT", name: "iShares 比特币信托 ETF", spot: 61.24, change: 1.42, changePct: 0.0237, iv: 0.421, ivRank: 64, strikeStep: 1, group: "meme" },

  { symbol: "XLF", name: "金融板块 SPDR 基金", spot: 51.86, change: 0.24, changePct: 0.0046, iv: 0.168, ivRank: 36, strikeStep: 1, group: "sector" },
  { symbol: "XLE", name: "能源板块 SPDR 基金", spot: 92.14, change: -0.68, changePct: -0.0073, iv: 0.196, ivRank: 42, strikeStep: 1, group: "sector" },
  { symbol: "XLK", name: "科技板块 SPDR 基金", spot: 240.62, change: 2.14, changePct: 0.009, iv: 0.184, ivRank: 45, strikeStep: 1, group: "sector" },
  { symbol: "XLV", name: "医疗板块 SPDR 基金", spot: 148.58, change: 0.62, changePct: 0.0042, iv: 0.162, ivRank: 33, strikeStep: 1, group: "sector" },
  { symbol: "GLD", name: "SPDR 黄金信托", spot: 238.42, change: 1.87, changePct: 0.0079, iv: 0.148, ivRank: 52, strikeStep: 1, group: "sector" },
  { symbol: "TLT", name: "iShares 20年期以上美债 ETF", spot: 88.46, change: -0.42, changePct: -0.0047, iv: 0.131, ivRank: 29, strikeStep: 1, group: "sector" },

  { symbol: "TQQQ", name: "ProShares 三倍做多 QQQ", spot: 92.18, change: 2.04, changePct: 0.0226, iv: 0.482, ivRank: 61, strikeStep: 1, group: "leveraged" },
  { symbol: "SQQQ", name: "ProShares 三倍做空 QQQ", spot: 15.24, change: -0.36, changePct: -0.0231, iv: 0.498, ivRank: 63, strikeStep: 0.5, group: "leveraged" },
  { symbol: "SOXL", name: "Direxion 半导体三倍做多", spot: 28.64, change: 1.12, changePct: 0.0407, iv: 0.712, ivRank: 74, strikeStep: 1, group: "leveraged" },
  { symbol: "SPXL", name: "Direxion 标普500 三倍做多", spot: 221.46, change: 2.21, changePct: 0.0101, iv: 0.352, ivRank: 54, strikeStep: 2.5, group: "leveraged" },
  { symbol: "UVXY", name: "ProShares 超恐慌指数短期期货", spot: 21.84, change: -0.94, changePct: -0.0412, iv: 0.884, ivRank: 82, strikeStep: 1, group: "leveraged" },
];

// All symbols, in the captured grid order (10 columns at desktop width).
export const ALL_GRID = [
  "SPY", "QQQ", "IWM", "DIA", "NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "GOOGL",
  "NFLX", "BA", "DIS", "NIO", "RIVN", "LCID", "BABA", "JD", "XYZ", "SHOP",
  "PYPL", "UBER", "ABNB", "SNOW", "CRM", "ORCL", "INTC", "MU", "SMCI", "ARM",
  "AVGO", "COST", "WMT", "TGT", "JPM", "GS", "BAC", "WFC", "XOM", "CVX",
  "GLD", "SLV", "USO", "TLT", "HYG", "UVXY", "VXX", "SQQQ", "TQQQ", "ARKK",
  "SPXL", "SOXL", "LABU", "UPRO", "SDOW", "SPXS", "XLF", "XLE", "XLK", "XLV",
  "XLI", "KWEB", "EEM", "FXI", "EWZ", "GDX", "SCHD", "VOO", "VTI", "NET",
  "DDOG", "ZS", "CRWD", "PANW", "NOW", "ADBE", "TTD", "RBLX", "U", "SNAP",
  "PINS", "ROKU", "SPOT", "SE", "GRAB", "MELI", "NU", "AFRM", "UPST",
];

export const SYMBOL_COUNT = 99;

export function ticker(symbol: string): Ticker {
  const upper = symbol.toUpperCase();
  const direct = TICKERS.find((t) => t.symbol === upper);
  if (direct) return direct;
  // Stable synthetic quote for the long tail and for symbols looked up online.
  let h = 0;
  for (const ch of upper) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  const spot = 18 + (h % 4200) / 10;
  const step = spot > 300 ? 5 : spot > 60 ? 2.5 : 1;
  return {
    symbol: upper,
    name: TICKER_NAME[upper] ?? "在线标的",
    spot: Number(spot.toFixed(2)),
    change: Number((((h % 200) - 100) / 100).toFixed(2)),
    changePct: ((h % 200) - 100) / 10000,
    iv: 0.2 + ((h % 30) / 100),
    ivRank: 20 + (h % 70),
    strikeStep: step,
    group: "popular",
  };
}

export const TICKER_NAME: Record<string, string> = {
  SPY: "SPDR S&P 500 ETF",
  QQQ: "Invesco QQQ Trust",
  IWM: "iShares Russell 2000 ETF",
  DIA: "SPDR Dow Jones Industrial Average ETF",
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corporation",
  META: "Meta Platforms Inc.",
  TSLA: "Tesla Inc.",
  AMD: "Advanced Micro Devices Inc.",
  PLTR: "Palantir Technologies Inc.",
  SOFI: "SoFi Technologies Inc.",
  COIN: "Coinbase Global Inc.",
  HOOD: "Robinhood Markets Inc.",
  NFLX: "Netflix Inc.",
  BA: "Boeing Company",
  DIS: "Walt Disney Company",
  UBER: "Uber Technologies Inc.",
  GME: "GameStop Corp.",
  AMC: "AMC Entertainment Holdings",
  MSTR: "MicroStrategy Inc.",
  IBIT: "iShares Bitcoin Trust ETF",
  XLF: "Financial Select Sector SPDR Fund",
  XLE: "Energy Select Sector SPDR Fund",
  XLK: "Technology Select Sector SPDR Fund",
  XLV: "Health Care Select Sector SPDR Fund",
  GLD: "SPDR Gold Shares",
  TLT: "iShares 20+ Year Treasury Bond ETF",
  TQQQ: "ProShares UltraPro QQQ",
  SQQQ: "ProShares UltraPro Short QQQ",
  SOXL: "Direxion Daily Semiconductor Bull 3X Shares",
  SPXL: "Direxion Daily S&P 500 Bull 3X Shares",
  UVXY: "ProShares Ultra VIX Short-Term Futures ETF",
  LABU: "Direxion Daily S&P Biotech Bull 3X Shares",
};
