import type { Outlook } from "../lib/presets";

export type Risk = "defined" | "undefined" | "stock";
export type Level = "beginner" | "intermediate" | "advanced";

export type Strategy = {
  slug: string;
  name: string;
  category: string;
  outlook: Outlook;
  risk: Risk;
  level: Level;
  desc: string;
  shape: "rise" | "fall" | "range" | "vol" | "butterfly" | "income";
  preset?: string;
};

export const CATEGORY_ORDER = [
  "Single-Leg Options",
  "Stock + Option",
  "Vertical Spreads",
  "Volatility",
  "Iron Condors & Butterflies",
  "Butterflies & Ratios",
  "Time & Diagonal",
  "Synthetic",
  "Income & Credit",
];

export const CATEGORY_ZH: Record<string, string> = {
  "Single-Leg Options": "单腿期权",
  "Stock + Option": "股票 + 期权",
  "Vertical Spreads": "垂直价差",
  Volatility: "波动率策略",
  "Iron Condors & Butterflies": "铁鹰与铁蝶",
  "Butterflies & Ratios": "蝶式与比例价差",
  "Time & Diagonal": "时间与对角价差",
  Synthetic: "合成头寸",
  "Income & Credit": "收益与收权利金",
};

export const OUTLOOK_ZH = { bullish: "看涨", bearish: "看跌", neutral: "中性", volatile: "波动" } as const;
export const RISK_ZH = { defined: "风险有限", undefined: "风险无限", stock: "股票风险" } as const;
export const LEVEL_ZH = { beginner: "入门", intermediate: "中级", advanced: "进阶" } as const;

