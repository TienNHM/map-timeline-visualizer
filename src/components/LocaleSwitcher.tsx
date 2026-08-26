"use client";

import { useLocale } from "@/components/LocaleProvider";
import Dropdown, { DropdownOption } from "@/components/Dropdown";
import { Icon } from "@/components/Icon";

export default function LocaleSwitcher() {
  const { locale, setLocale, locales, t } = useLocale();

  const options: DropdownOption<string>[] = locales.map((l) => ({
    value: l.id,
    label: l.label,
  }));

  return (
    <Dropdown
      value={locale}
      options={options}
      onChange={(id) => setLocale(id as "vi" | "en")}
      menuLabel={t.locale.menuLabel}
      triggerClassName="flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1.5 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
      renderTrigger={(current) => (
        <>
          <Icon name="language" className="h-3.5 w-3.5 shrink-0" />
          <span className="stat-number uppercase">{current.value}</span>
        </>
      )}
    />
  );
}
