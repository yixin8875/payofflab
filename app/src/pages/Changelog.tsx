import { DetailScroll, PaneHeader } from "../desktop/Split";
import { VERSION } from "../desktop/nav";

const ENTRIES = [
  {
    version: "1.0.2",
    date: "2026-11-07",
    title: "英文品牌与蓝白图标",
    latest: true,
    groups: [
      {
        label: "变更",
        items: [
          "产品更名为 PayoffLab，中文副标题仍为「中文期权策略工作台」。",
          "图标改为蓝白小清新：天空蓝渐变底、白色盈亏曲线与白色行权节点。",
          "标题栏、设置「关于」、使用条款、favicon、窗口与安装包图标同步更新。",
        ],
      },
      {
        label: "构建",
        items: [
          "可执行文件重命名为 payofflab.exe，安装包前缀改为「PayoffLab_1.0.2」。",
          "应用标识保持不变，已保存的策略、自选与设置升级后照常读取。",
        ],
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-11-07",
    title: "品牌焕新",
    latest: false,
    groups: [
      {
        label: "变更",
        items: [
          "产品更名为「权图 QuanTu」，副标题仍为「中文期权策略工作台」。",
          "全新应用标识：蓝色渐变圆角块、奶白盈亏曲线与金色行权节点。",
          "窗口、任务栏、开始菜单与安装包图标同步换新；界面内加入矢量 logo 与 favicon。",
          "标题栏、设置「关于」卡片、使用条款与搜索占位符改用新名称。",
        ],
      },
      {
        label: "构建",
        items: [
          "可执行文件重命名为 quantu.exe，安装包前缀改为「权图_1.0.1」。",
          "保留原有应用标识，已保存的策略、自选与设置升级后照常读取。",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-11-07",
    title: "桌面版",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "无系统边框的桌面窗口：可拖拽标题栏、最小化 / 最大化 / 关闭按钮。",
          "1Password 风格三栏布局：侧边栏、列表栏、白色详情面板。",
          "全局命令面板（Ctrl K），可跳转页面、工具、策略与标的。",
          "侧边栏折叠（Ctrl B），把宽度让给盈亏图与期权链。",
          "构建器支持把多腿持仓保存到本机（Ctrl S），并在「持仓」中重新估值。",
          "概览页读取本机保存的策略，按今天 / 昨天 / 日期分组。",
          "设置页：列表密度、窗口尺寸记忆、本机数据清理与快捷键表。",
          "应用内更新日志、方法与假设、使用条款与隐私页。",
        ],
      },
      {
        label: "变更",
        items: [
          "移除营销首页、页脚与移动端底部导航，启动后直接进入概览。",
          "统一为暖灰 + 蓝色强调的桌面配色，正文密度调整为 12–13px。",
          "策略库改为列表 + 详情阅读视图，41 篇指南全部保留。",
          "期权链、自选、持仓、工具箱都改为桌面双栏。",
          "路由切换到哈希模式，窗口刷新或深链都不会丢页面。",
        ],
      },
      {
        label: "构建",
        items: [
          "Tauri 2 打包为 Windows 安装包（NSIS + MSI），关闭系统标题栏。",
          "版本号提升到 1.0.0，仓库开始记录更新日志。",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-11-07",
    title: "初始版本",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "多腿期权构建器、盈亏图、净希腊值与盈利概率。",
          "41 个中文策略指南，每个都有示例持仓与关键数字。",
          "99 个热门标的的合成期权链，以及按观点排序的期权扫描。",
          "Black-Scholes、希腊值、隐含波动率与盈亏平衡四个独立计算器。",
        ],
      },
    ],
  },
];

export default function Changelog() {
  return (
    <>
      <PaneHeader title="更新日志" subtitle={`当前版本 v${VERSION}`} />
      <DetailScroll>
        <div className="max-w-[700px]">
          <p className="text-[12px] leading-5 text-muted">
            所有值得记录的改动都写在这里，仓库根目录的 CHANGELOG.md 与之对应。
          </p>
          <div className="mt-5 space-y-7">
            {ENTRIES.map((entry) => (
              <section key={entry.version}>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
                    v{entry.version} · {entry.title}
                  </h2>
                  {entry.latest && (
                    <span className="rounded-full border border-accent-line bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-medium text-accent">
                      当前
                    </span>
                  )}
                  <span className="ml-auto text-[10.5px] text-faint tnum">{entry.date}</span>
                </div>
                <div className="mt-2.5 space-y-3 border-l border-line pl-4">
                  {entry.groups.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-faint">
                        {group.label}
                      </h3>
                      <ul className="mt-1 space-y-1">
                        {group.items.map((item) => (
                          <li key={item} className="flex gap-2 text-[12px] leading-5 text-muted">
                            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </DetailScroll>
    </>
  );
}
