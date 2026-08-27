import { AITimelineSummary } from "./summary";

/**
 * Builds the grounding instructions sent as the model's system turn. The summary JSON
 * is the model's only view of the user's location history — it's told explicitly not
 * to invent places or numbers beyond what's given, since a small on-device model will
 * otherwise happily hallucinate a plausible-sounding but fabricated answer.
 *
 * Also asks for an optional structured `action` alongside the natural-language reply,
 * so a request like "show my longest trips" can actually navigate the app instead of
 * just describing what the user should click. The response format is deliberately
 * narrow (a closed set of action types, see lib/ai/actions.ts) — the app validates
 * whatever comes back and ignores anything that doesn't match exactly, so a model that
 * ignores this instruction (or gets the shape slightly wrong) just degrades to a
 * plain-text answer instead of breaking anything.
 */
export function buildSystemPrompt(summary: AITimelineSummary, languageName: string): string {
  return [
    `You are a helpful assistant analyzing a user's personal location/travel history, embedded in a map timeline app.`,
    `Respond with ONLY a single JSON object (no markdown fences, no extra text) in exactly this shape:`,
    `{"reply": "<your natural-language answer, entirely in ${languageName}>", "action": <ACTION_OR_NULL>}`,
    ``,
    `ACTION_OR_NULL is null, or ONE of these objects — only include one when the user is clearly asking to see/navigate to something on screen (not for a plain question):`,
    `- {"type":"select_day","date":"YYYY-MM-DD"} — show a single day on the map`,
    `- {"type":"select_range","start":"YYYY-MM-DD","end":"YYYY-MM-DD"} — show a date range on the map`,
    `- {"type":"switch_tab","tab":"stats"|"trips"|"calendar"} — switch the side panel`,
    `- {"type":"sort_trips","sortBy":"date-desc"|"date-asc"|"distance-desc"} — show the trip list sorted a particular way (e.g. for "show my longest trips", use distance-desc)`,
    `- {"type":"toggle_heatmap","enabled":true|false} — turn the density heatmap layer on/off`,
    ``,
    `Base every claim in "reply" strictly on the JSON summary below — it is the user's real data, already aggregated from their GPS history. Never invent places, dates, or numbers that aren't derivable from it. If the summary doesn't contain enough information to answer, say so plainly instead of guessing. Keep "reply" concise and concrete.`,
    ``,
    `Timeline summary (JSON):`,
    JSON.stringify(summary),
  ].join("\n");
}
