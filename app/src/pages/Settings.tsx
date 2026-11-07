import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/Brand";
import { Command, Info, Lock, Settings as SettingsIcon, Sun } from "../components/Icons";
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

const SECTIONS = [
  { key: "general", label: "通用", hint: "窗口与数据", icon: SettingsIcon },
  { key: "appearance", label: "外观", hint: "密度与主题", icon: Sun },
  { key: "data", label: "数据", hint: "本机存储", icon: Lock },
  { key: "shortcuts", label: "快捷键", hint: "键盘操作", icon: Command },
  { key: "about", label: "关于", hint: "版本与声明", icon: Info },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function Settings() {
  const [active, setActive] = useState<SectionKey>("general");
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const [hasWindowSize, setHasWindowSize] = useState(() => {
    try {
      return Boolean(localStorage.getItem("payoff:window-size"));
    } catch {
      return false;
    }
  });
  const trades = useTrades();
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
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-line bg-white text-dim">
                      <Icon size={14} />
                    </span>
                  }
                  title={item.label}
                  subtitle={item.hint}
                />
              );
            })}
          </ListGroup>
          <div className="mx-3 mt-2 text-[10.5px] leading-4 text-faint">
            设置保存在本机，不会同步到任何账户。
          </div>
        </ListPane>
      }
    >
      <PaneHeader title={section.label} subtitle={section.hint} />
      <DetailScroll>
        <div className="max-w-[620px]">
          {active === "general" && (
            <div className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-3">
                <div>
                  <p className="text-[12.5px] font-medium">记住窗口大小</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-dim">
                    下次启动时恢复上次的窗口尺寸与位置。重新启动后生效。
                  </p>
                </div>
                <Toggle
                  checked={settings.rememberWindowSize}
                  onChange={(value) => update({ rememberWindowSize: value })}
                  label="记住窗口大小"
                />
              </div>
              <InfoRow title="启动页面" value="概览" note="桌面版固定从工作台开始" />
              <InfoRow title="行情数据" value="延迟行情" note="按上一交易时段合成，非实时" />
              <InfoRow title="语言" value="简体中文" note="界面与模型说明均为中文" />
            </div>
          )}

          {active === "appearance" && (
            <div className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center justify-between gap-6 border-b border-line-subtle px-4 py-3">
                <div>
                  <p className="text-[12.5px] font-medium">列表密度</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-dim">
                    紧凑模式会缩短列表行高，一屏看到更多策略与标的。
                  </p>
                </div>
                <div className="flex shrink-0 rounded-md border border-line bg-surface p-0.5">
                  {[
                    ["comfortable", "舒适"],
                    ["compact", "紧凑"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ density: value as AppSettings["density"] })}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
                  <p className="text-[12.5px] font-medium">主题</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-dim">
                    浅色主题，暖灰侧边栏与白色详情面板。
                  </p>
                </div>
                <span className="flex items-center gap-2 text-[11.5px] text-dim">
                  浅色
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[9.5px] text-faint">
                    深色即将推出
                  </span>
                </span>
              </div>
              <InfoRow title="强调色" value="1Password 蓝" note="#0364D3" />
            </div>
          )}

          {active === "data" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-line bg-white">
                <InfoRow title="保存的策略" value={`${trades.length} 笔`} note="保存于本机 localStorage" />
                <InfoRow title="自选列表" value="8 个标的" note="示例列表，仅保存在本机" />
                <InfoRow
                  title="窗口尺寸"
                  value={hasWindowSize ? "已记录" : "未记录"}
                  note={hasWindowSize ? "可在下方清除" : "调整窗口后自动记录"}
                />
              </div>
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="text-[12.5px] font-medium">本机数据</p>
                <p className="mt-1 text-[11px] leading-4 text-dim">
                  所有持仓、自选与设置都留在你的设备上，不会上传。清除后无法恢复。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!trades.length) return;
                      if (window.confirm("删除全部已保存的策略？")) clearTrades();
                    }}
                    disabled={!trades.length}
                    className="btn-secondary h-7 px-2.5 disabled:opacity-40"
                  >
                    删除保存的策略
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

          {active === "shortcuts" && (
            <div className="overflow-hidden rounded-lg border border-line bg-white">
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
                    <p className="text-[12px] font-medium">{title}</p>
                    <p className="mt-0.5 text-[10.5px] text-dim">{note}</p>
                  </div>
                  <kbd className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[10.5px] text-muted">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {active === "about" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-center gap-3">
                  <BrandMark size={40} />
                  <div>
                    <p className="text-[14px] font-semibold">PayoffLab</p>
                    <p className="text-[11px] text-dim">中文期权策略工作台 · v{VERSION}</p>
                  </div>
                </div>
                <p className="mt-3 text-[11.5px] leading-5 text-muted">
                  多腿期权构建器、盈亏图、盈利概率与净希腊值。行情为延迟数据，期权价格由
                  Black-Scholes-Merton 模型合成，仅用于情景分析，不构成投资建议。
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-line bg-white">
                <LinkRow to="/changelog" title="更新日志" note="这个版本改了什么" />
                <LinkRow to="/methodology" title="方法与假设" note="定价、概率与希腊值的算法" />
                <LinkRow to="/terms" title="使用条款" note="教育工具，不是投资建议" />
                <LinkRow to="/privacy" title="隐私" note="不收集数据，一切留在本机" />
              </div>
              <p className="px-1 text-[10.5px] text-faint">© 2026 PayoffLab · Tauri 2 + React 19</p>
            </div>
          )}
        </div>
      </DetailScroll>
    </Split>
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
        <p className="text-[12px] font-medium">{title}</p>
        <p className="mt-0.5 text-[10.5px] text-dim">{note}</p>
      </div>
      <span className="shrink-0 text-[11.5px] text-muted">{value}</span>
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
        <p className="text-[12px] font-medium">{title}</p>
        <p className="mt-0.5 text-[10.5px] text-dim">{note}</p>
      </div>
      <span className="shrink-0 text-[11px] text-faint">打开</span>
    </Link>
  );
}
