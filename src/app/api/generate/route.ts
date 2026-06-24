import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL } from "@/lib/openrouter";

const GENERATE_SYSTEM = `Ты эксперт по созданию учебного контента. Создай подробный структурированный материал для изучения темы на русском языке.

ВАЖНО: Отвечай ТОЛЬКО валидным JSON. Никакого текста до или после. Никаких markdown-блоков с кодом.

JSON должен строго соответствовать этой структуре:
{
  "title": "Название темы",
  "description": "Обзор из 2-3 предложений — что узнает читатель",
  "sections": [
    {
      "heading": "Заголовок раздела",
      "content": "Подробное объяснение. Только обычный текст.",
      "type": "text"
    },
    {
      "heading": "Визуальная схема",
      "content": "graph TD; A[Понятие] --> B[Шаг 1]; B --> C[Шаг 2]; C --> D[Результат]",
      "type": "mermaid"
    }
  ],
  "practice": [
    {
      "question": "Практическое задание с конкретными числами или ситуацией",
      "hint": "Подсказка как подступиться к решению",
      "answer": "Полный пошаговый ответ с объяснением"
    }
  ],
  "summary": "Пункт 1. Пункт 2. Пункт 3."
}

КРИТИЧЕСКИЕ правила для валидного JSON:
- Mermaid диаграммы: разделяй узлы точкой с запятой, НЕ переносами строк. Пример: "graph TD; A --> B; B --> C"
- Текст: только обычные символы, никаких спецсимволов ломающих JSON
- Никаких обратных слешей в полях контента
- Никаких реальных переносов строк внутри строковых значений
- summary: разделяй пункты точками, не переносами

Требования к контенту:
- Пиши КАК ДЛЯ РЕБЁНКА 10-12 лет: простые слова, короткие предложения, конкретные примеры из жизни
- Каждое сложное понятие объясняй аналогией ("это как если бы...", "представь что...")
- Никаких абстракций без примера — сначала пример, потом термин
- 5-6 текстовых разделов, каждый минимум 150 слов с подробным объяснением
- Максимум 2 mermaid-диаграммы
- 5 практических заданий с конкретными числами/ситуациями (не абстрактных)
- Адаптируй под уровень пользователя
- Весь текст — на русском языке`;

export async function POST(req: NextRequest) {
  const { topic, questions, answers } = await req.json();

  if (!topic || !questions || !answers) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const qa = questions
    .map((q: string, i: number) => `Q: ${q}\nA: ${answers[i] ?? "Not specified"}`)
    .join("\n\n");

  const userPrompt = `Topic: ${topic}

User context:
${qa}

Создай подробный учебный материал, адаптированный под уровень и цели пользователя. Отвечай только валидным JSON.`;

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: GENERATE_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4000,
  });

  let content = response.choices[0].message.content ?? "{}";

  // Strip markdown code fences
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Extract JSON object if there's surrounding text
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: "AI returned no valid JSON" }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch {
    // Last resort: try to fix common JSON issues
    const fixed = match[0]
      .replace(/[\x00-\x1F\x7F]/g, " ") // remove control chars
      .replace(/,\s*}/g, "}") // trailing commas
      .replace(/,\s*]/g, "]");
    try {
      const parsed = JSON.parse(fixed);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  }
}
