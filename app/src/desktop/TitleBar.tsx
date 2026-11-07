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
        className="flex w-[var(--sidebar-w)] shrink-0 items-center gap-1.5 border-b border-line bg-canvas pl-2 pr-3"
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          className="icon-btn h-6 w-6"
          title="折叠侧边栏 (Ctrl+B)"
          aria-label="折叠侧边栏"
        >
          <PanelLeft size={15} />
        </button>
        <BrandMark size={20} />
        <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">期权盈亏图</span>
        <span className="ml-auto rounded border border-line bg-white/60 px-1 py-px text-[9px] font-medium tracking-wide text-dim">
          桌面版
        </span>
      </div>

      {/* Navigation, search, actions, window controls */}
      <div className="flex min-w-0 flex-1 items-stretch border-b border-line bg-white">
        <div data-tauri-drag-region="deep" className="flex items-center gap-0.5 pl-2">
          <button
            type="button"
            disabled={!canBack}
            onClick={() => navigate(-1)}
            className="icon-btn h-7 w-7"
            title="后退"
            aria-label="后退"
          >
            <ArrowLeft size={15} />
          </button>
          <button
            type="button"
            disabled={!canForward}
            onClick={() => navigate(1)}
            className="icon-btn h-7 w-7"
            title="前进"
            aria-label="前进"
          >
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-3">
          <button
            type="button"
            onClick={onOpenPalette}
            className="flex h-[30px] w-full max-w-[420px] items-center gap-2 rounded-md border border-transparent bg-[#f2f0ec] px-2.5 text-left text-[12px] text-faint transition-colors hover:border-line hover:bg-[#f7f5f1]"
            aria-label="打开搜索"
          >
            <Search size={14} className="shrink-0" />
            <span className="truncate">在 期权盈亏图 中搜索</span>
            <kbd className="ml-auto shrink-0 rounded border border-line bg-white px-1 py-px font-sans text-[9.5px] text-faint">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 pr-1">
          <Link to="/methodology" className="btn-ghost hidden h-7 gap-1 px-2 md:inline-flex">
            <Help size={13} />
            帮助
          </Link>
          <Link to="/calculator" className="btn-soft h-[26px] px-2.5">
            <Plus size={12} />
            新建策略
          </Link>
        </div>

        <div className="flex shrink-0 items-stretch border-l border-line/70">
          <button
            type="button"
            onClick={() => void minimizeWindow()}
            className="flex w-[46px] items-center justify-center text-[#4a4640] transition-colors hover:bg-black/[0.06]"
            title="最小化"
            aria-label="最小化"
          >
            <span className="h-px w-[10px] bg-current" />
          </button>
          <button
            type="button"
            onClick={() => void toggleMaximizeWindow().then(setMaximized)}
            className="flex w-[46px] items-center justify-center text-[#4a4640] transition-colors hover:bg-black/[0.06]"
            title={maximized ? "还原" : "最大化"}
            aria-label={maximized ? "还原" : "最大化"}
          >
            {maximized ? <Restore size={12} /> : <Maximize size={11} />}
          </button>
          <button
            type="button"
            onClick={() => void closeWindow()}
            className="flex w-[46px] items-center justify-center text-[#4a4640] transition-colors hover:bg-[#c42b1c] hover:text-white"
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
