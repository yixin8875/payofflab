export type Density = "comfortable" | "compact";

export type AppSettings = {
  density: Density;
  rememberWindowSize: boolean;
};

const KEY = "payoff:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  density: "comfortable",
  rememberWindowSize: true,
};

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      rememberWindowSize: parsed.rememberWindowSize !== false,
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
