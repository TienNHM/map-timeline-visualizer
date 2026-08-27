import { AIProvider } from "./provider";

/** The fallback used whenever no real provider is available. Exists so components
 * never need an `if (provider)` null check — they always have an AIProvider, it just
 * may decline. */
export class NoAIProvider implements AIProvider {
  readonly id = "none";

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async generate(): Promise<string> {
    throw new Error("No AI provider is available in this browser.");
  }
}
