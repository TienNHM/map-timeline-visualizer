export interface ThemeDefinition {
  id: string;
  /** [accent, accent-2] — used for the swatch preview in the theme switcher. */
  swatch: [string, string];
  isLight?: boolean;
}

// Display names/descriptions live in the locale translations (t.theme), not here,
// since this list is display-order + color data shared by every locale.
export const THEMES: ThemeDefinition[] = [
  { id: "violet", swatch: ["#8b7cf6", "#34d3a8"] },
  { id: "sunset", swatch: ["#fb923c", "#f472b6"] },
  { id: "ocean", swatch: ["#38bdf8", "#22d3ee"] },
  { id: "forest", swatch: ["#4ade80", "#a3e635"] },
  { id: "rose", swatch: ["#f472b6", "#c084fc"] },
  { id: "light", swatch: ["#6d5bd0", "#0f9c82"], isLight: true },
];

export const DEFAULT_THEME_ID = "violet";

export function isValidThemeId(id: string | null | undefined): id is string {
  return !!id && THEMES.some((t) => t.id === id);
}
