"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineSegment } from "@/lib/timeline/types";
import { useLocale } from "@/components/LocaleProvider";
import { useAIProvider } from "@/lib/ai/useAIProvider";
import { buildAISummary } from "@/lib/ai/summary";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { AIAction, parseAIResponse } from "@/lib/ai/actions";
import { Icon } from "@/components/Icon";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIPanelProps {
  segments: TimelineSegment[];
  onAction: (action: AIAction) => void;
}

const LANGUAGE_NAMES: Record<string, string> = { vi: "Vietnamese", en: "English" };

export default function AIPanel({ segments, onAction }: AIPanelProps) {
  const { locale, t } = useLocale();
  const { provider, available } = useAIProvider();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => buildAISummary(segments, t), [segments, t]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setPending(true);
    try {
      const systemPrompt = buildSystemPrompt(summary, LANGUAGE_NAMES[locale] ?? "English");
      const raw = await provider.generate(q, { systemPrompt });
      const { reply, action } = parseAIResponse(raw);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (action) onAction(action);
    } catch (err) {
      // Surfaced in the message itself (not just the console) since this is the only
      // place a real user will see it — the on-device model's failure modes (context
      // window exceeded, unsupported output language, download interrupted, etc.) are
      // varied enough that a generic "try again" alone isn't enough to self-diagnose.
      console.error("AI generate() failed:", err);
      const detail = err instanceof Error ? err.message : String(err);
      setMessages((m) => [...m, { role: "assistant", content: `${t.ai.errorMessage}${detail ? ` (${detail})` : ""}` }]);
    } finally {
      setPending(false);
    }
  }

  if (available === null) {
    return <p className="py-6 text-center text-sm text-(--text-muted)">{t.ai.checking}</p>;
  }

  if (!available) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm font-medium text-(--text)">{t.ai.unavailableTitle}</p>
        <p className="text-xs text-(--text-muted)">{t.ai.unavailableBody}</p>
      </div>
    );
  }

  if (segments.length === 0) {
    return <p className="py-6 text-center text-sm text-(--text-muted)">{t.ai.emptyRangeMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={listRef} className="scroll-thin flex max-h-80 min-h-20 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-xs text-(--text-faint)">{t.ai.title}</p>}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user" ? "self-end text-white" : "self-start bg-(--panel) text-(--text)"
            }`}
            style={
              m.role === "user" ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" } : undefined
            }
          >
            {m.content}
          </div>
        ))}
        {pending && <p className="self-start text-xs text-(--text-faint)">{t.ai.thinking}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {t.ai.suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={pending}
            className="rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1 text-[11px] text-(--text-muted) transition-colors hover:text-(--text) disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.ai.inputPlaceholder}
          disabled={pending}
          className="flex-1 rounded-full border border-(--panel-border) bg-(--panel) px-3 py-2 text-sm text-(--text) outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label={t.ai.sendAria}
          className="accent-fill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
