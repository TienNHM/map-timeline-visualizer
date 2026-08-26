"use client";

import { useTheme } from "@/components/ThemeProvider";
import Dropdown, { DropdownOption } from "@/components/Dropdown";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/components/LocaleProvider";

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
  const { t } = useLocale();

  const options: DropdownOption<string>[] = themes.map((theme) => ({
    value: theme.id,
    label: t.theme.names[theme.id] ?? theme.id,
    description: t.theme.descriptions[theme.id],
    icon: <Swatch colors={theme.swatch} />,
  }));

  return (
    <Dropdown
      value={themeId}
      options={options}
      onChange={setThemeId}
      menuLabel={t.theme.menuLabel}
      triggerClassName="flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1.5 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
      renderTrigger={(current) => (
        <>
          <Icon name="palette" className="h-3.5 w-3.5 shrink-0" />
          {current.icon}
        </>
      )}
    />
  );
}
