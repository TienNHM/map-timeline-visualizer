"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  renderTrigger: (current: DropdownOption<T>) => ReactNode;
  menuLabel?: string;
  align?: "left" | "right";
  triggerClassName?: string;
}

export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  renderTrigger,
  menuLabel,
  align = "right",
  triggerClassName,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  function toggleOpen() {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // ~40px per option row + label/padding, capped so short menus don't over-trigger this.
      const estimatedMenuHeight = Math.min(320, 70 + options.length * 46);
      setOpenUpward(spaceBelow < estimatedMenuHeight);
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-expanded={open}
        title={current.description}
        className={
          triggerClassName ??
          "flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
        }
      >
        {renderTrigger(current)}
        <Icon name="chevronDown" className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`dropdown-menu absolute z-20 w-64 p-2 ${
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          {menuLabel && (
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold tracking-wide text-(--text-faint) uppercase">
              {menuLabel}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`rounded-lg px-2 py-1.5 text-left transition-colors ${
                  o.value === value ? "bg-(--panel-strong)" : "hover:bg-(--panel)"
                }`}
              >
                <div className="flex items-center gap-2.5 text-sm">
                  {o.icon}
                  <span className={`flex-1 ${o.value === value ? "text-(--text)" : "text-(--text-muted)"}`}>
                    {o.label}
                  </span>
                  {o.value === value && <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-(--accent)" />}
                </div>
                {o.description && (
                  <p className="mt-0.5 pl-0 text-[11px] leading-snug text-(--text-faint)">{o.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