export const STRATEGIES: Strategy[] = [
  { slug: "long-call", name: "买入看涨", category: "Single-Leg Options", outlook: "bullish", risk: "defined", level: "beginner", shape: "rise", preset: "long-call", desc: "买入看涨期权，以有限的风险押注标的价格上涨。" },
  { slug: "long-put", name: "买入看跌", category: "Single-Leg Options", outlook: "bearish", risk: "defined", level: "beginner", shape: "fall", preset: "long-put", desc: "买入看跌期权，以有限的风险押注标的价格下跌。" },
  { slug: "short-call", name: "卖出看涨（裸卖）", category: "Single-Leg Options", outlook: "bearish", risk: "undefined", level: "advanced", shape: "fall", desc: "卖出看涨期权收取权利金，但上行风险没有上限。" },
  { slug: "short-put", name: "卖出看跌（裸卖）", category: "Single-Leg Options", outlook: "bullish", risk: "undefined", level: "intermediate", shape: "rise", desc: "卖出看跌期权收取权利金，下行风险较大。" },

  { slug: "covered-call", name: "备兑看涨", category: "Stock + Option", outlook: "neutral", risk: "stock", level: "beginner", shape: "income", preset: "covered-call", desc: "对持有的股票卖出看涨期权，赚取权利金并降低持仓成本。" },
  { slug: "covered-put", name: "备兑看跌", category: "Stock + Option", outlook: "bearish", risk: "undefined", level: "advanced", shape: "fall", desc: "在持有空头股票的同时卖出看跌期权。" },
  { slug: "cash-secured-put", name: "现金担保看跌", category: "Stock + Option", outlook: "bullish", risk: "defined", level: "beginner", shape: "rise", preset: "cash-secured-put", desc: "卖出看跌期权并预留现金买入股票，等待期间收取权利金。" },
  { slug: "protective-put", name: "保护性看跌", category: "Stock + Option", outlook: "bullish", risk: "defined", level: "beginner", shape: "rise", desc: "为持有的股票买入看跌期权，为头寸建立价格下限。" },
  { slug: "collar", name: "领口策略", category: "Stock + Option", outlook: "neutral", risk: "defined", level: "beginner", shape: "income", desc: "买入看跌保护股票，同时卖出备兑看涨来支付成本，风险和收益都被封顶。" },

  { slug: "bull-call-spread", name: "牛市看涨价差", category: "Vertical Spreads", outlook: "bullish", risk: "defined", level: "beginner", shape: "rise", preset: "bull-call-spread", desc: "买入低行权价看涨、卖出高行权价看涨，风险有限地看涨。" },
  { slug: "bear-call-spread", name: "熊市看涨价差", category: "Vertical Spreads", outlook: "bearish", risk: "defined", level: "intermediate", shape: "fall", preset: "bear-call-spread", desc: "卖出低行权价看涨、买入高行权价看涨，收取权利金的看跌价差。" },
  { slug: "bull-put-spread", name: "牛市看跌价差", category: "Vertical Spreads", outlook: "bullish", risk: "defined", level: "intermediate", shape: "rise", preset: "bull-put-spread", desc: "卖出高行权价看跌、买入低行权价看跌，收取权利金的看涨价差。" },
  { slug: "bear-put-spread", name: "熊市看跌价差", category: "Vertical Spreads", outlook: "bearish", risk: "defined", level: "beginner", shape: "fall", preset: "bear-put-spread", desc: "买入高行权价看跌、卖出低行权价看跌，风险有限的看跌头寸。" },

  { slug: "long-straddle", name: "买入跨式", category: "Volatility", outlook: "volatile", risk: "defined", level: "intermediate", shape: "vol", preset: "long-straddle", desc: "同行权价买入看涨与看跌，从任一方向的大幅波动中获利。" },
  { slug: "short-straddle", name: "卖出跨式", category: "Volatility", outlook: "neutral", risk: "undefined", level: "advanced", shape: "range", desc: "同行权价卖出看涨与看跌，赚取波动率回落的时间价值。" },
  { slug: "long-strangle", name: "买入宽跨式", category: "Volatility", outlook: "volatile", risk: "defined", level: "intermediate", shape: "vol", preset: "long-strangle", desc: "买入虚值看涨与看跌，比跨式便宜，适合更大的波动。" },
  { slug: "short-strangle", name: "卖出宽跨式", category: "Volatility", outlook: "neutral", risk: "undefined", level: "advanced", shape: "range", preset: "short-strangle", desc: "卖出虚值看涨与看跌，盈利区间比跨式更宽。" },
  { slug: "guts", name: "Guts 跨式", category: "Volatility", outlook: "volatile", risk: "defined", level: "advanced", shape: "vol", desc: "买入实值看涨与实值看跌，构建成本更高的宽跨式，两腿都有内在价值。" },
  { slug: "strip", name: "Strip（看跌偏向）", category: "Volatility", outlook: "volatile", risk: "defined", level: "advanced", shape: "vol", desc: "同行权价买入一张看涨、两张看跌，偏向下跌的波动交易。" },
  { slug: "strap", name: "Strap（看涨偏向）", category: "Volatility", outlook: "volatile", risk: "defined", level: "advanced", shape: "vol", desc: "同行权价买入两张看涨、一张看跌，偏向上涨的波动交易。" },

  { slug: "iron-condor", name: "铁鹰式", category: "Iron Condors & Butterflies", outlook: "neutral", risk: "defined", level: "intermediate", shape: "range", preset: "iron-condor", desc: "卖出一组看跌价差与看涨价差，在区间内收取权利金，风险有上限。" },
  { slug: "iron-butterfly", name: "铁蝶式", category: "Iron Condors & Butterflies", outlook: "neutral", risk: "defined", level: "intermediate", shape: "butterfly", preset: "iron-butterfly", desc: "平价卖出跨式并买入两侧保护，区间越窄收益越高。" },

  { slug: "broken-wing-butterfly", name: "破翼蝶式", category: "Butterflies & Ratios", outlook: "neutral", risk: "defined", level: "advanced", shape: "butterfly", desc: "买入两个不同宽度的蝶式，让一侧更靠近价内、另一侧更便宜。" },
  { slug: "unbalanced-butterfly", name: "不平衡蝶式", category: "Butterflies & Ratios", outlook: "neutral", risk: "defined", level: "advanced", shape: "butterfly", desc: "比例不对称的蝶式，以不同数量的腿换取更宽的盈亏区间。" },
  { slug: "ratio-call-spread", name: "看涨比例价差", category: "Butterflies & Ratios", outlook: "bullish", risk: "undefined", level: "advanced", shape: "rise", desc: "买入一张看涨、卖出多张更高行权价看涨，换取更大的上行空间。" },
  { slug: "ratio-put-spread", name: "看跌比例价差", category: "Butterflies & Ratios", outlook: "bearish", risk: "undefined", level: "advanced", shape: "fall", desc: "买入一张看跌、卖出多张更低行权价看跌，换取更大的下行空间。" },
  { slug: "backratio-call-spread", name: "逆比例看涨价差", category: "Butterflies & Ratios", outlook: "neutral", risk: "undefined", level: "advanced", shape: "rise", desc: "卖出一张看涨、买入多张更高行权价看涨，押注上破区间。" },
  { slug: "backratio-put-spread", name: "逆比例看跌价差", category: "Butterflies & Ratios", outlook: "neutral", risk: "undefined", level: "advanced", shape: "fall", desc: "卖出一张看跌、买入多张更低行权价看跌，押注跌破区间。" },

  { slug: "diagonal-spread", name: "对角价差", category: "Time & Diagonal", outlook: "neutral", risk: "defined", level: "intermediate", shape: "rise", desc: "买入远月期权、卖出近月期权，行权价与到期日都不同。" },
  { slug: "double-calendar", name: "双日历价差", category: "Time & Diagonal", outlook: "neutral", risk: "defined", level: "advanced", shape: "range", desc: "以不同到期日交易看涨与看跌两对日历价差。" },
  { slug: "double-diagonal", name: "双对角价差", category: "Time & Diagonal", outlook: "neutral", risk: "defined", level: "advanced", shape: "range", desc: "同时持有看涨与看跌对角价差，利用时间与行权价的差异。" },
  { slug: "poor-mans-covered-call", name: "穷人的备兑看涨（PMCC）", category: "Time & Diagonal", outlook: "bullish", risk: "defined", level: "advanced", shape: "rise", desc: "买入深度实值的长周期看涨，代替持股卖出短周期看涨。" },
  { slug: "poor-mans-covered-put", name: "穷人的备兑看跌", category: "Time & Diagonal", outlook: "bearish", risk: "defined", level: "advanced", shape: "fall", desc: "买入长期深度实值看跌代替做空股票，卖出短期看跌收取权利金。" },
  { slug: "calendar-spread", name: "日历价差", category: "Time & Diagonal", outlook: "neutral", risk: "defined", level: "beginner", shape: "range", preset: "calendar", desc: "买入远月期权、卖出近月同行权价期权，赚取时间衰减差。" },

  { slug: "synthetic-long-stock", name: "合成多头股票", category: "Synthetic", outlook: "bullish", risk: "undefined", level: "advanced", shape: "rise", desc: "买入看涨并卖出同行权价看跌，复制持有股票的多头敞口。" },
  { slug: "synthetic-short-stock", name: "合成空头股票", category: "Synthetic", outlook: "bearish", risk: "undefined", level: "advanced", shape: "fall", desc: "卖出看涨并买入同行权价看跌，复制做空股票的敞口。" },
  { slug: "synthetic-covered-call", name: "合成备兑看涨", category: "Synthetic", outlook: "bullish", risk: "undefined", level: "advanced", shape: "income", desc: "卖出一张看跌替代持股，再看涨期权收取权利金，构建无需持股的备兑头寸。" },
  { slug: "risk-reversal", name: "风险逆转", category: "Synthetic", outlook: "bullish", risk: "undefined", level: "advanced", shape: "rise", desc: "卖出看跌、买入看涨，用看跌的权利金为看涨买单。" },

  { slug: "jade-lizard", name: "玉蜥蜴", category: "Income & Credit", outlook: "neutral", risk: "undefined", level: "advanced", shape: "income", desc: "卖出现金担保看跌并叠加卖出一组看涨价差，下方没有保护、上方有保护。" },
  { slug: "big-lizard", name: "大蜥蜴", category: "Income & Credit", outlook: "neutral", risk: "undefined", level: "advanced", shape: "income", desc: "平价卖出看涨与看跌的组合，下方无保护、上方有保护。" },
  { slug: "reverse-jade-lizard", name: "反向玉蜥蜴", category: "Income & Credit", outlook: "neutral", risk: "undefined", level: "advanced", shape: "income", desc: "卖出看涨叠加看跌价差，下方有保护、上方无上限。" },
];

export const STRATEGY_BY_SLUG: Record<string, Strategy> = Object.fromEntries(
  STRATEGIES.map((s) => [s.slug, s]),
);

export const STARTER_ORDER = [
  "long-call",
  "covered-call",
  "cash-secured-put",
  "bull-call-spread",
  "iron-condor",
];

export const MOST_SEARCHED = ["covered-call", "cash-secured-put", "iron-condor", "bull-put-spread"];
