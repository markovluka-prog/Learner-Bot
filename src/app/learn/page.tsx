"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MermaidDiagram = dynamic(() => import("@/components/MermaidDiagram"), { ssr: false });
const Chat = dynamic(() => import("@/components/Chat"), { ssr: false });

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

export default function LearnPage() {
  const router = useRouter();
  const [content, setContent] = useState<LearnerContent | null>(null);
  const [topic, setTopic] = useState("");
  const [openHints, setOpenHints] = useState<Set<number>>(new Set());
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem("learner-content");
    const t = sessionStorage.getItem("learner-topic");
    if (!raw) { router.push("/"); return; }
    setContent(JSON.parse(raw));
    setTopic(t ?? "");
  }, [router]);

  function toggleHint(i: number) {
    setOpenHints((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function toggleAnswer(i: number) {
    setOpenAnswers((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
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

    const summaryLines = content.summary
      .split("\n")
      .filter(Boolean)
      .map((l) => `<li>${l.replace(/^[-•*]\s*/, "")}</li>`)
      .join("");

    const sectionsHtml = content.sections
      .map((s) => {
        if (s.type === "mermaid") {
          return `<div class="diagram-placeholder">
            <p><em>[Diagram: ${s.heading}]</em></p>
            <pre>${s.content}</pre>
          </div>`;
        }
        return `<h2>${s.heading}</h2><p>${s.content.replace(/\n\n/g, "</p><p>")}</p>`;
      })
      .join("\n");

    const practiceHtml = content.practice
      .map(
        (p, i) =>
          `<p><strong>${i + 1}. ${p.question}</strong></p><p><em>Hint: ${p.hint}</em></p>`
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 2em; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { font-size: 1.4em; margin-top: 2em; }
    .description { font-size: 1.1em; color: #444; background: #f5f5f0; padding: 16px; border-left: 4px solid #888; }
    .diagram-placeholder { background: #f9f9f9; border: 1px solid #ddd; padding: 16px; border-radius: 4px; }
    .diagram-placeholder pre { font-size: 0.8em; color: #666; white-space: pre-wrap; }
    .practice { background: #f0f4f0; padding: 20px; border-radius: 4px; margin-top: 2em; }
    .summary { background: #f4f0f0; padding: 20px; border-radius: 4px; margin-top: 2em; }
    ul { padding-left: 1.5em; }
    li { margin: 0.4em 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${content.title}</h1>
  <div class="description">${content.description}</div>

  ${sectionsHtml}

  <div class="practice">
    <h2>Practice &amp; Exercises</h2>
    ${practiceHtml}
  </div>

  <div class="summary">
    <h2>Key Takeaways</h2>
    <ul>${summaryLines}</ul>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!content) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">{topic}</p>
          <h1 className="text-4xl font-bold leading-tight">{content.title}</h1>
        </div>
        <div className="flex gap-2 shrink-0 mt-1 flex-wrap justify-end">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            ← Новая тема
          </button>
          <button
            onClick={exportToEpub}
            className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Скачать EPUB
          </button>
          <button
            onClick={exportToHtml}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
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
                {section.content.split("\n\n").map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
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
              <p className="font-medium text-base">
                {i + 1}. {p.question}
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => toggleHint(i)}
                  className="text-sm text-green-700 underline hover:text-green-900"
                >
                  {openHints.has(i) ? "Скрыть подсказку" : "Подсказка"}
                </button>
                {p.answer && (
                  <button
                    type="button"
                    onClick={() => toggleAnswer(i)}
                    className="text-sm text-blue-700 underline hover:text-blue-900"
                  >
                    {openAnswers.has(i) ? "Скрыть ответ" : "Показать ответ"}
                  </button>
                )}
              </div>
              {openHints.has(i) && (
                <p className="text-sm text-gray-600 italic pl-4 border-l-2 border-green-300">
                  {p.hint}
                </p>
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

      {/* Footer actions */}
      <div className="mt-10 flex justify-center gap-3 flex-wrap">
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-base"
        >
          ← Изучить другое
        </button>
        <button
          onClick={exportToEpub}
          className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition text-base"
        >
          Скачать EPUB для Kindle
        </button>
        <button
          onClick={exportToHtml}
          className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-base"
        >
          Скачать HTML
        </button>
      </div>
    </main>
  );
}
