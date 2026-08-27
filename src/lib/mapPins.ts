import { PlaceCategory } from "@/lib/timeline/places";

// Generated at 2x and registered with pixelRatio 2 so pins stay crisp — MapLibre scales
// icon-size relative to this base, so this is also the size at icon-size: 1.
const PIN_SIZE = 64;

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bch).toString(16).slice(1)}`;
}

/** Fill color per category — home/work get the theme's own two accents (already
 * distinct per theme), named places a blend of both, unknown a neutral gray so
 * low-confidence pings stay visually out of the way. */
function categoryColor(category: PlaceCategory, accent: string, accent2: string): string {
  switch (category) {
    case "home":
      return accent2;
    case "work":
      return accent;
    case "named":
      return mixHex(accent, accent2, 0.5);
    case "unknown":
    default:
      return "#8a8a94";
  }
}

function drawPinSilhouette(ctx: CanvasRenderingContext2D, cx: number, headCy: number, r: number, tipY: number) {
  // Tail first, then the head circle on top overlapping its base — a simple, always-
  // correct "balloon marker" silhouette (no hand-tuned bezier curves to get wrong).
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.85, headCy + r * 0.55);
  ctx.lineTo(cx + r * 0.85, headCy + r * 0.55);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawHomeGlyph(ctx: CanvasRenderingContext2D, reach: number) {
  ctx.beginPath();
  ctx.moveTo(0, -reach * 0.9);
  ctx.lineTo(reach * 0.85, -reach * 0.1);
  ctx.lineTo(reach * 0.55, -reach * 0.1);
  ctx.lineTo(reach * 0.55, reach * 0.75);
  ctx.lineTo(-reach * 0.55, reach * 0.75);
  ctx.lineTo(-reach * 0.55, -reach * 0.1);
  ctx.lineTo(-reach * 0.85, -reach * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawWorkGlyph(ctx: CanvasRenderingContext2D, reach: number) {
  const bodyW = reach * 1.5;
  const bodyH = reach * 1.1;
  ctx.fillRect(-bodyW / 2, -reach * 0.1, bodyW, bodyH);
  const handleW = reach * 0.7;
  const handleH = reach * 0.35;
  ctx.fillRect(-handleW / 2, -reach * 0.5, handleW, handleH);
}

function drawNamedGlyph(ctx: CanvasRenderingContext2D, reach: number) {
  ctx.beginPath();
  ctx.moveTo(-reach * 0.5, -reach * 0.9);
  ctx.lineTo(reach * 0.5, -reach * 0.9);
  ctx.lineTo(reach * 0.5, reach * 0.9);
  ctx.lineTo(0, reach * 0.35);
  ctx.lineTo(-reach * 0.5, reach * 0.9);
  ctx.closePath();
  ctx.fill();
}

function drawUnknownGlyph(ctx: CanvasRenderingContext2D, reach: number) {
  ctx.beginPath();
  ctx.arc(0, 0, reach * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

const GLYPHS: Record<PlaceCategory, (ctx: CanvasRenderingContext2D, reach: number) => void> = {
  home: drawHomeGlyph,
  work: drawWorkGlyph,
  named: drawNamedGlyph,
  unknown: drawUnknownGlyph,
};

/**
 * Renders a category's map pin (colored balloon marker, white inset badge, category
 * glyph) to raw ImageData, for registering with map.addImage(). Pure Canvas 2D — no
 * SVG/network assets — so it stays in step with the "100% local" design and can be
 * regenerated per-theme without a round trip.
 */
export function buildPinImageData(category: PlaceCategory, accent: string, accent2: string): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = PIN_SIZE;
  canvas.height = PIN_SIZE;
  const ctx = canvas.getContext("2d")!;

  const cx = PIN_SIZE / 2;
  const r = PIN_SIZE * 0.3;
  const headCy = PIN_SIZE * 0.34;
  const tipY = PIN_SIZE * 0.92;

  const fillColor = categoryColor(category, accent, accent2);

  ctx.fillStyle = fillColor;
  drawPinSilhouette(ctx, cx, headCy, r, tipY);

  ctx.beginPath();
  ctx.arc(cx, headCy, r * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.save();
  ctx.translate(cx, headCy);
  ctx.fillStyle = fillColor;
  GLYPHS[category](ctx, r * 0.62);
  ctx.restore();

  return ctx.getImageData(0, 0, PIN_SIZE, PIN_SIZE);
}
