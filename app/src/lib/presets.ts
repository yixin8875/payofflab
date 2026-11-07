import { type Ticker } from "../data/tickers";
import { pricedLeg, roundStrike } from "./chain";
import { expiriesFor } from "./live";
import type { Leg } from "./options";

export type Outlook = "bullish" | "bearish" | "neutral" | "volatile";

export const OUTLOOK_LABEL: Record<Outlook, string> = {
  bullish: "看涨",
  bearish: "看跌",
  neutral: "中性",
  volatile: "波动",
};

export type Preset = {
  key: string;
  name: string;
  outlook: Outlook;
  build: (t: Ticker, expiryIso: string) => Leg[];
  sentence: string;
};

function strikes(t: Ticker) {
  const base = roundStrike(t.spot, t.strikeStep);
  const step = t.strikeStep;
  return {
    atm: base,
    at: (n: number) => Number((base + n * step).toFixed(2)),
  };
}

export const PRESETS: Preset[] = [
  {
    key: "long-call",
    name: "买入看涨",
    outlook: "bullish",
    sentence: "买入看涨期权：只承担已付权利金的风险。",
    build: (t, e) => {
      const s = strikes(t);
      return [pricedLeg(t, "call", 1, 1, s.atm, e)];
    },
  },
  {
    key: "bull-call-spread",
    name: "牛市看涨价差",
    outlook: "bullish",
    sentence: "买入低行权价看涨、卖出高行权价看涨：成本更低，收益有上限。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "call", 1, 1, s.atm, e),
        pricedLeg(t, "call", -1, 1, s.at(3), e),
      ];
    },
  },
  {
    key: "bull-put-spread",
    name: "牛市看跌价差",
    outlook: "bullish",
    sentence: "卖出高行权价看跌、买入低行权价看跌：收权利金，风险有上限。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "put", -1, 1, s.at(-3), e),
        pricedLeg(t, "put", 1, 1, s.at(-6), e),
      ];
    },
  },
  {
    key: "cash-secured-put",
    name: "现金担保看跌",
    outlook: "bullish",
    sentence: "卖出看跌期权并备好现金：等待买入股票的同时收取权利金。",
    build: (t, e) => {
      const s = strikes(t);
      return [pricedLeg(t, "put", -1, 1, s.at(-3), e)];
    },
  },
  {
    key: "covered-call",
    name: "备兑看涨",
    outlook: "bullish",
    sentence: "持有 100 股并卖出看涨期权：赚取权利金、压低持仓成本。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "stock", 1, 1, t.spot, e),
        pricedLeg(t, "call", -1, 1, s.at(6), e),
      ];
    },
  },
  {
    key: "long-put",
    name: "买入看跌",
    outlook: "bearish",
    sentence: "买入看跌期权：只承担已付权利金的风险。",
    build: (t, e) => {
      const s = strikes(t);
      return [pricedLeg(t, "put", 1, 1, s.atm, e)];
    },
  },
  {
    key: "bear-put-spread",
    name: "熊市看跌价差",
    outlook: "bearish",
    sentence: "买入高行权价看跌、卖出低行权价看跌：看跌且风险有限。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "put", 1, 1, s.atm, e),
        pricedLeg(t, "put", -1, 1, s.at(-3), e),
      ];
    },
  },
  {
    key: "bear-call-spread",
    name: "熊市看涨价差",
    outlook: "bearish",
    sentence: "卖出低行权价看涨、买入高行权价看涨：收取权利金的看跌组合。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "call", -1, 1, s.at(3), e),
        pricedLeg(t, "call", 1, 1, s.at(6), e),
      ];
    },
  },
  {
    key: "iron-condor",
    name: "铁鹰式",
    outlook: "neutral",
    sentence: "在区间两侧各卖出价差：收取权利金，风险有上限。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "put", -1, 1, s.at(-5), e),
        pricedLeg(t, "put", 1, 1, s.at(-8), e),
        pricedLeg(t, "call", -1, 1, s.at(5), e),
        pricedLeg(t, "call", 1, 1, s.at(8), e),
      ];
    },
  },
  {
    key: "iron-butterfly",
    name: "铁蝶式",
    outlook: "neutral",
    sentence: "平价处卖出跨式，两侧买入保护：区间越窄收益越高。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "put", -1, 1, s.atm, e),
        pricedLeg(t, "call", -1, 1, s.atm, e),
        pricedLeg(t, "put", 1, 1, s.at(-5), e),
        pricedLeg(t, "call", 1, 1, s.at(5), e),
      ];
    },
  },
  {
    key: "short-strangle",
    name: "卖出宽跨式",
    outlook: "neutral",
    sentence: "卖出虚值看涨与看跌：区间越宽，收取的权利金越多。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "put", -1, 1, s.at(-5), e),
        pricedLeg(t, "call", -1, 1, s.at(5), e),
      ];
    },
  },
  {
    key: "butterfly",
    name: "蝶式价差",
    outlook: "neutral",
    sentence: "两端买入、中间卖出：押注标的停在中间行权价附近。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "call", 1, 1, s.at(-5), e),
        pricedLeg(t, "call", -1, 2, s.atm, e),
        pricedLeg(t, "call", 1, 1, s.at(5), e),
      ];
    },
  },
  {
    key: "long-straddle",
    name: "买入跨式",
    outlook: "volatile",
    sentence: "同一行权价买入看涨与看跌：押注大幅波动，方向不限。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "call", 1, 1, s.atm, e),
        pricedLeg(t, "put", 1, 1, s.atm, e),
      ];
    },
  },
  {
    key: "long-strangle",
    name: "买入宽跨式",
    outlook: "volatile",
    sentence: "买入虚值看涨与看跌：比跨式便宜，需要更大的波动。",
    build: (t, e) => {
      const s = strikes(t);
      return [
        pricedLeg(t, "put", 1, 1, s.at(-3), e),
        pricedLeg(t, "call", 1, 1, s.at(3), e),
      ];
    },
  },
  {
    key: "calendar",
    name: "日历价差",
    outlook: "neutral",
    sentence: "卖出近月、买入远月：赚取时间价值衰减的差异。",
    build: (t, e) => {
      const s = strikes(t);
      const all = expiriesFor(t.symbol);
      const near = all.find((x) => x.iso === e) ?? all[Math.min(3, all.length - 1)];
      const far = all.find((x) => x.dte >= near.dte + 28) ?? all[all.length - 1];
      if (near.dte >= far.dte) return [pricedLeg(t, "call", 1, 1, s.atm, e)];
      return [
        pricedLeg(t, "call", -1, 1, s.atm, near.iso),
        pricedLeg(t, "call", 1, 1, s.atm, far.iso),
      ];
    },
  },
];

export const PRESET_BY_KEY: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((p) => [p.key, p]),
);

export const CHIP_GROUPS: { outlook: Outlook; keys: string[] }[] = [
  { outlook: "bullish", keys: ["long-call", "bull-call-spread", "bull-put-spread", "cash-secured-put", "covered-call"] },
  { outlook: "bearish", keys: ["long-put", "bear-put-spread", "bear-call-spread"] },
  { outlook: "neutral", keys: ["iron-condor", "iron-butterfly", "short-strangle", "butterfly"] },
  { outlook: "volatile", keys: ["long-straddle", "long-strangle"] },
];

export function legsFor(key: string, ticker: Ticker, expiryIso: string): Leg[] {
  const preset = PRESET_BY_KEY[key];
  if (preset) return preset.build(ticker, expiryIso);
  return [];
}
