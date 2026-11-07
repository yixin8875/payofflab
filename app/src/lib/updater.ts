import { useEffect, useState } from "react";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { readSettings } from "../desktop/settings";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "downloading"
  | "ready"
  | "error"
  | "unsupported";

export type UpdateState = {
  status: UpdateStatus;
  version?: string;
  notes?: string;
  date?: string;
  progress?: number;
  error?: string;
  checkedAt?: number;
};

const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let state: UpdateState = { status: "idle" };
let pending: Update | null = null;
let autoStarted = false;
const listeners = new Set<() => void>();

function emit(patch: Partial<UpdateState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function useUpdater() {
  const [snapshot, setSnapshot] = useState<UpdateState>(state);

  useEffect(() => {
    const sync = () => setSnapshot(state);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return {
    ...snapshot,
    supported: isTauri(),
    check: checkForUpdates,
    install: installUpdate,
  };
}

export async function checkForUpdates(silent = false): Promise<void> {
  if (!isTauri()) {
    emit({ status: "unsupported", error: "自动更新仅在桌面版中可用" });
    return;
  }
  if (state.status === "checking" || state.status === "downloading") return;

  emit({ status: "checking", error: undefined });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update) {
      pending = update;
      emit({
        status: "available",
        version: update.version,
        notes: update.body,
        date: update.date,
        progress: undefined,
        checkedAt: Date.now(),
      });
    } else {
      pending = null;
      emit({
        status: "current",
        version: undefined,
        notes: undefined,
        date: undefined,
        progress: undefined,
        checkedAt: Date.now(),
      });
    }
  } catch (error) {
    // A silent startup check should never take over the UI; Settings still shows it.
    emit({
      status: "error",
      error: silent
        ? "启动时检查更新失败，可稍后在设置中重试"
        : error instanceof Error
          ? error.message
          : "检查更新失败",
      checkedAt: Date.now(),
    });
  }
}

export async function installUpdate(): Promise<void> {
  if (!pending || state.status === "downloading") return;

  let received = 0;
  let total = 0;
  emit({ status: "downloading", progress: 0, error: undefined });

  try {
    await pending.downloadAndInstall((event: DownloadEvent) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        received += event.data.chunkLength;
        emit({ progress: total > 0 ? Math.min(1, received / total) : undefined });
      } else {
        emit({ progress: 1 });
      }
    });
  } catch (error) {
    emit({
      status: "error",
      error: error instanceof Error ? error.message : "下载或安装更新失败",
    });
    return;
  }

  emit({ status: "ready", progress: 1 });
  try {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch {
    emit({ status: "ready", error: "更新已安装，请手动重启 PayoffLab" });
  }
}

/** Called once from the app shell; respects the user's startup-check setting. */
export function maybeAutoCheck() {
  if (autoStarted) return;
  autoStarted = true;
  if (!isTauri() || readSettings().autoCheckUpdates === false) return;
  void checkForUpdates(true);
}
