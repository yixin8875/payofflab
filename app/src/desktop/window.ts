const SIZE_KEY = "payoff:window-size";

/** True inside the Tauri webview; false in a plain browser preview. */
export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function currentWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export async function minimizeWindow() {
  if (!isTauriRuntime()) return;
  try {
    (await currentWindow()).minimize();
  } catch {
    // Window controls are cosmetic in browser preview.
  }
}

export async function toggleMaximizeWindow(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    const win = await currentWindow();
    const maximized = await win.isMaximized();
    if (maximized) await win.unmaximize();
    else await win.maximize();
    return !maximized;
  } catch {
    return false;
  }
}

export async function closeWindow() {
  if (!isTauriRuntime()) return;
  try {
    await (await currentWindow()).close();
  } catch {
    // Ignore.
  }
}

export async function fetchMaximized(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    return await (await currentWindow()).isMaximized();
  } catch {
    return false;
  }
}

export async function restoreSavedWindowSize() {
  if (!isTauriRuntime()) return;
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { w?: number; h?: number };
    if (!saved.w || !saved.h || saved.w < 900 || saved.h < 600) return;
    const { LogicalSize } = await import("@tauri-apps/api/window");
    const win = await currentWindow();
    await win.setSize(new LogicalSize(Math.round(saved.w), Math.round(saved.h)));
    await win.center();
  } catch {
    // A failed restore is harmless; the configured default size stays.
  }
}

/** Persist the window's logical size after the user finishes resizing. */
export function trackWindowSize(): () => void {
  if (!isTauriRuntime()) return () => undefined;

  let disposed = false;
  let timer: number | undefined;
  let unlisten: (() => void) | undefined;

  void (async () => {
    try {
      const win = await currentWindow();
      unlisten = await win.onResized(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          void (async () => {
            try {
              if (await win.isMaximized()) return;
              const size = await win.innerSize();
              const scale = await win.scaleFactor();
              localStorage.setItem(
                SIZE_KEY,
                JSON.stringify({
                  w: Math.round(size.width / scale),
                  h: Math.round(size.height / scale),
                }),
              );
            } catch {
              // Ignore transient sizing errors.
            }
          })();
        }, 450);
      });
      if (disposed) unlisten();
    } catch {
      // No window API in browser preview.
    }
  })();

  return () => {
    disposed = true;
    window.clearTimeout(timer);
    unlisten?.();
  };
}

export function clearSavedWindowSize() {
  try {
    localStorage.removeItem(SIZE_KEY);
  } catch {
    // Ignore.
  }
}
