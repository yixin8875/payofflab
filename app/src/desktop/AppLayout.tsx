import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Lock } from "../components/Icons";
import { UpdateToast } from "../components/UpdateToast";
import { maybeAutoCheck } from "../lib/updater";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { VERSION } from "./nav";
import { applySettings, readSettings } from "./settings";
import { restoreSavedWindowSize, trackWindowSize } from "./window";

export default function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const settings = readSettings();
    applySettings(settings);
    maybeAutoCheck();
    if (settings.rememberWindowSize) {
      void restoreSavedWindowSize();
      return trackWindowSize();
    }
    return undefined;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPaletteOpen(false);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (key === "b") {
        event.preventDefault();
        setSidebarOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-window">
      <TitleBar
        onOpenPalette={() => setPaletteOpen(true)}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />
      <div className="app-body">
        {sidebarOpen && <Sidebar />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-chrome">
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <UpdateToast />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function StatusBar() {
  return (
    <footer className="flex h-[var(--statusbar-h)] shrink-0 items-center gap-4 border-t border-line bg-[#f7f5f1] px-3 text-[10.5px] text-dim">
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#b8b3aa]" />
        市场已收盘
        <span className="hidden text-faint sm:inline">· 2 天 7 小时后开盘</span>
      </span>
      <span className="hidden truncate md:inline">SPY 行情 美东 4:14 PM · 延迟 15 分钟</span>
      <span className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden lg:inline">Black-Scholes · r 4.02% · q 1.03%</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Lock size={10} />
          本机数据
        </span>
        <span className="tnum text-faint">v{VERSION}</span>
      </span>
    </footer>
  );
}
