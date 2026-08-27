"use client";

import { useEffect, useState } from "react";
import { AIProvider } from "./provider";
import { BrowserLanguageModelProvider } from "./browserLanguageModelProvider";
import { NoAIProvider } from "./noAIProvider";

export interface UseAIProviderResult {
  provider: AIProvider;
  /** null while the availability check is still in flight. */
  available: boolean | null;
}

/**
 * Resolves the AIProvider to use — the browser's on-device LanguageModel if it reports
 * itself ready, NoAIProvider otherwise. Callers always get a usable AIProvider; they
 * only need to branch on `available` to decide whether to show AI features at all.
 */
export function useAIProvider(): UseAIProviderResult {
  const [browserProvider] = useState(() => new BrowserLanguageModelProvider());
  const [fallbackProvider] = useState(() => new NoAIProvider());
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    browserProvider
      .isAvailable()
      .then((ok) => {
        if (!cancelled) setAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [browserProvider]);

  return { provider: available ? browserProvider : fallbackProvider, available };
}
