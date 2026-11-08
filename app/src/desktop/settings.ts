export type Density = "comfortable" | "compact";

export type AppSettings = {
  density: Density;
  rememberWindowSize: boolean;
  autoCheckUpdates: boolean;
  /** All-in cost per contract per side, in dollars. */
  commissionPerContract: number;
};

const KEY = "payoff:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  density: "comfortable",
  rememberWindowSize: true,
  autoCheckUpdates: true,
  commissionPerContract: 0.69,
};

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      rememberWindowSize: parsed.rememberWindowSize !== false,
      autoCheckUpdates: parsed.autoCheckUpdates !== false,
      commissionPerContract:
        typeof parsed.commissionPerContract === "number" &&
        Number.isFinite(parsed.commissionPerContract) &&
        parsed.commissionPerContract >= 0
          ? parsed.commissionPerContract
          : DEFAULT_SETTINGS.commissionPerContract,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function applySettings(settings: AppSettings) {
  document.documentElement.dataset.density = settings.density;
}

export function writeSettings(settings: AppSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in locked-down webviews; the app still runs.
  }
  applySettings(settings);
}
