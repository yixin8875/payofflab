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

## 自动更新

- 桌面版启动时会检查 GitHub Releases；发现新版本后在右下角提示，可下载安装并自动重启。
- 自动更新依赖 NSIS 安装版；直接运行免安装 exe 时建议手动替换新版本。
- 发布流程由 `.github/workflows/release.yml` 完成：推送 `v*` 标签后，GitHub Actions 会构建、签名并发布安装包与 `latest.json`。
- 仓库需要配置两个 Actions Secrets：`TAURI_SIGNING_PRIVATE_KEY`（私钥文件内容）与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（私钥密码）。
- 本机签名私钥位于 `~/.payofflab/payofflab-updater.key`，不要提交到仓库；客户端内置对应公钥，签名不匹配的更新包会被拒绝。

发布新版本时，先同步修改 `app/package.json`、`app/src-tauri/Cargo.toml`、`app/src-tauri/tauri.conf.json` 与 `app/src/desktop/nav.ts` 中的版本号，提交后执行：

```bash
git tag v1.4.0
git push origin v1.4.0
```

## 技术栈

- **界面**：React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **桌面壳**：Tauri 2（Windows WebView2）
- **安装包**：NSIS / MSI，产物在 `app/src-tauri/target/release/bundle/`

## 开发

```bash
cd app
npm install
npm run dev          # 浏览器预览 http://localhost:1420
npm run tauri dev    # 带桌面窗口的开发模式
```

## 构建

```bash
cd app
npm run build                    # 类型检查 + 前端产物
npm run tauri build              # 桌面安装包与 exe
```

## 产物

- 免安装程序：`app/src-tauri/target/release/payofflab.exe`
- NSIS 安装包：`app/src-tauri/target/release/bundle/nsis/PayoffLab_1.4.0_x64-setup.exe`
- MSI 安装包：`app/src-tauri/target/release/bundle/msi/PayoffLab_1.4.0_x64_zh-CN.msi`
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
