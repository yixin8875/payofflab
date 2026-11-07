import { Link } from "react-router-dom";
import { Brand } from "./Brand";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "产品",
    links: [
      { label: "构建", href: "/calculator" },
      { label: "期权链", href: "/options-chain" },
      { label: "扫描", href: "/tools/option-finder" },
      { label: "持仓", href: "/trades" },
      { label: "自选", href: "/watchlist" },
    ],
  },
  {
    title: "学习",
    links: [
      { label: "全部策略", href: "/strategies" },
      { label: "备兑看涨", href: "/strategies/covered-call" },
      { label: "现金担保看跌", href: "/strategies/cash-secured-put" },
      { label: "铁鹰式", href: "/strategies/iron-condor" },
      { label: "牛市看涨价差", href: "/strategies/bull-call-spread" },
      { label: "计算方法", href: "/methodology" },
    ],
  },
  {
    title: "工具",
    links: [
      { label: "Black-Scholes", href: "/tools/black-scholes" },
      { label: "希腊值", href: "/tools/greeks-calculator" },
      { label: "隐含波动率", href: "/tools/iv-calculator" },
      { label: "盈亏平衡", href: "/tools/breakeven-calculator" },
      { label: "全部工具", href: "/tools" },
    ],
  },
  {
    title: "期权链",
    links: [
      { label: "SPY 期权", href: "/options-chain/spy" },
      { label: "QQQ 期权", href: "/options-chain/qqq" },
      { label: "AAPL 期权", href: "/options-chain/aapl" },
      { label: "TSLA 期权", href: "/options-chain/tsla" },
      { label: "NVDA 期权", href: "/options-chain/nvda" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-line bg-panel">
      <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-12 sm:px-6 sm:pt-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="lg:w-[320px] lg:shrink-0">
            <Brand />
            <p className="mt-4 text-[14px] leading-relaxed text-muted">
              基于延迟行情数据的免费期权分析。无需账户，没有付费墙。
            </p>
          </div>
          <nav
            aria-label="页脚"
            className="grid flex-1 grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:gap-y-8"
          >
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="text-[13px] font-semibold text-text">{col.title}</h2>
                <ul className="mt-5 space-y-[17px]">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.href}
                        className="block text-[14px] leading-[17px] text-muted transition-colors duration-150 hover:text-text"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className="mt-12 max-w-4xl text-[12.5px] leading-relaxed text-dim">
          非投资建议。期权盈亏图用于教育与情景分析。期权存在风险，并非适合所有投资者；部分策略的亏损可能超过建仓成本。
          行情数据最多延迟 15 分钟，模型输出（到期前价格、希腊值、概率）均为估算值，不是预测。
          任何一次下单之前，请自己核对合约、价格与数量。
        </p>

        <div className="mt-6 flex flex-col gap-y-3 border-t border-line pt-6 text-[13px] text-dim sm:flex-row sm:items-center sm:gap-y-0">
          <span>© 2026 期权盈亏图</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:ml-auto">
            <Link to="/terms" className="transition-colors hover:text-text">条款</Link>
            <Link to="/privacy" className="transition-colors hover:text-text">隐私</Link>
            <Link to="/methodology" className="transition-colors hover:text-text">计算方法</Link>
            <Link to="/changelog" className="transition-colors hover:text-text">更新日志</Link>
            <button type="button" className="transition-colors hover:text-text">
              报告问题
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
