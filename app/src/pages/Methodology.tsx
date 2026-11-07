import { DetailScroll, PaneHeader } from "../desktop/Split";

const SECTIONS: { title: string; body: string; code?: string[]; list?: string[] }[] = [
  {
    title: "报价与数据",
    body: "期权链与构建器默认读取 CBOE 公开的延迟行情（约 15 分钟），包含全部挂牌到期日、行权价、买卖价、IV、Delta、成交量与未平仓量；标的现价与 30 天 IV 也来自同一份快照。网络不可用时会自动回退到本地合成报价。在线数据仍可能缺失或不准确，仅用于情景分析，不代表可成交价格。",
  },
  {
    title: "定价模型",
    body: "看涨与看跌都使用同一套假设：无风险利率取国债曲线上的 4.02%，股息率 1.03%，隐含波动率按行权价做偏斜修正——虚值看跌的波动率更高，虚值看涨略低。到期前每一天的价值都用剩余期限重新求值，所以“今日”曲线与“到期”曲线会分开画。",
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
    title: "已知局限",
    body: "",
    list: [
      "模型假设波动率已知且恒定，真实市场的波动率会随价格与时间变化。",
      "没有考虑提前行权、股息派发时点与期权链的真实微观结构。",
      "在线行情延迟约 15 分钟，收盘后为最近一次快照；离线合成报价不含佣金、交易所费用与滑点。",
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
          <p className="text-[13px] leading-5 text-muted">
            这里写下报价时点、模型假设，以及概率与希腊值是怎么算出来的——你可以照着复核。
          </p>
          <div className="mt-6 space-y-6">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-[13px] font-semibold">{section.title}</h2>
                {section.body && (
                  <p className="mt-1.5 text-[12px] leading-5 text-muted">{section.body}</p>
                )}
                {section.code && (
                  <div className="mt-2 rounded-lg border border-line bg-[#fbfaf8] px-3 py-2.5">
                    {section.code.map((line) => (
                      <p
                        key={line}
                        className="overflow-x-auto whitespace-nowrap font-code text-[11.5px] leading-6 text-text"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {section.list && (
                  <ul className="mt-1.5 space-y-1">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-2 text-[12px] leading-5 text-muted">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="mt-8 border-t border-line-subtle pt-4 text-[10.5px] text-faint">
            在线数据来自 CBOE 延迟行情 · 离线为合成报价 · 仅供情景分析 · 非投资建议
          </p>
        </div>
      </DetailScroll>
    </>
  );
}
