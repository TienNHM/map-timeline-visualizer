import { Translations } from "@/lib/i18n/translations";

export function fallbackTitleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatActivity(activity: string, t: Translations): string {
  return t.activities[activity] ?? fallbackTitleCase(activity);
}

export function formatPlaceLabel(label: string, t: Translations): string {
  if (t.places[label]) return t.places[label];
  if (/^[A-Z_]+$/.test(label)) return fallbackTitleCase(label);
  return label;
}

export function formatDateTime(ms: number, localeTag: string): string {
  return new Date(ms).toLocaleString(localeTag, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}

export function formatHours(ms: number): string {
  return `${(ms / 3600000).toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;
}
