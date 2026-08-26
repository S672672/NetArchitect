import { create } from "zustand";
import { Theme, AppSettings } from "@/types";
import { getSettings, saveSettings } from "@/lib/storage/database";

interface SettingsState extends AppSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "system",
  autosaveEnabled: true,
  autosaveDelay: 2000,
  validationEnabled: true,
  showGrid: true,
  snapToGrid: false,
  gridSize: 15,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await getSettings();
      set({ ...settings, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  setTheme: (theme: Theme) => {
    set({ theme });
    applyTheme(theme);
    const state = get() as SettingsState;
    saveSettings({
      theme,
      autosaveEnabled: state.autosaveEnabled,
      autosaveDelay: state.autosaveDelay,
      validationEnabled: state.validationEnabled,
      showGrid: state.showGrid,
      snapToGrid: state.snapToGrid,
      gridSize: state.gridSize,
    });
  },

  updateSettings: (updates) => {
    set(updates);
    const state = get() as SettingsState;
    saveSettings({
      theme: state.theme,
      autosaveEnabled: state.autosaveEnabled,
      autosaveDelay: state.autosaveDelay,
      validationEnabled: state.validationEnabled,
      showGrid: state.showGrid,
      snapToGrid: state.snapToGrid,
      gridSize: state.gridSize,
    });
  },
}));

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}
