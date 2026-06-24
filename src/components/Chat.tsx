"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  topic: string;
  context: string;
}

export default function Chat({ topic, context }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, topic, context }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer ?? "Не могу ответить." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Ошибка. Попробуй ещё раз." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 border border-gray-200 rounded-2xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-semibold text-gray-800">Задать вопрос по теме</p>
            <p className="text-sm text-gray-500">Не понял что-то? Спроси — объясню проще</p>
          </div>
        </div>
        <span className="text-gray-400 text-xl">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col">
          {/* Messages */}
          <div className="max-h-80 overflow-y-auto px-6 py-4 space-y-4 bg-white">
            {messages.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                Задай любой вопрос по теме &ldquo;{topic}&rdquo;
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gray-900 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-500">
                  Думаю...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-4 py-3 flex gap-2 bg-white">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-500"
              placeholder="Например: а что такое интеграл Римана?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
