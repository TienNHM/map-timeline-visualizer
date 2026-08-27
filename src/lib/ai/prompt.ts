import { AITimelineSummary } from "./summary";

/**
 * Builds the grounding instructions sent as the model's system turn. The summary JSON
 * is the model's only view of the user's location history — it's told explicitly not
 * to invent places or numbers beyond what's given, since a small on-device model will
 * otherwise happily hallucinate a plausible-sounding but fabricated answer.
 */
export function buildSystemPrompt(summary: AITimelineSummary, languageName: string): string {
  return [
    `You are a helpful assistant analyzing a user's personal location/travel history.`,
    `Answer entirely in ${languageName}.`,
    `Base every claim strictly on the JSON summary below — it is the user's real data, already aggregated from their GPS history. Never invent places, dates, or numbers that aren't derivable from it.`,
    `If the summary doesn't contain enough information to answer, say so plainly instead of guessing.`,
    `Keep answers concise and concrete (use the actual numbers from the summary).`,
    ``,
    `Timeline summary (JSON):`,
    JSON.stringify(summary),
  ].join("\n");
}
