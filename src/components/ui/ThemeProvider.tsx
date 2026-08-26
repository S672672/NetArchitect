"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, loadSettings, isLoaded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle("dark", isDark);
    };

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(media.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme, isLoaded]);

  return <>{children}</>;
}
