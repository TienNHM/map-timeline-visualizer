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
    expectedInputs?: { type: "text"; languages: string[] }[];
    expectedOutputs?: { type: "text"; languages: string[] }[];
  }): Promise<LanguageModelSession>;
}

// Chrome/Edge warns (and on some versions errors) if a prompt request doesn't declare
// an expected language — "en" is used here regardless of the app's locale because it's
// the language of the prompt/instructions themselves and is reliably in the supported
// set; the system prompt separately asks the model to *answer* in the user's locale.
// This is a best-effort declaration, not a guarantee the model's reply matches it.
const DECLARED_LANGUAGE = [{ type: "text" as const, languages: ["en"] }];

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
      expectedInputs: DECLARED_LANGUAGE,
      expectedOutputs: DECLARED_LANGUAGE,
    });
    try {
      return await session.prompt(prompt);
    } finally {
      session.destroy?.();
    }
  }
}
