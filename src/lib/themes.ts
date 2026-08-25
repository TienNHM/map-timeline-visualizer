export interface ThemeDefinition {
  id: string;
  name: string;
  /** [accent, accent-2] — used for the swatch preview in the theme switcher. */
  swatch: [string, string];
  description: string;
  isLight?: boolean;
}

export const THEMES: ThemeDefinition[] = [
  { id: "violet", name: "Violet", swatch: ["#8b7cf6", "#34d3a8"], description: "Deep violet & teal (default)" },
  { id: "sunset", name: "Sunset", swatch: ["#fb923c", "#f472b6"], description: "Warm amber & pink" },
  { id: "ocean", name: "Ocean", swatch: ["#38bdf8", "#22d3ee"], description: "Deep navy & cyan" },
  { id: "forest", name: "Forest", swatch: ["#4ade80", "#a3e635"], description: "Dark green & lime" },
  { id: "rose", name: "Rose", swatch: ["#f472b6", "#c084fc"], description: "Wine & orchid" },
  { id: "light", name: "Light", swatch: ["#6d5bd0", "#0f9c82"], description: "Bright basemap, dark text", isLight: true },
];

export const DEFAULT_THEME_ID = "violet";

export function isValidThemeId(id: string | null | undefined): id is string {
  return !!id && THEMES.some((t) => t.id === id);
}
