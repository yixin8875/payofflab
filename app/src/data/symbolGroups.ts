import { TICKER_NAME, ticker } from "./tickers";

/** Symbology shared by the chain and gamma-exposure sidebars. */
export const SYMBOL_GROUPS = [
  { title: "主要 ETF", symbols: ["SPY", "QQQ", "IWM", "DIA"] },
  { title: "大型科技股", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"] },
  { title: "热门个股", symbols: ["AMD", "PLTR", "SOFI", "COIN", "HOOD", "NFLX", "BA", "DIS"] },
  { title: "迷因股", symbols: ["GME", "AMC", "MSTR", "IBIT"] },
  { title: "板块 ETF", symbols: ["XLF", "XLE", "XLK", "XLV", "GLD", "TLT"] },
  { title: "杠杆 ETF", symbols: ["TQQQ", "SQQQ", "SOXL", "SPXL", "UVXY"] },
];

export function symbolName(symbol: string): string {
  return TICKER_NAME[symbol] ?? ticker(symbol).name;
}
