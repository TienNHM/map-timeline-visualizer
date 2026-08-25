"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME_ID, isValidThemeId, THEMES } from "@/lib/themes";

const STORAGE_KEY = "map-timeline-theme";

interface ThemeContextValue {
  themeId: string;
  setThemeId: (id: string) => void;
  isLight: boolean;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_INIT_SCRIPT = `(function(){try{var id=localStorage.getItem("${STORAGE_KEY}");var valid=${JSON.stringify(
  THEMES.map((t) => t.id)
)};if(id&&valid.indexOf(id)!==-1){document.documentElement.dataset.theme=id;}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at the default so server and initial client render match (avoiding a
  // hydration mismatch); THEME_INIT_SCRIPT already applied the real persisted theme
  // to the DOM before hydration, so there's no visual flash even though this state
  // — which only matters for JS-driven bits like the switcher's swatch and the map's
  // overlay colors — corrects itself one tick later once the effect below runs.
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    // Deliberate one-time sync from localStorage (a client-only source React can't
    // know about during SSR) into state, needed so JS-driven consumers like the map's
    // overlay colors pick up the real persisted theme, not just the CSS variables that
    // THEME_INIT_SCRIPT already applied directly to the DOM.
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isValidThemeId(stored)) setThemeIdState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const isLight = THEMES.find((t) => t.id === themeId)?.isLight ?? false;

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, isLight, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
