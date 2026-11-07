import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ArrowRight, Bars, ChartLine, ChevronRight, Star, Watchlist as WatchIcon } from "../components/Icons";
import { Footer } from "../components/Footer";
import { MarketingHeader } from "../components/MarketingHeader";
import { ticker } from "../data/tickers";

function MarketingPage({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />
      <main className="mx-auto max-w-[820px] px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">{title}</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[17px]">{lead}</p>
        <div className="mt-10 space-y-8 text-[14.5px] leading-relaxed text-muted">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export function Methodology() {
  return (
    <MarketingPage
      title="计算方法"
      lead="每个数字都说得出出处。这里写下报价时点、模型假设，以及概率与希腊值是怎么算出来的——你可以照着复核。"
    >
      <section>
        <h2 className="text-[18px] font-semibold text-text">报价与数据</h2>
        <p className="mt-2">
          页面里的价格是上一交易时段的延迟数据，不会在盘中实时刷新。期权价格由标的现价、行权价、
          剩余期限、无风险利率、股息率与隐含波动率共同决定，用 Black-Scholes-Merton 模型合成。
          合成报价带最小的买卖价差，仅用于情景分析，不代表任何交易所的可成交价格。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">定价模型</h2>
        <p className="mt-2">
          看涨与看跌都使用同一套假设：无风险利率取国债曲线上的 4.02%，股息率 1.03%，
          隐含波动率按行权价做偏斜修正——虚值看跌的波动率更高，虚值看涨略低。
          到期前每一天的价值都用剩余期限重新求值，所以“今日”曲线与“到期”曲线会分开画。
        </p>
        <div className="mt-4 rounded-lg border border-line bg-panel p-4">
          <p className="text-[12px] text-dim">看涨期权理论价值</p>
          <p className="mt-1.5 overflow-x-auto whitespace-nowrap font-code text-[13.5px] text-text">
            C = S·e<sup>−qT</sup>·N(d₁) − K·e<sup>−rT</sup>·N(d₂)
          </p>
          <p className="mt-3 text-[12px] text-dim">其中</p>
          <p className="mt-1.5 overflow-x-auto whitespace-nowrap font-code text-[13.5px] text-text">
            d₁ = [ln(S/K) + (r − q + σ²/2)·T] / (σ√T)，d₂ = d₁ − σ√T
          </p>
        </div>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">盈利概率与预期价值</h2>
        <p className="mt-2">
          盈利概率按风险中性测度下的对数正态分布积分：把到期价格分成 900 个等距区间，累加每个区间内
          落在盈利区的概率密度。每个盈亏平衡点附近再用二分法精修，避免网格误差。
          预期价值用同一组密度对到期盈亏加权求和——它不是预测，而是“在模型假设下平均能拿到多少”。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">希腊值</h2>
        <p className="mt-2">
          Delta、Gamma、Theta、Vega 与 Rho 都是整笔持仓的净美元敞口：Delta 表示标的变动 $1 时持仓价值的变化，
          Theta 表示每过一天的变化，Vega 表示隐含波动率变动 1 个百分点的变化，Rho 对应利率变动 1%。
          每条腿按自己的偏斜波动率求值，再按方向与数量加总。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">已知局限</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>模型假设波动率已知且恒定，真实市场的波动率会随价格与时间变化。</li>
          <li>没有考虑提前行权、股息派发时点与期权链的真实微观结构。</li>
          <li>合成报价不含佣金、交易所费用与滑点，实际成交价可能明显不同。</li>
          <li>概率与预期价值是模型输出，不保证任何真实结果；本应用不构成投资建议。</li>
        </ul>
      </section>
    </MarketingPage>
  );
}

export function Terms() {
  return (
    <MarketingPage title="条款" lead="使用本应用前，请先读这一页。简短版本：它是教育工具，不是投资建议。">
      <section>
        <h2 className="text-[18px] font-semibold text-text">用途</h2>
        <p className="mt-2">
          期权盈亏图用于学习与情景分析。所有价格、图表、概率与希腊值都是模型输出，
          不构成买卖任何证券或衍生品的建议、要约或招揽。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">风险</h2>
        <p className="mt-2">
          期权交易可能导致全部权利金损失，裸卖期权理论上亏损无上限。历史表现与模型输出都不预示未来结果。
          任何交易决定都由你自己做出并承担后果。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">数据</h2>
        <p className="mt-2">
          行情为延迟数据，可能不完整或不准确。保存的交易只存在你自己的设备上，我们不会收集你的持仓。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">责任限制</h2>
        <p className="mt-2">
          在适用法律允许的范围内，本应用不对因使用或无法使用本应用而产生的任何损失承担责任。
        </p>
      </section>
    </MarketingPage>
  );
}

export function Privacy() {
  return (
    <MarketingPage title="隐私" lead="不用账户，不建个人档案。你的交易只留在本机。">
      <section>
        <h2 className="text-[18px] font-semibold text-text">我们收集什么</h2>
        <p className="mt-2">
          本应用不需要注册，也不收集姓名、邮箱或券商账户信息。保存的交易、自选列表与偏好设置写入浏览器的本地存储，
          不会上传到服务器。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">分析</h2>
        <p className="mt-2">
          桌面版不包含第三方追踪脚本。若你通过网页版访问，基础访问日志可能由托管方保留，用于安全与故障排查。
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-text">删除数据</h2>
        <p className="mt-2">
          清空浏览器站点数据，或在应用内删除保存的交易，就会移除本机上的全部相关内容。
        </p>
      </section>
    </MarketingPage>
  );
}

export function Changelog() {
  const items = [
    { date: "2026 年 11 月", title: "中文版发布", body: "界面全中文，Tauri 2 桌面壳，构建、期权链、扫描与策略指南一并上线。" },
    { date: "2026 年 10 月", title: "净希腊值与 IV 排名", body: "分析面板加入美元计价的净希腊值；期权链带上 IV 排名与分位。" },
    { date: "2026 年 9 月", title: "41 个策略指南", body: "每个策略都有盈亏图、关键数字与一份算好的例子。" },
  ];
  return (
    <MarketingPage title="更新日志" lead="这个工具还在长。以下是最近几次改动。">
      <ol className="space-y-6">
        {items.map((it) => (
          <li key={it.title} className="border-l border-line pl-5">
            <p className="text-[12px] text-dim tnum">{it.date}</p>
            <h2 className="mt-1 text-[17px] font-semibold text-text">{it.title}</h2>
            <p className="mt-1.5">{it.body}</p>
          </li>
        ))}
      </ol>
    </MarketingPage>
  );
}

export function Trades() {
  return (
    <AppShell title="持仓">
      <div className="mx-auto max-w-[1000px] px-4 pb-24 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">持仓</h1>
          <Link to="/calculator" className="btn-primary h-8 px-3 text-[12.5px]">
            新建交易
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["未平仓盈亏", "$0.00", "还没有持仓"],
            ["本月权利金", "$0.00", "收与付相抵"],
            ["净 Theta", "$0/天", "按持仓合计"],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-xl border border-line bg-panel p-4">
              <p className="text-[11.5px] text-dim">{label}</p>
              <p className="mt-1 text-[20px] font-semibold tnum">{value}</p>
              <p className="mt-0.5 text-[10.5px] text-faint">{note}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-line bg-panel px-6 py-14 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-dim">
            <Bars size={20} />
          </span>
          <p className="mt-4 text-[15px] font-medium">还没有保存的交易</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
            在构建器里搭好一笔交易，点“保存”，它就会出现在这里，并按最新合成报价重估盈亏与 Theta。
          </p>
          <Link to="/calculator" className="btn-primary mt-5 h-9 px-4 text-[13px]">
            打开构建器
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-6">
          <h2 className="text-[13px] font-semibold">可能需要你处理</h2>
          <p className="mt-2 text-[12.5px] text-muted">保存交易后，接近行权价、到期日或触发规则的持仓会在这里列出。</p>
        </div>
      </div>
    </AppShell>
  );
}

export function Watchlist() {
  const list = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "AMD", "META", "AMZN"];
  return (
    <AppShell title="自选">
      <div className="mx-auto max-w-[1000px] px-4 pb-24 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">自选</h1>
          <span className="flex items-center gap-1 text-[11.5px] text-dim">
            <Star size={13} /> 只保存在本机
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
          <div className="grid grid-cols-[1fr_90px_90px_84px] gap-2 border-b border-line-subtle bg-surface/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-dim">
            <span>标的</span>
            <span className="text-right">现价</span>
            <span className="text-right">今日</span>
            <span className="text-right">IV 排名</span>
          </div>
          {list.map((sym) => {
            const t = ticker(sym);
            return (
              <Link
                key={sym}
                to={`/options-chain/${sym.toLowerCase()}`}
                className="grid grid-cols-[1fr_90px_90px_84px] items-center gap-2 border-b border-line-subtle px-3 py-2.5 text-[12.5px] last:border-0 hover:bg-hover/50"
              >
                <span className="flex items-center gap-2">
                  <WatchIcon size={13} className="text-faint" />
                  <span className="font-semibold">{sym}</span>
                  <span className="truncate text-[11px] text-dim">{t.name}</span>
                </span>
                <span className="text-right tnum">${t.spot.toFixed(2)}</span>
                <span className={`text-right tnum ${t.change >= 0 ? "text-profit" : "text-loss"}`}>
                  {t.change >= 0 ? "+" : "−"}
                  {Math.abs(t.changePct * 100).toFixed(2)}%
                </span>
                <span className="text-right text-dim tnum">{t.ivRank}</span>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-[11.5px] text-faint">示例自选列表。点任意一行查看它的期权链。</p>
      </div>
    </AppShell>
  );
}

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="text-center">
        <p className="font-code text-[12px] text-dim">404</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]">这一页没有画出来</h1>
        <p className="mt-2 text-[14px] text-muted">地址可能拼错了，或者这个策略还没写进指南。</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className="btn-primary h-10 px-4 text-[13.5px]">
            回到首页
          </Link>
          <Link to="/calculator" className="btn-secondary h-10 px-4 text-[13.5px]">
            打开构建器
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ToolsHub() {
  const tools = [
    ["/tools/black-scholes", "Black-Scholes 计算器", "输入现价、行权价、期限与波动率，得到理论价格与希腊值。", ChartLine],
    ["/tools/greeks-calculator", "希腊值计算器", "Delta、Gamma、Theta、Vega 与 Rho，换算成整笔持仓的美元敞口。", ChartLine],
    ["/tools/iv-calculator", "隐含波动率计算器", "从市场价格反解隐含波动率，看看报价里隐含了多少波动。", ChartLine],
    ["/tools/breakeven-calculator", "盈亏平衡计算器", "给定行权价与权利金，直接算出到期时的盈亏平衡点。", ChartLine],
    ["/tools/option-finder", "期权扫描", "按观点与到期日扫描整条链，排出候选交易。", ArrowRight],
  ] as const;
  return (
    <AppShell title="工具">
      <div className="mx-auto max-w-[900px] px-4 pb-24 pt-4 sm:px-6">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em]">工具</h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
          几个单独拿出来用也顺手的小工具。它们和构建器共用同一套模型与假设。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {tools.map(([href, title, body, Icon]) => (
            <Link
              key={href}
              to={href}
              className="group flex items-start gap-3 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-accent">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold group-hover:text-accent">{title}</span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{body}</span>
              </span>
              <ChevronRight size={14} className="ml-auto mt-2 text-faint" />
            </Link>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-line bg-panel p-5">
          <h2 className="text-[13px] font-semibold">关于这些数字</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            所有结果都是 Black-Scholes-Merton 模型输出，利率 4.02%、股息率 1.03%，
            波动率可以手动输入。模型不能预测未来，只能告诉你“在这些假设下值多少”。
          </p>
        </div>
      </div>
    </AppShell>
  );
}
