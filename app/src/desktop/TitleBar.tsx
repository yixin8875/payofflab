import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/Brand";
import {
  ArrowLeft,
  ArrowRight,
  Help,
  Maximize,
  PanelLeft,
  Plus,
  Restore,
  Search,
  X,
} from "../components/Icons";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { closeWindow, fetchMaximized, minimizeWindow, toggleMaximizeWindow } from "./window";

export function TitleBar({
  onOpenPalette,
  onToggleSidebar,
}: {
  onOpenPalette: () => void;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [maximized, setMaximized] = useState(false);
  const maxIdx = useRef(0);

  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > maxIdx.current) maxIdx.current = idx;
  const canBack = idx > 0;
  const canForward = idx < maxIdx.current;

  useEffect(() => {
    void fetchMaximized().then(setMaximized);
  }, [location.pathname]);

  return (
    <header
      data-tauri-drag-region="deep"
      className="flex h-[var(--titlebar-h)] shrink-0 select-none"
    >
      {/* Brand, aligned with the sidebar */}
      <div
        data-tauri-drag-region="deep"
        className="flex w-[var(--sidebar-w)] shrink-0 items-center gap-1.5 border-b border-sidebar-border bg-sidebar pl-2 pr-3"
      >
        <Button
          type="button"
          onClick={onToggleSidebar}
          variant="ghost"
          size="icon-sm"
          title="折叠侧边栏 (Ctrl+B)"
          aria-label="折叠侧边栏"
        >
          <PanelLeft size={15} />
        </Button>
        <BrandMark size={20} />
        <span className="truncate text-sm font-semibold">PayoffLab</span>
      </div>

      {/* Navigation, search, actions, window controls */}
      <div className="flex min-w-0 flex-1 items-stretch border-b bg-background">
        <div data-tauri-drag-region="deep" className="flex items-center gap-0.5 pl-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canBack}
            onClick={() => navigate(-1)}
            title="后退"
            aria-label="后退"
          >
            <ArrowLeft size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canForward}
            onClick={() => navigate(1)}
            title="前进"
            aria-label="前进"
          >
            <ArrowRight size={15} />
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-3">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenPalette}
            className="h-8 w-full max-w-[420px] justify-start gap-2 px-2.5 font-normal text-muted-foreground"
            aria-label="打开搜索"
          >
            <Search size={15} className="shrink-0" />
            <span className="truncate">搜索页面与标的</span>
            <Kbd className="ml-auto shrink-0">Ctrl K</Kbd>
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1 pr-1">
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-1 md:inline-flex"
            render={<Link to="/methodology" />}
          >
            <Help size={13} />
            帮助
          </Button>
          <Button size="sm" render={<Link to="/calculator" />}>
            <Plus size={12} />
            新建策略
          </Button>
        </div>

        <div className="flex shrink-0 items-stretch border-l border-border/70">
          <button
            type="button"
            onClick={() => void minimizeWindow()}
            className="flex w-[46px] items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="最小化"
            aria-label="最小化"
          >
            <span className="h-px w-[10px] bg-current" />
          </button>
          <button
            type="button"
            onClick={() => void toggleMaximizeWindow().then(setMaximized)}
            className="flex w-[46px] items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={maximized ? "还原" : "最大化"}
            aria-label={maximized ? "还原" : "最大化"}
          >
            {maximized ? <Restore size={12} /> : <Maximize size={11} />}
          </button>
          <button
            type="button"
            onClick={() => void closeWindow()}
            className="flex w-[46px] items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
            title="关闭"
            aria-label="关闭"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}
