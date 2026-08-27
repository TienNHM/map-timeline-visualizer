import { TripSortKey } from "@/lib/timeline/trips";

export type PanelTab = "stats" | "trips" | "calendar";

export type AIAction =
  | { type: "select_day"; date: string }
  | { type: "select_range"; start: string; end: string }
  | { type: "switch_tab"; tab: PanelTab }
  | { type: "sort_trips"; sortBy: TripSortKey }
  | { type: "toggle_heatmap"; enabled: boolean };

export interface AIResponse {
  reply: string;
  action: AIAction | null;
}

const VALID_TABS = new Set<PanelTab>(["stats", "trips", "calendar"]);
const VALID_SORTS = new Set<TripSortKey>(["date-desc", "date-asc", "distance-desc"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateAction(raw: unknown): AIAction | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  switch (obj.type) {
    case "select_day":
      return typeof obj.date === "string" && DATE_RE.test(obj.date) ? { type: "select_day", date: obj.date } : null;
    case "select_range":
      return typeof obj.start === "string" &&
        DATE_RE.test(obj.start) &&
        typeof obj.end === "string" &&
        DATE_RE.test(obj.end)
        ? { type: "select_range", start: obj.start, end: obj.end }
        : null;
    case "switch_tab":
      return typeof obj.tab === "string" && VALID_TABS.has(obj.tab as PanelTab)
        ? { type: "switch_tab", tab: obj.tab as PanelTab }
        : null;
    case "sort_trips":
      return typeof obj.sortBy === "string" && VALID_SORTS.has(obj.sortBy as TripSortKey)
        ? { type: "sort_trips", sortBy: obj.sortBy as TripSortKey }
        : null;
    case "toggle_heatmap":
      return typeof obj.enabled === "boolean" ? { type: "toggle_heatmap", enabled: obj.enabled } : null;
    default:
      return null;
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

/**
 * Parses the model's response, which the system prompt asks to always be a single JSON
 * object `{"reply": "...", "action": ... | null}`. Small on-device models don't always
 * follow formatting instructions exactly, so this degrades gracefully: if the JSON
 * can't be parsed, or doesn't match one of the known action shapes, the whole raw
 * response is shown as the reply with no action — never throws, never executes
 * something unvalidated.
 */
export function parseAIResponse(raw: string): AIResponse {
  const text = raw.trim();
  const jsonText = extractJsonObject(text);
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === "object" && typeof parsed.reply === "string") {
        return { reply: parsed.reply, action: validateAction(parsed.action) };
      }
    } catch {
      // Not valid JSON — fall through and show the raw text as the reply.
    }
  }
  return { reply: text, action: null };
}
