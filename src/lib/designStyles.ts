export interface DesignStyleDefinition {
  id: string;
  name: string;
  description: string;
}

export const DESIGN_STYLES: DesignStyleDefinition[] = [
  { id: "gradient", name: "Gradient", description: "Soft glass panels, blur, and gradient accents (default)." },
  { id: "brutalism", name: "Brutalism", description: "Flat color, hard borders, offset shadows — no blur or gradients." },
];

export const DEFAULT_STYLE_ID = "gradient";

export function isValidStyleId(id: string | null | undefined): id is string {
  return !!id && DESIGN_STYLES.some((s) => s.id === id);
}
