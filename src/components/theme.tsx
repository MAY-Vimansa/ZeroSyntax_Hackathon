"use client";
import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  parseTheme,
  resolveTheme,
  THEME_COOKIE,
  THEME_EVENT,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

function persistTheme(theme: Theme) {
  try {
    document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* The current tab still works if persistence is blocked. */
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* Cookies remain usable if localStorage is unavailable. */
  }
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  persistTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
function getSnapshot(): Theme {
  return parseTheme(document.documentElement.dataset.theme) ?? DEFAULT_THEME;
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY && parseTheme(event.newValue))
      applyTheme(parseTheme(event.newValue)!);
  };
  const restore = () => {
    const cookie = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${THEME_COOKIE}=`))
      ?.split("=")[1];
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* Optional persistence. */
    }
    const theme = resolveTheme(cookie, stored);
    if (theme !== getSnapshot()) applyTheme(theme);
  };
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", storage);
  window.addEventListener("pageshow", restore);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", storage);
    window.removeEventListener("pageshow", restore);
  };
}
export function useTheme(initialTheme: Theme) {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialTheme,
  );
  return {
    theme,
    toggleTheme: () => applyTheme(getSnapshot() === "dark" ? "light" : "dark"),
  };
}
