"use client";

import { useState } from "react";
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

  async function handleTopicSubmit(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    if (!topic.trim()) return;
    setError("");
    setLoadingMsg("Thinking up clarifying questions...");
    setStep("loading");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get questions");
      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(""));
      setStep("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("topic");
    }
  }

  async function handleAnswersSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    setError("");
    setLoadingMsg("Researching and generating your learning page...");
    setStep("loading");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, questions, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate content");

      sessionStorage.setItem("learner-content", JSON.stringify(data));
      sessionStorage.setItem("learner-topic", topic);
      router.push("/learn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("questions");
    }
  }

  if (step === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">📚</div>
          <p className="text-lg text-gray-600">{loadingMsg}</p>
          <p className="text-sm text-gray-400">This may take 15–30 seconds</p>
        </div>
      </main>
    );
  }

  if (step === "questions") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">A few quick questions</h1>
            <p className="text-gray-500">
              Topic: <span className="font-semibold text-gray-700">{topic}</span>
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
                  placeholder="Your answer..."
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
              Generate Learning Page →
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
            Enter any topic. Get a structured learning page, ready to read on Kindle.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            autoComplete="off"
            className="w-full border-2 border-gray-300 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-gray-600 transition"
            placeholder="e.g. Transformer neural networks, TCP/IP, Stoicism..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTopicSubmit(e)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="button"
            onClick={handleTopicSubmit}
            className="w-full bg-gray-900 text-white text-lg font-medium py-4 rounded-xl hover:bg-gray-700 transition cursor-pointer"
          >
            Start Learning →
          </button>
        </div>

        <p className="text-gray-400 text-sm">
          AI will ask 3 clarifying questions, then generate a full learning page with diagrams and exercises.
        </p>
      </div>
    </main>
  );
}
