"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, isValidLocale, Locale, LOCALES, Translations, TRANSLATIONS } from "@/lib/i18n/translations";

const STORAGE_KEY = "map-timeline-locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (id: Locale) => void;
  locales: typeof LOCALES;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Starts at the default locale so server and initial client render match — the
  // default (Vietnamese) is also what most visitors want, so there's no flash for
  // them; returning English users see their choice apply a tick after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isValidLocale(stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((id: Locale) => {
    setLocaleState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, locales: LOCALES, t: TRANSLATIONS[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
