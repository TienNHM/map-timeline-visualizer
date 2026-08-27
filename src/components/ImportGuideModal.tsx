"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/components/LocaleProvider";

interface ImportGuideModalProps {
  onClose: () => void;
}

export default function ImportGuideModal({ onClose }: ImportGuideModalProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<"phone" | "takeout">("phone");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const steps = tab === "phone" ? t.importGuide.phoneSteps : t.importGuide.takeoutSteps;

  // Portaled to <body> rather than rendered in place — FileUpload's own container has
  // backdrop-filter (via .glass-panel), which makes it the containing block for any
  // position:fixed descendant, sizing/clipping this overlay to that small card instead
  // of the viewport. A portal escapes that regardless of where this component is used.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // This overlay renders inside FileUpload's clickable drop-zone — without this,
        // closing the guide by clicking the backdrop would also bubble up and trigger
        // that container's own onClick, popping open the native file picker underneath.
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="glass-panel relative w-full max-w-lg p-6 sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-(--text)">{t.importGuide.title}</h2>
          <button
            onClick={onClose}
            aria-label={t.importGuide.closeAria}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-(--text-muted) transition-colors hover:text-(--text)"
          >
            ×
          </button>
        </div>

        <p className="mt-2 text-sm text-(--text-muted)">{t.importGuide.intro}</p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-[0.85rem] border border-(--panel-border) bg-(--panel) p-1">
          <button
            onClick={() => setTab("phone")}
            className={`rounded-[0.6rem] px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "phone" ? "bg-(--panel-strong) text-(--text)" : "text-(--text-muted) hover:text-(--text)"
            }`}
          >
            {t.importGuide.tabPhone}
          </button>
          <button
            onClick={() => setTab("takeout")}
            className={`rounded-[0.6rem] px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "takeout" ? "bg-(--panel-strong) text-(--text)" : "text-(--text-muted) hover:text-(--text)"
            }`}
          >
            {t.importGuide.tabTakeout}
          </button>
        </div>

        <ol className="mt-4 flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="stat-number flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-(--text)">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-(--panel-border) bg-(--panel) px-3 py-2.5 text-xs text-(--text-faint)">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t.importGuide.disclaimer}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
