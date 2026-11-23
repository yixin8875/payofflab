import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "./Icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <Card
      aria-live="polite"
      className="fixed bottom-[34px] right-4 z-[80] w-[340px] gap-0 p-3 shadow-lg"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Download size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {update.status === "available" && `发现新版本 v${update.version}`}
            {update.status === "downloading" && `正在下载 v${update.version}`}
            {update.status === "ready" && `v${update.version} 已安装`}
            {update.status === "error" && `更新 v${update.version} 未完成`}
          </p>
          <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs leading-4 text-muted-foreground">
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
        <Progress className="mt-2.5" value={percent ?? 12} />
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {update.status === "available" && (
          <Button size="sm" onClick={() => void update.install()}>
            下载并安装
          </Button>
        )}
        {update.status === "error" && (
          <Button size="sm" onClick={() => void update.install()}>
            重试
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          render={<Link to="/settings?section=update" />}
          onClick={() => setDismissed(true)}
        >
          更新详情
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-auto cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {update.status === "ready" ? "关闭" : "稍后"}
        </button>
      </div>
    </Card>
  );
}
