import { Link, useParams } from "react-router-dom";
import { ChartLine, Sigma, Target } from "../components/Icons";
import {
  EmptyDetail,
  ListGroup,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import { ToolDetail, type ToolMode } from "./ToolPage";

const MODE_BY_PATH: Record<string, ToolMode> = {
  "black-scholes": "bs",
  "greeks-calculator": "greeks",
  "iv-calculator": "iv",
  "breakeven-calculator": "breakeven",
};

const TOOLS = [
  { mode: "bs" as const, to: "/tools/black-scholes", title: "Black-Scholes 计算器", subtitle: "理论价格、内在价值与时间价值", icon: ChartLine },
  { mode: "greeks" as const, to: "/tools/greeks-calculator", title: "希腊值计算器", subtitle: "Delta、Gamma、Theta、Vega 与 Rho", icon: Sigma },
  { mode: "iv" as const, to: "/tools/iv-calculator", title: "隐含波动率计算器", subtitle: "从市场价格反解 IV", icon: Sigma },
  { mode: "breakeven" as const, to: "/tools/breakeven-calculator", title: "盈亏平衡计算器", subtitle: "到期不赚不亏的价格", icon: Target },
];

export default function Tools() {
  const { mode } = useParams<{ mode?: string }>();
  const active = mode ? MODE_BY_PATH[mode] : undefined;

  return (
    <Split
      list={
        <ListPane title="工具箱" count={5}>
          <ListGroup label="计算器">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <ListRow
                  key={tool.mode}
                  to={tool.to}
                  selected={active === tool.mode}
                  badge={
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-dim">
                      <Icon size={14} />
                    </span>
                  }
                  title={tool.title}
                  subtitle={tool.subtitle}
                />
              );
            })}
            <ListRow
              to="/tools/option-finder"
              badge={
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-dim">
                  <Target size={14} />
                </span>
              }
              title="期权扫描"
              subtitle="按观点扫描实时期权链"
            />
          </ListGroup>
          <div className="mx-3 mt-1 text-[11px] leading-4 text-faint">
            所有工具共用同一套 Black-Scholes 假设；扫描器读取在线期权链。
          </div>
        </ListPane>
      }
    >
      {active ? (
        <ToolDetail key={active} mode={active} />
      ) : (
        <>
          <PaneHeader title="工具箱" subtitle="独立计算器，共用同一套模型" />
          <EmptyDetail
            title="选择一个工具"
            body="每个计算器都可以单独使用；也可以从构建器里带着持仓过来对照。"
            action={
              <Link to="/calculator" className="btn-secondary h-8 px-3">
                打开构建器
              </Link>
            }
          />
        </>
      )}
    </Split>
  );
}
