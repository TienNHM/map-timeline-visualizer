import { AIGenerateOptions, AIProvider } from "./provider";

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy?(): void;
}

interface LanguageModelStatic {
  // Current shape (Chrome's Prompt API, chrome.dev/docs/ai/prompt-api).
  availability?(options?: unknown): Promise<string>;
  // Earlier/alternate shape kept for tolerance — this API has moved before.
  capabilities?(): Promise<{ available: string }>;
  create(options?: {
    initialPrompts?: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    topK?: number;
  }): Promise<LanguageModelSession>;
}

function getLanguageModel(): LanguageModelStatic | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    LanguageModel?: LanguageModelStatic;
    ai?: { languageModel?: LanguageModelStatic };
  };
  return w.LanguageModel ?? w.ai?.languageModel ?? null;
}

const READY_STATUSES = new Set(["available", "readily"]);

/**
 * Wraps Chrome/Edge's built-in on-device LanguageModel (Gemini Nano). Never assume this
 * exists — the API's shape has changed across Chrome versions and it's absent entirely
 * outside Chromium browsers with the feature enabled, so every entry point here is
 * defensive: isAvailable() only reports true for a definitively-ready model, never for
 * a "needs to download first" state, so callers don't trigger a multi-hundred-MB
 * download from a casual click.
 */
export class BrowserLanguageModelProvider implements AIProvider {
  readonly id = "browser-language-model";

  async isAvailable(): Promise<boolean> {
    const model = getLanguageModel();
    if (!model) return false;
    try {
      if (typeof model.availability === "function") {
        const status = await model.availability();
        return READY_STATUSES.has(status);
      }
      if (typeof model.capabilities === "function") {
        const caps = await model.capabilities();
        return caps.available === "readily";
      }
      return false;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: AIGenerateOptions): Promise<string> {
    const model = getLanguageModel();
    if (!model) throw new Error("Browser LanguageModel API is not available.");

    const session = await model.create({
      initialPrompts: options?.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : undefined,
    });
    try {
      return await session.prompt(prompt);
    } finally {
      session.destroy?.();
    }
  }
}
