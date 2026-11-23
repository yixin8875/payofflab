import { useEffect, useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Lock } from "../components/Icons";
import { UpdateToast } from "../components/UpdateToast";
import { usMarketStatus } from "../lib/market";
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
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className="block h-full min-h-0 w-full"
      style={{ "--sidebar-width": "var(--sidebar-w)" } as CSSProperties}
    >
      <div className="app-window">
        <TitleBar
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />
        <div className="app-body">
          {sidebarOpen && <Sidebar />}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <Outlet />
          </main>
        </div>
        <StatusBar />
        <UpdateToast />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </SidebarProvider>
  );
}

function StatusBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const market = usMarketStatus(now);

  return (
    <footer className="flex h-[var(--statusbar-h)] shrink-0 items-center gap-4 border-t bg-muted/40 px-3 text-xs text-muted-foreground">
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${market.open ? "bg-profit" : "bg-muted-foreground/40"}`}
        />
        {market.label}
        <span className="hidden text-muted-foreground sm:inline">· {market.detail}</span>
      </span>
      <span className="hidden truncate md:inline">行情延迟 15 分钟 · CBOE</span>
      <span className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden lg:inline">Black-Scholes · r 4.02% · q 1.03%</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Lock size={11} />
          本机数据
        </span>
        <span className="tnum text-muted-foreground">v{VERSION}</span>
      </span>
    </footer>
  );
}
