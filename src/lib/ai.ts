const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? "";
const MODEL = process.env.NEXT_PUBLIC_OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free";
const BASE = "https://openrouter.ai/api/v1/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chat(messages: Message[], maxTokens = 1000): Promise<string> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Learner-Bot",
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "API error");
  return data.choices[0].message.content ?? "";
}

export async function getQuestions(topic: string): Promise<string[]> {
  const system = `Ты помощник по обучению. Пользователь называет тему которую хочет изучить.
Задай ровно 3 коротких уточняющих вопроса на русском языке чтобы понять:
1. Текущий уровень знаний (новичок / средний / продвинутый)
2. Конкретную цель или сферу применения
3. На каком аспекте темы сосредоточиться

Отвечай ТОЛЬКО JSON объектом: {"questions": ["Вопрос 1?", "Вопрос 2?", "Вопрос 3?"]}
Никакого другого текста, только JSON.`;

  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: `Я хочу изучить: ${topic}` },
  ], 300);

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Не удалось получить вопросы");
  const parsed = JSON.parse(match[0]);
  return parsed.questions ?? [];
}

export async function generateContent(
  topic: string,
  questions: string[],
  answers: string[]
) {
  const system = `Ты эксперт по созданию учебного контента. Создай подробный структурированный материал на русском языке.

ВАЖНО: Отвечай ТОЛЬКО валидным JSON. Никакого текста до или после. Никаких markdown-блоков.

JSON структура:
{
  "title": "Название темы",
  "description": "Обзор из 2-3 предложений",
  "sections": [
    {"heading": "Заголовок", "content": "Подробное объяснение. Только обычный текст.", "type": "text"},
    {"heading": "Визуальная схема", "content": "graph TD; A[Понятие] --> B[Шаг 1]; B --> C[Результат]", "type": "mermaid"}
  ],
  "practice": [
    {"question": "Конкретное задание с числами", "hint": "Подсказка", "answer": "Полный пошаговый ответ"}
  ],
  "summary": "Пункт 1. Пункт 2. Пункт 3."
}

ПРАВИЛА для валидного JSON:
- Mermaid: разделяй узлы точкой с запятой, НЕ переносами строк
- Никаких обратных слешей и реальных переносов внутри строк
- summary: разделяй точками, не переносами

Требования к контенту:
- Пиши КАК ДЛЯ РЕБЁНКА 10-12 лет: простые слова, аналогии из жизни ("это как если бы...")
- 5-6 текстовых разделов, каждый минимум 150 слов
- Максимум 2 mermaid-диаграммы
- 5 практических заданий с конкретными числами
- Весь текст на русском языке`;

  const qa = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? "Не указано"}`).join("\n\n");
  const userMsg = `Тема: ${topic}\n\nКонтекст:\n${qa}\n\nСоздай учебный материал. Отвечай только валидным JSON.`;

  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: userMsg },
  ], 4000);

  let content = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Не удалось получить контент");

  try {
    return JSON.parse(match[0]);
  } catch {
    const fixed = match[0].replace(/[\x00-\x1F\x7F]/g, " ").replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(fixed);
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export async function askQuestion(
  question: string,
  topic: string,
  context: string,
  history: ChatMessage[]
): Promise<string> {
  const system = `Ты дружелюбный учитель который объяснил тему "${topic}".
Веди диалог с учеником — помни что было сказано раньше.
Отвечай простыми словами как для ребёнка 10-12 лет, с примерами из жизни.
3-6 предложений. На русском языке.

Краткое содержание учебной страницы: ${context}`;

  const messages: Message[] = [
    { role: "system", content: system },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.text })),
    { role: "user", content: question },
  ];

  return chat(messages, 500);
}
