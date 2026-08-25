import type { StyleSpecification } from "maplibre-gl";

const DARK_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Layers in CARTO's dark-matter / positron styles worth re-tinting so each theme gets a
// genuinely different-looking basemap, not just differently colored trip/visit overlays.
const LAND_LAYER_IDS = new Set([
  "background",
  "landcover",
  "landuse",
  "landuse_residential",
  "park_national_park",
  "park_nature_reserve",
  "building-top",
]);
const LAND_COLOR_KEYS = ["background-color", "fill-color", "fill-outline-color"];

const WATER_LAYER_IDS = new Set(["water", "water_shadow", "waterway"]);
const WATER_COLOR_KEYS = ["fill-color", "line-color"];

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(input: string): Rgba | null {
  const s = input.trim();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const num = parseInt(hex.slice(0, 6), 16);
    if (Number.isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: 1 };
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  return null;
}

function formatColor(c: Rgba): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  return c.a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${c.a})`;
}

function mixColorString(input: string, tintHex: string, amount: number): string {
  const base = parseColor(input);
  const tint = parseColor(tintHex);
  if (!base || !tint || base.a === 0) return input;
  return formatColor({
    r: base.r + (tint.r - base.r) * amount,
    g: base.g + (tint.g - base.g) * amount,
    b: base.b + (tint.b - base.b) * amount,
    a: base.a,
  });
}

function tintPaintValue(value: unknown, tintHex: string, amount: number): unknown {
  if (typeof value === "string") return mixColorString(value, tintHex, amount);
  if (value && typeof value === "object" && Array.isArray((value as { stops?: unknown }).stops)) {
    const v = value as { stops: [number, string][] };
    return { ...v, stops: v.stops.map(([zoom, color]) => [zoom, mixColorString(color, tintHex, amount)]) };
  }
  return value;
}

function tintStyle(style: StyleSpecification, accent: string, accent2: string, isLight: boolean): StyleSpecification {
  const amount = isLight ? 0.08 : 0.18;
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!("paint" in layer) || !layer.paint) return layer;
      let keys: string[];
      let tint: string;
      if (LAND_LAYER_IDS.has(layer.id)) {
        keys = LAND_COLOR_KEYS;
        tint = accent;
      } else if (WATER_LAYER_IDS.has(layer.id)) {
        keys = WATER_COLOR_KEYS;
        tint = accent2;
      } else {
        return layer;
      }
      const paint: Record<string, unknown> = { ...layer.paint };
      for (const key of keys) {
        if (key in paint) paint[key] = tintPaintValue(paint[key], tint, amount);
      }
      return { ...layer, paint } as typeof layer;
    }),
  };
}

const baseStyleCache = new Map<string, Promise<StyleSpecification>>();

function fetchBaseStyle(url: string): Promise<StyleSpecification> {
  let cached = baseStyleCache.get(url);
  if (!cached) {
    cached = fetch(url).then((res) => res.json());
    baseStyleCache.set(url, cached);
  }
  return cached;
}

export async function loadTintedStyle(isLight: boolean, accent: string, accent2: string): Promise<StyleSpecification> {
  const base = await fetchBaseStyle(isLight ? LIGHT_STYLE_URL : DARK_STYLE_URL);
  return tintStyle(base, accent, accent2, isLight);
}
