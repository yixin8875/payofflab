# PayoffLab

中文期权策略工作台：构建多腿持仓、看到期盈亏图、盈利概率与净希腊值。桌面应用，持仓与设置全部留在本机。

远程仓库：[github.com/yixin8875/payofflab](https://github.com/yixin8875/payofflab)

## 行情

- 期权链与构建器默认读取 CBOE 公开的延迟行情（约 15 分钟），包含全部到期日与挂牌行权价。
- 网络不可用时自动回退到本地合成报价，可在期权链页面手动切换「在线 / 合成」。
- 所有计算都在本机完成，不上传持仓或设置。

## 自选

- 期权链左侧的「自选」区按分组展示收藏标的，点击即可进入对应期权链。
- 在标的页或期权链页点「自选」，可同时加入多个分组，也可以现场新建分组。
- 「自选」页支持新建、改名、删除分组，以及添加或移除标的；数据保存在本机 `localStorage`。

## 持仓

- 「持仓」按 CBOE 延迟行情逐腿估值，显示未实现/已实现盈亏、组合希腊值与当前市值。
- 剩余期限按真实日历计算，保存的策略会随时间自然衰减。
- 支持按腿平仓和全部平仓，记录成交价与已实现盈亏；旧版本保存的策略会自动迁移。

## 期权扫描

- 扫描器遍历真实挂牌行权价，生成单腿、垂直价差、铁鹰、铁蝶、蝶式、跨式与宽跨式候选。
- 买入按卖价、卖出按买价计算净权利金，可按严格/标准/宽松三档过滤流动性。
- 结果可按概率、风险回报、预期价值或净权利金排序，并一键带入构建器。

## Gamma 敞口

- 「Gamma 敞口」按 CBOE 延迟链中的 gamma 与未平仓量，计算每个行权价的美元 gamma（标的每变动 1% 的美元敞口）。
- 展示总 GEX、Gamma 状态、Gamma Flip、Call Wall 与 Put Wall，以及按行权价展开的柱状图。
- 「行权价 × 到期日」热力图把净 Gamma 拆成二维矩阵，绿正红负，支持 ±5% / ±10% / ±20% 行权价窗口；悬停看明细，点击到期日列头可直接切换到该到期日的统计。
- 「现价移动后的 Gamma Profile」用 Black-Scholes 把每条腿重算到现价上下各 10% 的 33 个假设价位，标出现价与零 Gamma 穿越点，用来推算墙与 Flip 在标的移动后会偏移到哪里。
- 「Gamma 期限结构」按到期日显示净 Gamma 柱状图，并给出 0DTE、7 天内与 30 天内的 Gamma 占比，区分“今天到期”与“远月沉淀”的结构差异。
- 口径开关：权重可在未平仓量与成交量之间切换，行权价可只看平值 ±20%，单位可在每 1% 与每 1 点之间切换；热力图、Profile 与柱状图会同步跟随。
- 墙的稳健性：Call Wall / Put Wall 附带 ±2 档厚度，多穿越时 Gamma Flip 显示为区间而非单点，并给出前 5 档集中度与 Call/Put Gamma 比。
- 「二阶敞口」用各腿 IV 计算 Vanna（delta 对 IV 的敏感度，按每 1 个波动点）与 Charm（delta 每天的时间衰减），可按行权价查看分布并给出净敞口。
- 「IV 冲击下的结构」把每条腿的 IV 同比例缩放 0.7× / 1.3× 后重算 gamma，对比总 GEX、Gamma Flip、两侧墙的位置与强度以及集中度，用来判断财报后墙是否还站得住。
- 可开启 1 分钟或 5 分钟自动刷新（页面不在前台时暂停），并在总 GEX 下方显示相对上次刷新的变化。
- 统计范围支持全部到期、7 天内与指定到期日，并可按到期日拆解贡献。
- 采用 naive GEX 口径（看涨为正、看跌为负）；未平仓量为上一交易日收盘值，仅供市场结构参考。
- 实战读法、盘前流程与案例见 [GEX 实战教学](docs/GEX-实战指南.md)。
- 完全新手？从 [GEX 新手图解（HTML，带动画）](docs/gex-newbie-guide.html) 开始；下载后用浏览器打开。

## 波动率曲面

- 「波动率曲面」按 CBOE 延迟链的每条腿 IV 展示 ATM 期限结构、25Δ 偏斜、风险逆转与蝶式。
- 期限斜率使用最接近 90 天的到期日，避免远月 LEAPS 扭曲。
- 看涨与看跌使用同一套 Black-Scholes 框架，并按每条腿的真实 IV 定价与计算希腊值。

## 情景分析

- 支持统一、Beta 加权与逐标的三种冲击模式，内置“大盘 +5% / 单票 −10%”“财报后 IV −30%”等预设。
- 显示按标的的美元 Gamma/Vega、Beta 加权 Delta 与压力矩阵。
- IV 冲击先按百分比压缩，再叠加点数变化；所有结果都是模型估算。

## 事件日历

- 可从纳斯达克公开日历自动同步未来 60 天的已确认财报日，只保留持仓与自选标的。
- 手工条目优先，删除的财报条目不会在下次同步时重新出现。
- 构建器、持仓与情景分析会提示到期日跨过的财报或宏观事件；事件只保存在本机。

## 自动更新

- 桌面版启动时会检查 GitHub Releases；发现新版本后在右下角提示，可下载安装并自动重启。
- 自动更新依赖 NSIS 安装版；直接运行免安装 exe 时建议手动替换新版本。
- 发布流程由 `.github/workflows/release.yml` 完成：推送 `v*` 标签后，GitHub Actions 会构建、签名并发布安装包与 `latest.json`。
- 仓库需要配置两个 Actions Secrets：`TAURI_SIGNING_PRIVATE_KEY`（私钥文件内容）与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（私钥密码）。
- 本机签名私钥位于 `~/.payofflab/payofflab-updater.key`，不要提交到仓库；客户端内置对应公钥，签名不匹配的更新包会被拒绝。

发布新版本时，先同步修改 `app/package.json`、`app/src-tauri/Cargo.toml`、`app/src-tauri/tauri.conf.json` 与 `app/src/desktop/nav.ts` 中的版本号，提交后执行：

```bash
git tag v1.8.0
git push origin v1.8.0
```

## 技术栈

- **界面**：React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + [coss/ui](https://coss.com/ui)（Base UI）
- **桌面壳**：Tauri 2（Windows WebView2）
- **安装包**：NSIS / MSI，产物在 `app/src-tauri/target/release/bundle/`

## 开发

```bash
cd app
npm install
npm run dev          # 浏览器预览 http://localhost:1420
npm run tauri dev    # 带桌面窗口的开发模式
npm test             # 单元测试（136 个用例）
npm run test:coverage # 语句覆盖率报告（src/lib）
```

## 构建

```bash
cd app
npm run build                    # 类型检查 + 前端产物
npm run tauri build              # 桌面安装包与 exe
```

## 产物

- 免安装程序：`app/src-tauri/target/release/payofflab.exe`
- NSIS 安装包：`app/src-tauri/target/release/bundle/nsis/PayoffLab_1.8.0_x64-setup.exe`
- MSI 安装包：`app/src-tauri/target/release/bundle/msi/PayoffLab_1.8.0_x64_zh-CN.msi`
- 更新包：安装包同目录的 `.sig` 签名文件，由发布流程上传。

## 目录

```
app/
  src/                 界面源码
    desktop/           桌面外壳：标题栏、侧边栏、列表栏、命令面板
    pages/             各功能页
    components/        图表、图标等共享组件
    lib/               期权定价、盈亏分析、格式化
    data/              标的、到期日、策略数据
  src-tauri/           Tauri 配置与 Rust 入口
CHANGELOG.md           更新日志
```
