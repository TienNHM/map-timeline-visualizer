"use client";

import { useTheme } from "@/components/ThemeProvider";
import Dropdown, { DropdownOption } from "@/components/Dropdown";

function Swatch({ colors, size = 18 }: { colors: [string, string]; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      }}
    />
  );
}

export default function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme();

  const options: DropdownOption<string>[] = themes.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.description,
    icon: <Swatch colors={t.swatch} />,
  }));

  return (
    <Dropdown
      value={themeId}
      options={options}
      onChange={setThemeId}
      menuLabel="Theme"
      triggerClassName="flex items-center gap-2 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1.5 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
      renderTrigger={(current) => current.icon}
    />
  );
}
