"use client";

import { useSettingsStore } from "@/stores/settingsStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useSettingsStore();

  const cycle = () => {
    const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    setTheme(next);
  };

  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";

  return (
    <button
      onClick={cycle}
      className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md border border-border hover:bg-muted transition-colors ${className}`}
      title={`Theme: ${label} — click to switch`}
      aria-label={`Switch theme (currently ${label})`}
    >
      <span>{icon}</span>
      <span className="text-xs hidden sm:inline">{label}</span>
    </button>
  );
}
