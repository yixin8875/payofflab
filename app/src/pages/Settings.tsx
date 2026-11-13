import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BrandMark } from "../components/Brand";
import {
  Command,
  Download,
  Info,
  Lock,
  Settings as SettingsIcon,
  Sun,
} from "../components/Icons";
import {
  DetailScroll,
  ListGroup,
  ListPane,
  ListRow,
  PaneHeader,
  Split,
} from "../desktop/Split";
import { VERSION } from "../desktop/nav";
import { readSettings, writeSettings, type AppSettings } from "../desktop/settings";
import { clearSavedWindowSize } from "../desktop/window";
import { clearTrades, useTrades } from "../lib/store";
import { useUpdater } from "../lib/updater";
import { countSymbols, useWatchlist } from "../lib/watchlist";

const SECTIONS = [
  { key: "general", label: "通用", hint: "窗口与数据", icon: SettingsIcon },
  { key: "appearance", label: "外观", hint: "密度与主题", icon: Sun },
  { key: "data", label: "数据", hint: "本机存储", icon: Lock },
  { key: "update", label: "更新", hint: "版本与自动更新", icon: Download },
  { key: "shortcuts", label: "快捷键", hint: "键盘操作", icon: Command },
  { key: "about", label: "关于", hint: "版本与声明", icon: Info },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function Settings() {
  const [params] = useSearchParams();
  const requested = params.get("section");
  const [active, setActive] = useState<SectionKey>(() =>
    SECTIONS.some((section) => section.key === requested)
      ? (requested as SectionKey)
      : "general",
  );
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const [hasWindowSize, setHasWindowSize] = useState(() => {
    try {
      return Boolean(localStorage.getItem("payoff:window-size"));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (requested && SECTIONS.some((item) => item.key === requested)) {
      setActive(requested as SectionKey);
    }
  }, [requested]);
  const trades = useTrades();
  const watchlist = useWatchlist();
  const watchCount = countSymbols(watchlist);
  const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0];

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeSettings(next);
  };

  const clearAll = () => {
    if (!window.confirm("清除本机保存的全部数据？此操作无法撤销。")) return;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("payoff:")) localStorage.removeItem(key);
    }
    window.location.reload();
  };

  return (
    <Split
      list={
        <ListPane title="设置" count={SECTIONS.length}>
          <ListGroup label="PayoffLab">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <ListRow
                  key={item.key}
                  onSelect={() => setActive(item.key)}
                  selected={active === item.key}
                  badge={
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-dim">
                      <Icon size={14} />
                    </span>
                  }
                  title={item.label}
                  subtitle={item.hint}
                />
              );
            })}
          </ListGroup>
          <div className="mx-3 mt-2 text-[11px] leading-4 text-faint">
            设置保存在本机，不会同步到任何账户。
          </div>
        </ListPane>
      }
    >
      <PaneHeader title={section.label} subtitle={section.hint} />
      <DetailScroll>
        <div className="max-w-[620px]">
          {active === "general" && (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">记住窗口大小</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-dim">
                    下次启动时恢复上次的窗口尺寸与位置。重新启动后生效。
                  </p>
                </div>
                <Toggle
                  checked={settings.rememberWindowSize}
                  onChange={(value) => update({ rememberWindowSize: value })}
                  label="记住窗口大小"
                />
              </div>
              <div className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">每张合约费用</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-dim">
                    单边佣金加交易所费用，用于持仓页的往返费用与净盈亏估算。
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[12px] text-dim">
                  $
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={settings.commissionPerContract}
                    onChange={(event) =>
                      update({
                        commissionPerContract: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    aria-label="每张合约费用"
                    className="h-7 w-16 rounded border border-line bg-white px-1.5 text-right text-[12px] tnum outline-none focus:border-accent"
                  />
                </span>
              </div>
              <InfoRow title="启动页面" value="概览" note="桌面版固定从工作台开始" />
              <InfoRow
                title="行情数据"
                value="CBOE 延迟 15 分钟"
                note="在线不可用时自动回退合成数据"
              />
              <InfoRow title="语言" value="简体中文" note="界面与模型说明均为中文" />
            </div>
          )}

          {active === "appearance" && (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">列表密度</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-dim">
                    紧凑模式会缩短列表行高，一屏看到更多策略与标的。
                  </p>
                </div>
                <div className="flex shrink-0 rounded-lg border border-line bg-surface p-0.5">
                  {[
                    ["comfortable", "舒适"],
                    ["compact", "紧凑"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ density: value as AppSettings["density"] })}
                      className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        settings.density === value
                          ? "bg-white text-text shadow-sm"
                          : "text-dim hover:text-text"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">主题</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-dim">
                    浅色主题，暖灰侧边栏与白色详情面板。
                  </p>
                </div>
                <span className="flex items-center gap-2 text-[12px] text-dim">
                  浅色
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-faint">
                    深色即将推出
                  </span>
                </span>
              </div>
              <InfoRow title="强调色" value="1Password 蓝" note="#0364D3" />
            </div>
          )}

          {active === "data" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <InfoRow
                  title="持仓记录"
                  value={`${trades.length} 笔`}
                  note="含未平仓与已平仓，保存在本机"
                />
                <InfoRow
                  title="自选分组"
                  value={`${watchlist.length} 组 · ${watchCount} 个标的`}
                  note="按主题分组，仅保存在本机"
                />
                <InfoRow
                  title="窗口尺寸"
                  value={hasWindowSize ? "已记录" : "未记录"}
                  note={hasWindowSize ? "可在下方清除" : "调整窗口后自动记录"}
                />
              </div>
              <div className="rounded-xl border border-line bg-white p-4">
                <p className="text-[13px] font-medium">本机数据</p>
                <p className="mt-1 text-[12px] leading-4 text-dim">
                  所有持仓、自选与设置都留在你的设备上，不会上传。清除后无法恢复。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!trades.length) return;
                      if (window.confirm("删除全部持仓与平仓记录？")) clearTrades();
                    }}
                    disabled={!trades.length}
                    className="btn-secondary h-7 px-2.5 disabled:opacity-40"
                  >
                    删除全部持仓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearSavedWindowSize();
                      setHasWindowSize(false);
                      window.alert("已清除窗口尺寸记录，下次启动会使用默认大小。");
                    }}
                    className="btn-secondary h-7 px-2.5"
                  >
                    重置窗口尺寸
                  </button>
                  <button type="button" onClick={clearAll} className="btn-ghost h-7 px-2 text-loss">
                    清除全部本地数据
                  </button>
                </div>
              </div>
            </div>
          )}

          {active === "update" && (
            <UpdatePanel
              autoCheck={settings.autoCheckUpdates}
              onAutoCheck={(value) => update({ autoCheckUpdates: value })}
            />
          )}

          {active === "shortcuts" && (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              {[
                ["Ctrl K", "全局搜索", "页面、策略、标的与工具"],
                ["Ctrl B", "折叠侧边栏", "给内容区更多宽度"],
                ["Ctrl S", "保存当前策略", "在构建器中"],
                ["↑ ↓", "选择结果", "在搜索面板中"],
                ["Enter", "打开选中项", "在搜索面板中"],
                ["Esc", "关闭面板", "搜索或在输入框中"],
              ].map(([keys, title, note]) => (
                <div
                  key={keys}
                  className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-2.5 last:border-0"
                >
                  <div>
                    <p className="text-[13px] font-medium">{title}</p>
                    <p className="mt-0.5 text-[11px] text-dim">{note}</p>
                  </div>
                  <kbd className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[11px] text-muted">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {active === "about" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-3">
                  <BrandMark size={40} />
                  <div>
                    <p className="text-[14px] font-semibold">PayoffLab</p>
                    <p className="text-[12px] text-dim">中文期权策略工作台 · v{VERSION}</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-muted">
                  多腿期权构建器、盈亏图、盈利概率与净希腊值。在线行情为 CBOE 延迟 15 分钟
                  数据，离线时回退合成报价；所有结果仅用于情景分析，不构成投资建议。
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <LinkRow to="/changelog" title="更新日志" note="这个版本改了什么" />
                <LinkRow to="/methodology" title="方法与假设" note="定价、概率与希腊值的算法" />
                <LinkRow to="/terms" title="使用条款" note="教育工具，不是投资建议" />
                <LinkRow to="/privacy" title="隐私" note="不收集数据，一切留在本机" />
              </div>
              <p className="px-1 text-[11px] text-faint">© 2026 PayoffLab · Tauri 2 + React 19</p>
            </div>
          )}
        </div>
      </DetailScroll>
    </Split>
  );
}

function UpdatePanel({
  autoCheck,
  onAutoCheck,
}: {
  autoCheck: boolean;
  onAutoCheck: (value: boolean) => void;
}) {
  const update = useUpdater();
  const percent = update.progress != null ? Math.round(update.progress * 100) : null;
  const busy = update.status === "checking" || update.status === "downloading";
  const checked = update.checkedAt
    ? new Date(update.checkedAt).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">当前版本 v{VERSION}</p>
            <p className="mt-0.5 text-[12px] leading-4 text-dim">
              从 GitHub Releases 获取更新，下载完成后会自动重启。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void update.check()}
            disabled={busy}
            className="btn-secondary h-7 px-2.5 disabled:opacity-40"
          >
            {update.status === "checking" ? "检查中…" : "检查更新"}
          </button>
        </div>

        {update.status !== "idle" && (
          <p
            className={`mt-3 text-[12px] leading-4 ${
              update.status === "error" ? "text-loss" : "text-dim"
            }`}
          >
            {update.status === "unsupported"
              ? "网页预览不检查更新；安装桌面版后可自动更新。"
              : update.status === "checking"
                ? "正在连接 GitHub 检查版本…"
                : update.status === "current"
                  ? "已是最新版本。"
                  : update.status === "available"
                    ? "发现新版本，可以下载安装。"
                    : update.status === "downloading"
                      ? `正在下载${percent != null ? ` ${percent}%` : ""}…`
                      : update.status === "ready"
                        ? "更新已安装，正在重启…"
                        : (update.error ?? "检查更新失败")}
          </p>
        )}
        {checked && update.status !== "idle" && update.status !== "available" && (
          <p className="mt-1 text-[11px] text-faint">上次检查 {checked}</p>
        )}

        {update.status === "available" && (
          <div className="mt-3 rounded-lg border border-accent-line bg-accent-soft/50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-accent">新版本 v{update.version}</p>
              <button
                type="button"
                onClick={() => void update.install()}
                className="btn-primary h-7 px-2.5"
              >
                下载并安装
              </button>
            </div>
            {update.notes && (
              <p className="mt-1.5 whitespace-pre-line text-[11px] leading-4 text-dim">
                {update.notes}
              </p>
            )}
          </div>
        )}

        {update.status === "downloading" && (
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#ece8e2]">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${percent ?? 12}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-6 rounded-xl border border-line bg-white px-4 py-3">
        <div>
          <p className="text-[13px] font-medium">启动时检查更新</p>
          <p className="mt-0.5 text-[12px] leading-4 text-dim">
            每次打开 PayoffLab 时向 GitHub 检查一次，发现新版本会在右下角提示。
          </p>
        </div>
        <Toggle checked={autoCheck} onChange={onAutoCheck} label="启动时检查更新" />
      </div>

      <div className="rounded-xl border border-line bg-white p-4 text-[11px] leading-4 text-faint">
        更新包由 GitHub Actions 使用 minisign 私钥签名，客户端内置公钥校验；签名不匹配的包不会安装。
        <a
          href="https://github.com/yixin8875/payofflab/releases"
          target="_blank"
          rel="noreferrer"
          className="ml-1 font-medium text-accent hover:underline"
        >
          查看 Releases
        </a>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`h-[18px] w-[30px] shrink-0 rounded-full p-[2px] transition-colors ${
        checked ? "bg-accent" : "bg-[#d5d0c8]"
      }`}
    >
      <span
        className={`block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-3" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function InfoRow({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line-subtle px-4 py-2.5 last:border-0">
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] text-dim">{note}</p>
      </div>
      <span className="shrink-0 text-[12px] text-muted">{value}</span>
    </div>
  );
}

function LinkRow({ to, title, note }: { to: string; title: string; note: string }) {
  return (
    <Link
      to={to}
      className="flex items-baseline justify-between gap-6 border-b border-line-subtle px-4 py-2.5 last:border-0 hover:bg-hover"
    >
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] text-dim">{note}</p>
      </div>
      <span className="shrink-0 text-[12px] text-faint">打开</span>
    </Link>
  );
}
