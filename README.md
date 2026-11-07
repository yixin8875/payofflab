# 权图 QuanTu

中文期权策略工作台：构建多腿持仓、看到期盈亏图、盈利概率与净希腊值。桌面应用，数据全部留在本机。

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

- 免安装程序：`app/src-tauri/target/release/quantu.exe`
- NSIS 安装包：`app/src-tauri/target/release/bundle/nsis/权图_1.0.1_x64-setup.exe`
- MSI 安装包：`app/src-tauri/target/release/bundle/msi/权图_1.0.1_x64_zh-CN.msi`

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
