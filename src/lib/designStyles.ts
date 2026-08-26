export interface DesignStyleDefinition {
  id: string;
}

// Display names/descriptions live in the locale translations (t.style), not here.
export const DESIGN_STYLES: DesignStyleDefinition[] = [{ id: "gradient" }, { id: "brutalism" }];

export const DEFAULT_STYLE_ID = "gradient";

export function isValidStyleId(id: string | null | undefined): id is string {
  return !!id && DESIGN_STYLES.some((s) => s.id === id);
}
