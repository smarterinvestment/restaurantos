import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Send, Bot, Loader2, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const GLASS = {
  background: "linear-gradient(180deg,rgba(20,32,60,0.55),rgba(9,14,30,0.55))",
  backdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(125,165,255,0.12)",
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Assistant() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const SUGGESTIONS = [
    t("assistant.suggestions.priority"),
    t("assistant.suggestions.reduce"),
    t("assistant.suggestions.projection"),
  ];

  async function send(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(t("assistant.sessionExpired"));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          accessToken: session.access_token,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const { text: reply } = await res.json();
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e.message ?? "Error al contactar al asistente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 108px)" }}>
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="font-display font-semibold text-2xl text-text">{t("assistant.title")}</h1>
        <p className="text-text-muted text-sm mt-1">{t("assistant.subtitle")}</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-2xl p-6 space-y-4 mb-4" style={GLASS}>
        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(150deg,rgba(61,139,255,0.18),rgba(0,212,255,0.10))",
                border: "1px solid rgba(61,139,255,0.22)",
              }}
            >
              <Sparkles size={28} style={{ color: "#3d8bff" }} />
            </div>
            <div>
              <p className="text-text font-medium text-sm mb-1">{t("assistant.emptyTitle")}</p>
              <p className="text-text-dim text-xs max-w-xs leading-relaxed">{t("assistant.emptyText")}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: "linear-gradient(150deg,rgba(61,139,255,0.20),rgba(0,212,255,0.12))",
                  border: "1px solid rgba(61,139,255,0.22)",
                }}
              >
                <Bot size={15} style={{ color: "#3d8bff" }} />
              </div>
            )}
            <div
              className="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={
                m.role === "user"
                  ? { background: "linear-gradient(150deg,rgba(61,139,255,0.26),rgba(31,95,224,0.20))", border: "1px solid rgba(61,139,255,0.28)", color: "#e8edf2" }
                  : { background: "rgba(27,39,66,0.65)", border: "1px solid rgba(125,165,255,0.10)", color: "#e8edf2" }
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(150deg,rgba(61,139,255,0.20),rgba(0,212,255,0.12))", border: "1px solid rgba(61,139,255,0.22)" }}>
              <Bot size={15} style={{ color: "#3d8bff" }} />
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: "rgba(27,39,66,0.65)", border: "1px solid rgba(125,165,255,0.10)" }}>
              <Loader2 size={14} className="animate-spin" style={{ color: "#3d8bff" }} />
              <span className="text-text-dim text-xs">{t("assistant.analyzing")}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-1">
            <span className="text-danger text-xs">{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length === 0 && !loading && (
        <div className="flex gap-2 mb-3 flex-shrink-0 flex-wrap">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="flex-1 min-w-fit h-9 px-4 rounded-lg text-xs font-medium transition-all"
              style={{ background: "rgba(61,139,255,0.09)", border: "1px solid rgba(61,139,255,0.20)", color: "#9cc4ff" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder={t("assistant.placeholder")}
          disabled={loading}
          className="flex-1 h-11 rounded-xl px-4 text-sm text-text outline-none transition-colors disabled:opacity-60"
          style={{ background: "rgba(27,39,66,0.65)", border: "1px solid rgba(125,165,255,0.14)" }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(150deg,#3d8bff,#1f5fe0)", boxShadow: "0 4px 16px rgba(61,139,255,0.35)" }}
        >
          <Send size={16} color="#ffffff" />
        </button>
      </div>
    </div>
  );
}
