"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const MermaidDiagram = dynamic(() => import("@/components/MermaidDiagram"), { ssr: false });
const Chat = dynamic(() => import("@/components/Chat"), { ssr: false });

type Step = "topic" | "questions" | "loading" | "result";

interface Section {
  heading: string;
  content: string;
  type: "text" | "mermaid";
}

interface Practice {
  question: string;
  hint: string;
  answer?: string;
}

interface LearnerContent {
  title: string;
  description: string;
  sections: Section[];
  practice: Practice[];
  summary: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [content, setContent] = useState<LearnerContent | null>(null);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [openHints, setOpenHints] = useState<Set<number>>(new Set());
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(new Set());
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  function startProgress(durationMs: number) {
    setProgress(0);
    const interval = 100;
    const steps = durationMs / interval;
    let current = 0;
    progressRef.current = setInterval(() => {
      current += 1;
      const pct = Math.min(92, (1 - Math.pow(1 - current / steps, 2)) * 100);
      setProgress(pct);
      if (current >= steps) clearInterval(progressRef.current!);
    }, interval);
  }

  function finishProgress() {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(100);
  }

  function toggleHint(i: number) {
    setOpenHints((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function toggleAnswer(i: number) {
    setOpenAnswers((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function reset() {
    setStep("topic");
    setContent(null);
    setTopic("");
    setQuestions([]);
    setAnswers([]);
    setError("");
    setOpenHints(new Set());
    setOpenAnswers(new Set());
  }

  async function handleTopicSubmit(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    const value = inputRef.current?.value ?? topic;
    if (!value.trim()) return;
    if (value !== topic) setTopic(value);
    setError("");
    setLoadingMsg("Формулирую уточняющие вопросы...");
    setStep("loading");
    startProgress(6000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      finishProgress();
      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(""));
      setStep("questions");
    } catch (err) {
      finishProgress();
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
      setStep("topic");
    }
  }

  async function handleAnswersSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    setError("");
    setLoadingMsg("Исследую тему и генерирую учебную страницу...");
    setStep("loading");
    startProgress(28000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, questions, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка генерации");
      finishProgress();
      setContent(data);
      setOpenHints(new Set());
      setOpenAnswers(new Set());
      setStep("result");
    } catch (err) {
      finishProgress();
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
      setStep("questions");
    }
  }

  async function exportToEpub() {
    if (!content) return;
    const res = await fetch("/api/epub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/\s+/g, "-").toLowerCase()}.epub`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportToHtml() {
    if (!content) return;
    const summaryLines = content.summary.split("\n").filter(Boolean)
      .map((l) => `<li>${l.replace(/^[-•*]\s*/, "")}</li>`).join("");
    const sectionsHtml = content.sections.map((s) => {
      if (s.type === "mermaid") return `<div style="background:#f9f9f9;border:1px solid #ddd;padding:16px;border-radius:4px;"><p><em>[Схема: ${s.heading}]</em></p><pre>${s.content}</pre></div>`;
      return `<h2>${s.heading}</h2><p>${s.content.replace(/\n\n/g, "</p><p>")}</p>`;
    }).join("\n");
    const practiceHtml = content.practice.map((p, i) =>
      `<p><strong>${i + 1}. ${p.question}</strong></p><p><em>Подсказка: ${p.hint}</em></p>${p.answer ? `<p>Ответ: ${p.answer}</p>` : ""}`
    ).join("\n");
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${content.title}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1a1a1a}h1{font-size:2em;border-bottom:2px solid #333;padding-bottom:10px}h2{font-size:1.4em;margin-top:2em}.desc{background:#f5f5f0;padding:16px;border-left:4px solid #888}ul{padding-left:1.5em}li{margin:.4em 0}</style>
</head><body><h1>${content.title}</h1><div class="desc">${content.description}</div>${sectionsHtml}
<h2>Практика</h2>${practiceHtml}<h2>Ключевые выводы</h2><ul>${summaryLines}</ul></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="text-6xl animate-pulse">📚</div>
          <div className="space-y-3">
            <p className="text-xl font-medium text-gray-700">{loadingMsg}</p>
            <p className="text-sm text-gray-400">{Math.round(progress)}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full bg-gray-900 transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-400">Обычно занимает до 30 секунд</p>
        </div>
      </main>
    );
  }

  // ── QUESTIONS ─────────────────────────────────────────────────────────────
  if (step === "questions") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Несколько вопросов</h1>
            <p className="text-gray-500">Тема: <span className="font-semibold text-gray-700">{topic}</span></p>
          </div>
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="space-y-2">
                <label className="block text-base font-medium">{i + 1}. {q}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
                  rows={2}
                  placeholder="Твой ответ..."
                  value={answers[i]}
                  onChange={(e) => { const next = [...answers]; next[i] = e.target.value; setAnswers(next); }}
                />
              </div>
            ))}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="button" onClick={handleAnswersSubmit}
              className="w-full bg-gray-900 text-white text-base font-medium py-3 rounded-lg hover:bg-gray-700 transition cursor-pointer">
              Сгенерировать учебную страницу →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (step === "result" && content) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">{topic}</p>
            <h1 className="text-4xl font-bold leading-tight">{content.title}</h1>
          </div>
          <div className="flex gap-2 shrink-0 mt-1 flex-wrap justify-end">
            <button type="button" onClick={reset}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              ← Новая тема
            </button>
            <button type="button" onClick={exportToEpub}
              className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition">
              Скачать EPUB
            </button>
            <button type="button" onClick={exportToHtml}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Скачать HTML
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-amber-50 border-l-4 border-amber-400 px-6 py-4 mb-10 text-base leading-relaxed text-gray-700">
          {content.description}
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {content.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-2xl font-bold mb-3">{section.heading}</h2>
              {section.type === "mermaid" ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <MermaidDiagram chart={section.content} />
                </div>
              ) : (
                <div className="text-base leading-relaxed text-gray-800 space-y-3">
                  {section.content.split("\n\n").map((para, j) => <p key={j}>{para}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Practice */}
        <div className="mt-14 bg-green-50 rounded-2xl p-8 border border-green-200">
          <h2 className="text-2xl font-bold mb-6">Практика и упражнения</h2>
          <div className="space-y-8">
            {content.practice.map((p, i) => (
              <div key={i} className="space-y-2">
                <p className="font-medium text-base">{i + 1}. {p.question}</p>
                <div className="flex gap-4">
                  <button type="button" onClick={() => toggleHint(i)}
                    className="text-sm text-green-700 underline hover:text-green-900">
                    {openHints.has(i) ? "Скрыть подсказку" : "Подсказка"}
                  </button>
                  {p.answer && (
                    <button type="button" onClick={() => toggleAnswer(i)}
                      className="text-sm text-blue-700 underline hover:text-blue-900">
                      {openAnswers.has(i) ? "Скрыть ответ" : "Показать ответ"}
                    </button>
                  )}
                </div>
                {openHints.has(i) && (
                  <p className="text-sm text-gray-600 italic pl-4 border-l-2 border-green-300">{p.hint}</p>
                )}
                {openAnswers.has(i) && p.answer && (
                  <div className="text-sm text-gray-800 pl-4 border-l-2 border-blue-300 bg-blue-50 py-2 pr-3 rounded-r-lg">
                    {p.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-8 border border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Ключевые выводы</h2>
          <ul className="space-y-2">
            {content.summary.split("\n").filter(Boolean).map((line, i) => (
              <li key={i} className="flex gap-2 text-base">
                <span className="text-blue-400 shrink-0">•</span>
                <span>{line.replace(/^[-•*]\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Chat */}
        <Chat
          topic={content.title}
          context={`${content.description} Разделы: ${content.sections.map(s => s.heading).join(", ")}.`}
        />

        {/* Footer */}
        <div className="mt-10 flex justify-center gap-3 flex-wrap">
          <button type="button" onClick={reset}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-base">
            ← Изучить другое
          </button>
          <button type="button" onClick={exportToEpub}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition text-base">
            Скачать EPUB для Kindle
          </button>
          <button type="button" onClick={exportToHtml}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-base">
            Скачать HTML
          </button>
        </div>
      </main>
    );
  }

  // ── TOPIC INPUT ───────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="space-y-3">
          <div className="text-6xl">📖</div>
          <h1 className="text-4xl font-bold tracking-tight">Learner-Bot</h1>
          <p className="text-gray-500 text-lg">Введи любую тему — получи структурированную учебную страницу.</p>
        </div>
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            className="w-full border-2 border-gray-300 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-gray-600 transition"
            placeholder="Например: интегралы, TCP/IP, стоицизм..."
            defaultValue={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTopicSubmit(e)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="button" onClick={handleTopicSubmit}
            className="w-full bg-gray-900 text-white text-lg font-medium py-4 rounded-xl hover:bg-gray-700 active:scale-95 transition cursor-pointer">
            Начать обучение →
          </button>
        </div>
        <p className="text-gray-400 text-sm">
          ИИ задаст 3 уточняющих вопроса, затем сгенерирует полную учебную страницу с диаграммами и заданиями.
        </p>
      </div>
    </main>
  );
}
