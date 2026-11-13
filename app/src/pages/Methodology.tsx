import { DetailScroll, PaneHeader } from "../desktop/Split";

const SECTIONS: { title: string; body: string; code?: string[]; list?: string[] }[] = [
  {
    title: "报价与数据",
    body: "期权链与构建器默认读取 CBOE 公开的延迟行情（约 15 分钟），包含全部挂牌到期日、行权价、买卖价、IV、Delta、成交量与未平仓量；标的现价与 30 天 IV 也来自同一份快照。网络不可用时会自动回退到本地合成报价。在线数据仍可能缺失或不准确，仅用于情景分析，不代表可成交价格。",
  },
  {
    title: "定价模型",
    body: "看涨与看跌使用同一套框架：无风险利率 4.02%、股息率 1.03%（全市场固定，未按标的拆分）。每条腿优先使用 CBOE 链上的真实 IV；没有报价时才回退到 IV30 加一条按行权价的经验偏斜。到期前每一天都用剩余期限重新求值，所以“今日”曲线与“到期”曲线分开画。r 与 q 固定是本模型的已知简化，对高股息或借券成本特殊的单票会偏高或偏低。",
    code: [
      "C = S·e^(−qT)·N(d₁) − K·e^(−rT)·N(d₂)",
      "d₁ = [ln(S/K) + (r − q + σ²/2)·T] / (σ√T)",
      "d₂ = d₁ − σ√T",
    ],
  },
  {
    title: "盈利概率与预期价值",
    body: "盈利概率按风险中性测度下的对数正态分布积分：把到期价格分成 900 个等距区间，累加每个区间内落在盈利区的概率密度。每个盈亏平衡点附近再用二分法精修，避免网格误差。预期价值用同一组密度对到期盈亏加权求和——它不是预测，而是“在模型假设下平均能拿到多少”。",
  },
  {
    title: "希腊值",
    body: "Delta、Gamma、Theta、Vega 与 Rho 都是整笔持仓的净美元敞口：Delta 表示标的变动 $1 时持仓价值的变化，Theta 表示每过一天的变化，Vega 表示隐含波动率变动 1 个百分点的变化，Rho 对应利率变动 1%。每条腿按自己的偏斜波动率求值，再按方向与数量加总。",
  },
  {
    title: "情景模型",
    body: "情景分析支持三种冲击：统一（所有标的同一百分比）、Beta 加权（大盘冲击 × 静态 beta）、逐标的（大盘冲击 + 每个标的的额外冲击）。beta 是相对 SPY 的静态近似值，不是回归结果；不同标的的相关性通过共同的大盘因子隐含，没有单独的相关性矩阵，也没有建模个股残差之间的联动。IV 冲击先按百分比压缩（IV crush），再叠加点数变化。组合盈亏曲线、压力矩阵与按标的风险表都按同一套冲击重算，美元 Gamma 取 Γ × S² × 0.01。",
  },
  {
    title: "费用、清算与保证金",
    body: "持仓页同时显示中间价盈亏与清算盈亏：平掉多头按买价、平掉空头按卖价，两者差额就是价差成本。费用默认每张合约每边 $0.69（佣金加交易所费用，可在设置里调整），往返费用 = 开仓 + 平仓。购买力估算按结构区分：定义风险结构按住行权价宽度减净权利金；裸卖按 Reg T 公式（标的 20% 减虚值额，下限为标的 10% / 行权价 10%）；跨到期日不互相覆盖，正股保证金不计入。它是估算，不是券商的真实保证金要求。",
  },
  {
    title: "事件日历",
    body: "财报日可以从纳斯达克公开日历自动同步：扫描未来 60 天，只保留持仓与自选标的，每天最多自动同步一次；手工条目优先，删除过的财报条目不会被重新加入。纳斯达克只公布已确认的日期，通常在财报前 2–6 周才会出现，因此更远的季度可能暂时为空；宏观、分红或日历未收录的事件仍需手工添加。所有事件只保存在本机，不会上传。构建器会提示当前到期日跨过的财报或宏观事件，持仓页也会在信息栏标出；情景分析提供“财报后 IV −30%”预设，按每条腿当前 IV 压缩后再叠加点数冲击。事件本身不会自动改变定价、概率或保证金。",
  },
  {
    title: "已知局限",
    body: "",
    list: [
      "模型假设波动率已知且恒定，真实市场的波动率会随价格与时间变化。",
      "没有考虑提前行权、股息派发时点与期权链的真实微观结构。",
      "在线行情延迟约 15 分钟，收盘后为最近一次快照；清算价按买卖价估算，滑点与经纪商实际费率仍可能有出入。",
      "beta 与相关性是静态近似，保证金是估算值，财报日可能改期或暂未公布；三者都不能替代券商或交易所的官方数据。",
      "概率与预期价值是模型输出，不保证任何真实结果；本应用不构成投资建议。",
    ],
  },
];

export default function Methodology() {
  return (
    <>
      <PaneHeader title="方法与假设" subtitle="每个数字都说得出出处" />
      <DetailScroll>
        <div className="max-w-[700px]">
          <p className="text-[14px] leading-5 text-muted">
            这里写下报价时点、模型假设，以及概率与希腊值是怎么算出来的——你可以照着复核。
          </p>
          <div className="mt-6 space-y-6">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-[14px] font-semibold">{section.title}</h2>
                {section.body && (
                  <p className="mt-1.5 text-[13px] leading-5 text-muted">{section.body}</p>
                )}
                {section.code && (
                  <div className="mt-2 rounded-xl border border-line bg-[#fbfaf8] px-3 py-2.5">
                    {section.code.map((line) => (
                      <p
                        key={line}
                        className="overflow-x-auto whitespace-nowrap font-code text-[12px] leading-6 text-text"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {section.list && (
                  <ul className="mt-1.5 space-y-1">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-2 text-[13px] leading-5 text-muted">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="mt-8 border-t border-line-subtle pt-4 text-[11px] text-faint">
            在线数据来自 CBOE 延迟行情 · 离线为合成报价 · 仅供情景分析 · 非投资建议
          </p>
        </div>
      </DetailScroll>
    </>
  );
}
