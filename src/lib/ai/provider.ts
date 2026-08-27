export interface AIGenerateOptions {
  /** Grounding context + instructions, kept separate from the user's own question. */
  systemPrompt?: string;
}

/**
 * A pluggable text-generation backend. Chrome/Edge's on-device LanguageModel is the
 * only implementation today, but the app never calls it directly — every caller goes
 * through this interface so "AI unavailable" is a normal, always-handled state instead
 * of something that has to be special-cased at every call site. See
 * BrowserLanguageModelProvider and NoAIProvider.
 */
export interface AIProvider {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: AIGenerateOptions): Promise<string>;
}
