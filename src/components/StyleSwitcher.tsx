"use client";

import { useDesignStyle } from "@/components/DesignStyleProvider";
import Dropdown, { DropdownOption } from "@/components/Dropdown";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/components/LocaleProvider";

function StylePreview({ id, size = 18 }: { id: string; size?: number }) {
  if (id === "brutalism") {
    return (
      <span
        className="inline-block shrink-0"
        style={{
          width: size,
          height: size,
          background: "var(--accent)",
          border: "2px solid var(--text)",
          boxShadow: "2px 2px 0 0 var(--text)",
        }}
      />
    );
  }
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
      }}
    />
  );
}

export default function StyleSwitcher() {
  const { styleId, setStyleId, styles } = useDesignStyle();
  const { t } = useLocale();

  const options: DropdownOption<string>[] = styles.map((s) => ({
    value: s.id,
    label: t.style.names[s.id] ?? s.id,
    description: t.style.descriptions[s.id],
    icon: <StylePreview id={s.id} />,
  }));

  return (
    <Dropdown
      value={styleId}
      options={options}
      onChange={setStyleId}
      menuLabel={t.style.menuLabel}
      triggerClassName="flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1.5 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
      renderTrigger={(current) => (
        <>
          <Icon name="shapes" className="h-3.5 w-3.5 shrink-0" />
          <StylePreview id={current.value} />
        </>
      )}
    />
  );
}
