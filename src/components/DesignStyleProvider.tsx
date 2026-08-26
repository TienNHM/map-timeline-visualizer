"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_STYLE_ID, DESIGN_STYLES, isValidStyleId } from "@/lib/designStyles";

const STORAGE_KEY = "map-timeline-design-style";

interface DesignStyleContextValue {
  styleId: string;
  setStyleId: (id: string) => void;
  styles: typeof DESIGN_STYLES;
}

const DesignStyleContext = createContext<DesignStyleContextValue | null>(null);

export const DESIGN_STYLE_INIT_SCRIPT = `(function(){try{var id=localStorage.getItem("${STORAGE_KEY}");var valid=${JSON.stringify(
  DESIGN_STYLES.map((s) => s.id)
)};if(id&&valid.indexOf(id)!==-1){document.documentElement.dataset.style=id;}}catch(e){}})();`;

export function DesignStyleProvider({ children }: { children: React.ReactNode }) {
  // Same rationale as ThemeProvider: start at the default so server/client render
  // match; DESIGN_STYLE_INIT_SCRIPT already applied the real persisted style to the
  // DOM before hydration, so there's no visual flash despite this state settling a
  // tick later.
  const [styleId, setStyleIdState] = useState(DEFAULT_STYLE_ID);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isValidStyleId(stored)) setStyleIdState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.style = styleId;
  }, [styleId]);

  const setStyleId = useCallback((id: string) => {
    setStyleIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <DesignStyleContext.Provider value={{ styleId, setStyleId, styles: DESIGN_STYLES }}>
      {children}
    </DesignStyleContext.Provider>
  );
}

export function useDesignStyle(): DesignStyleContextValue {
  const ctx = useContext(DesignStyleContext);
  if (!ctx) throw new Error("useDesignStyle must be used within a DesignStyleProvider");
  return ctx;
}
