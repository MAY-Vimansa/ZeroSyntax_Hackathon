"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Toaster, toast } from "sonner";
import { browserDb } from "@/lib/supabase/client";
import {
  translate,
  categoryNames,
  locales,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { useTheme } from "./theme";
import type { Theme } from "@/lib/theme";
type AppState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: MessageKey) => string;
  categoryName: (key: string) => string;
  profile: Profile | null;
  authLoading: boolean;
  refreshProfile: () => Promise<void>;
  location: { lat: number; lng: number } | null;
  locating: boolean;
  enableLocation: () => void;
  clearLocation: () => void;
  money: (n: number) => string;
  date: (d: string) => string;
  time: (d: string) => string;
  report: (e: unknown) => void;
};
const Context = createContext<AppState | null>(null);
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.code ?? "REQUEST_FAILED");
  return body.data;
}
export function Provider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const { theme, toggleTheme } = useTheme(initialTheme);
  const [locale, setLang] = useState<Locale>("en"),
    [profile, setProfile] = useState<Profile | null>(null),
    [authLoading, setAuthLoading] = useState(true),
    [location, setLocation] = useState<{ lat: number; lng: number } | null>(
      null,
    ),
    [locating, setLocating] = useState(false);
  const t = useCallback((key: MessageKey) => translate(locale, key), [locale]);
  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await api<Profile>("/api/me"));
    } catch {
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      try {
        const lang = localStorage.getItem("flexirova-locale");
        if (lang && locales.includes(lang as Locale)) setLang(lang as Locale);
      } catch {
        /* Keep the default language if browser storage is blocked. */
      }
      void refreshProfile();
    });
    const { data } = browserDb().auth.onAuthStateChange(() => {
      setTimeout(() => void refreshProfile(), 0);
    });
    return () => {
      cancelAnimationFrame(timer);
      data.subscription.unsubscribe();
    };
  }, [refreshProfile]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = (l: Locale) => {
    setLang(l);
    try {
      localStorage.setItem("flexirova-locale", l);
    } catch {
      /* The current session still works. */
    }
  };
  const report = (e: unknown) => {
    const code = e instanceof Error ? e.message : "";
    const key: MessageKey =
      code === "SIGN_IN_REQUIRED"
        ? "signInRequired"
        : code === "FUTURE_SHIFT_REQUIRED"
          ? "futureError"
          : code === "NOT_ALLOWED"
            ? "notAllowed"
            : code === "RATE_LIMITED"
              ? "rateLimit"
              : [
                    "JOB_FULL",
                    "JOB_UNAVAILABLE",
                    "WITHDRAWAL_UNAVAILABLE",
                    "APPLICATION_ALREADY_DECIDED",
                  ].includes(code)
                ? "conflict"
                : code === "VALIDATION_ERROR"
                  ? "required"
                  : "error";
    toast.error(t(key));
  };
  const enableLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("locationFailed"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(t("locationFailed"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };
  const region =
    locale === "en" ? "en-LK" : locale === "si" ? "si-LK" : "ta-LK";
  return (
    <Context.Provider
      value={{
        locale,
        setLocale,
        theme,
        toggleTheme,
        t,
        categoryName: (key) =>
          categoryNames[key]?.[locales.indexOf(locale)] ?? key,
        profile,
        authLoading,
        refreshProfile,
        location,
        locating,
        enableLocation,
        clearLocation: () => {
          setLocation(null);
          toast.success(t("clearLocation"));
        },
        money: (n) =>
          new Intl.NumberFormat(region, {
            style: "currency",
            currency: "LKR",
            maximumFractionDigits: 0,
          }).format(n),
        date: (d) =>
          new Intl.DateTimeFormat(region, {
            timeZone: "Asia/Colombo",
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(d)),
        time: (d) =>
          new Intl.DateTimeFormat(region, {
            timeZone: "Asia/Colombo",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(d)),
        report,
      }}
    >
      {children}
      <Toaster
        theme={theme === "dark" ? "dark" : "light"}
        position="top-right"
        richColors
        closeButton
      />
    </Context.Provider>
  );
}
export function useApp() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Provider required");
  return ctx;
}
