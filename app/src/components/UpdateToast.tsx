import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "./Icons";
import { useUpdater } from "../lib/updater";

export function UpdateToast() {
  const update = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [update.version, update.status]);

  const visible =
    !dismissed &&
    (update.status === "available" ||
      update.status === "downloading" ||
      update.status === "ready" ||
      (update.status === "error" && Boolean(update.version)));

  if (!visible) return null;

  const percent = update.progress != null ? Math.round(update.progress * 100) : null;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-[34px] right-4 z-[80] w-[340px] rounded-lg border border-line bg-white p-3 shadow-[0_14px_40px_rgba(30,25,18,0.18)]"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Download size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold">
            {update.status === "available" && `发现新版本 v${update.version}`}
            {update.status === "downloading" && `正在下载 v${update.version}`}
            {update.status === "ready" && `v${update.version} 已安装`}
            {update.status === "error" && `更新 v${update.version} 未完成`}
          </p>
          <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[10.5px] leading-4 text-dim">
            {update.status === "available" &&
              (update.notes?.trim() || "包含最新修复与改进。")}
            {update.status === "downloading" &&
              (percent != null ? `已完成 ${percent}%，安装后会自动重启。` : "下载中，安装后会自动重启。")}
            {update.status === "ready" && (update.error ?? "正在重启 PayoffLab…")}
            {update.status === "error" && (update.error ?? "请稍后重试。")}
          </p>
        </div>
      </div>

      {update.status === "downloading" && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#ece8e2]">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${percent ?? 12}%` }}
          />
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {update.status === "available" && (
          <button
            type="button"
            onClick={() => void update.install()}
            className="btn-primary h-7 px-2.5"
          >
            下载并安装
          </button>
        )}
        {update.status === "error" && (
          <button
            type="button"
            onClick={() => void update.install()}
            className="btn-primary h-7 px-2.5"
          >
            重试
          </button>
        )}
        <Link
          to="/settings?section=update"
          onClick={() => setDismissed(true)}
          className="btn-ghost h-7 px-2 text-muted"
        >
          更新详情
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-auto text-[10.5px] text-faint hover:text-text"
        >
          {update.status === "ready" ? "关闭" : "稍后"}
        </button>
      </div>
    </aside>
  );
}
