"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Step = "topic" | "questions" | "loading";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startProgress(durationMs: number) {
    setProgress(0);
    const interval = 100;
    const steps = durationMs / interval;
    let current = 0;
    progressRef.current = setInterval(() => {
      current += 1;
      // ease-out: fast start, slow near end, cap at 92%
      const pct = Math.min(92, (1 - Math.pow(1 - current / steps, 2)) * 100);
      setProgress(pct);
      if (current >= steps) clearInterval(progressRef.current!);
    }, interval);
  }

  function finishProgress() {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(100);
  }

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  async function handleTopicSubmit(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    if (!topic.trim()) return;
    setError("");
    setLoadingMsg("Формулирую уточняющие вопросы...");
    setStep("loading");
    startProgress(6000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get questions");
      finishProgress();
      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(""));
      setStep("questions");
    } catch (err) {
      finishProgress();
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      if (!res.ok) throw new Error(data.error ?? "Failed to generate content");

      finishProgress();
      sessionStorage.setItem("learner-content", JSON.stringify(data));
      sessionStorage.setItem("learner-topic", topic);
      router.push("/learn");
    } catch (err) {
      finishProgress();
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("questions");
    }
  }

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
            <div
              className="h-3 rounded-full bg-gray-900 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">Обычно занимает до 30 секунд</p>
        </div>
      </main>
    );
  }

  if (step === "questions") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Несколько вопросов</h1>
            <p className="text-gray-500">
              Тема: <span className="font-semibold text-gray-700">{topic}</span>
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="space-y-2">
                <label className="block text-base font-medium">
                  {i + 1}. {q}
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
                  rows={2}
                  placeholder="Твой ответ..."
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                />
              </div>
            ))}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="button"
              onClick={handleAnswersSubmit}
              className="w-full bg-gray-900 text-white text-base font-medium py-3 rounded-lg hover:bg-gray-700 transition cursor-pointer"
            >
              Сгенерировать учебную страницу →
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="space-y-3">
          <div className="text-6xl">📖</div>
          <h1 className="text-4xl font-bold tracking-tight">Learner-Bot</h1>
          <p className="text-gray-500 text-lg">
            Введи любую тему — получи структурированную учебную страницу.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            autoComplete="off"
            className="w-full border-2 border-gray-300 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-gray-600 transition"
            placeholder="Например: интегралы, TCP/IP, стоицизм..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTopicSubmit(e)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="button"
            onClick={handleTopicSubmit}
            className="w-full bg-gray-900 text-white text-lg font-medium py-4 rounded-xl hover:bg-gray-700 active:scale-95 transition cursor-pointer"
          >
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
