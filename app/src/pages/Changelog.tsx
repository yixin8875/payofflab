import { DetailScroll, PaneHeader } from "../desktop/Split";
import { VERSION } from "../desktop/nav";

const ENTRIES = [
  {
    version: "1.5.0",
    date: "2026-11-08",
    title: "Gamma 敞口（GEX）",
    latest: true,
    groups: [
      {
        label: "新增",
        items: [
          "新增「Gamma 敞口」页：按 CBOE 延迟链的 gamma 与未平仓量，计算每个行权价的美元 gamma（每 1% 价格波动的美元敞口）。",
          "展示总 GEX、Gamma 状态、Gamma Flip、Call Wall 与 Put Wall，以及按行权价展开的柱状图。",
          "支持全部到期、7 天内与指定到期日三种范围，并按到期日拆解贡献、列出 gamma 最集中的行权价。",
          "左栏复用自选与热门分组，可直接切换标的并刷新在线行情。",
        ],
      },
      {
        label: "变更",
        items: ["期权链与 Gamma 敞口共用同一套标的侧栏与自选分组。"],
      },
      {
        label: "构建",
        items: ["版本号提升到 1.5.0。"],
      },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-11-08",
    title: "更优雅的启动体验",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "启动时显示品牌载入画面：Logo、字标与细线扫描动画在应用就绪前铺满窗口，随后平滑淡出，消除冷启动白屏。",
          "尊重系统「减少动态效果」设置，开启后显示静态载入状态。",
        ],
      },
      {
        label: "变更",
        items: ["Tauri 窗口底色改为应用同款暖灰，WebView 首帧之前不再闪白。"],
      },
      {
        label: "构建",
        items: ["版本号提升到 1.4.1。"],
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-11-07",
    title: "真实持仓账本与实时期权扫描",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "「持仓」升级为实时持仓账本：按 CBOE 延迟行情逐腿估值，显示未实现、已实现与总盈亏，以及组合 Delta/Gamma/Theta/Vega 和市值。",
          "剩余期限按真实日历计算，保存的持仓会随时间自然衰减。",
          "支持按腿平仓与全部平仓，记录每次成交价和已实现盈亏；旧策略自动迁移为持仓。",
          "期权扫描器接入实时期权链，遍历真实挂牌行权价生成单腿、价差、铁鹰、铁蝶、蝶式、跨式与宽跨式候选。",
          "扫描按买价/卖价计算净权利金，支持三档流动性过滤，并按概率、风险回报、预期价值或净权利金排序。",
          "扫描结果可一键带入构建器，保留真实行权价与成交价。",
        ],
      },
      {
        label: "变更",
        items: [
          "情景分析只统计未平仓持仓，并按真实剩余期限估值。",
          "持仓页区分未平仓与已平仓，平仓记录保留在详情页。",
        ],
      },
      {
        label: "构建",
        items: ["版本号提升到 1.4.0。"],
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-11-07",
    title: "自选分组与自动更新",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "期权链侧栏新增「自选」区：收藏任意标的，并按主题分组展示，可直接进入对应期权链。",
          "标的页与期权链页新增「自选」菜单，可同时把标的放入多个分组，或现场新建分组。",
          "自选页支持分组管理：新建、改名、删除分组，添加或移除标的，全部保存在本机。",
          "设置新增「更新」页：启动时自动检查 GitHub Releases，也可手动检查、查看说明、下载安装并自动重启。",
        ],
      },
      {
        label: "变更",
        items: [
          "行情说明更新为 CBOE 延迟 15 分钟；在线不可用时仍会回退到合成数据。",
          "设置的数据页显示实际自选分组数与标的数。",
        ],
      },
      {
        label: "构建",
        items: [
          "新增 GitHub Actions 发布流程，推送 v* 标签后自动构建、签名并发布安装包与 latest.json。",
          "接入 Tauri updater 与 process 插件，更新包使用 minisign 公钥校验。",
          "版本号提升到 1.3.0。",
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-11-07",
    title: "在线期权行情",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "期权链与构建器接入 CBOE 延迟 15 分钟行情：全部到期日、真实买卖价、IV、Delta、成交量与未平仓量。",
          "搜索支持任意美股代码，未收录的标的也能直接在线查询。",
          "标的现价、涨跌幅与 30 天 IV 同步使用在线快照，已保存持仓按在线数据重新估值。",
          "期权链可在「在线 / 合成」间切换；在线不可用时自动回退并提示。",
          "构建器日期下拉支持全部在线到期日，新腿按真实买卖价成交并自动对齐挂牌行权价。",
        ],
      },
      {
        label: "修复",
        items: [
          "构建器顶部日期下拉框被裁切、无法完整展开。",
          "期权链 IV 被重复放大 100 倍。",
        ],
      },
      {
        label: "构建",
        items: ["版本号提升到 1.2.0，新增 Rust 侧行情请求命令。"],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-11-07",
    title: "组合情景分析",
    latest: false,
    groups: [
      {
        label: "新增",
        items: [
          "新增「情景分析」页：对全部已保存持仓做组合层压力测试。",
          "标的涨跌、IV 变化与时间推移三个滑块，实时重算组合盈亏与净希腊值。",
          "组合盈亏曲线同时显示当前与情景，并给出 ±20% 区间内的最好与最差结果。",
          "5×5 压力矩阵：标的 ±10% 与 IV ±10 点交叉，点击单元格即可套用。",
          "按持仓拆分的盈亏、变化、Delta 与 Vega 明细，可点击进入持仓详情。",
        ],
      },
      {
        label: "构建",
        items: ["版本号提升到 1.1.0，安装包与可执行文件名称保持不变。"],
      },
    ],
  },
  {
    version: "1.0.3",
    date: "2026-11-07",
    title: "单色字标",
    latest: false,
    groups: [
      {
        label: "变更",
        items: [
          "重绘品牌标识：参考 X 的几何字标，做了一枚带 45° 斜切的粗体 P。",
          "改为纯黑 / 白单色方案，去掉蓝白渐变与行权点插画。",
          "界面内使用纯黑字标，应用图标为黑底白标；标题栏、关于页与 favicon 同步更新。",
        ],
      },
      {
        label: "构建",
        items: [
          "版本号提升到 1.0.3，可执行文件名与安装包前缀保持不变。",
          "应用标识保持，PayoffLab 1.0.2 的本机数据继续可用。",
        ],
      },
    ],
  },
  {
    version: "1.0.2",
    date: "2026-11-07",
    title: "英文品牌与蓝白图标",
    latest: false,
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
