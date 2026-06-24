import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL } from "@/lib/openrouter";

const CLARIFYING_SYSTEM = `Ты помощник по обучению. Пользователь называет тему, которую хочет изучить.
Твоя задача — задать ровно 3 коротких уточняющих вопроса на русском языке, чтобы понять:
1. Текущий уровень знаний пользователя (новичок / средний / продвинутый)
2. Конкретную цель или сферу применения
3. На каком аспекте темы сосредоточиться

Отвечай ТОЛЬКО JSON объектом в таком формате:
{
  "questions": [
    "Вопрос 1?",
    "Вопрос 2?",
    "Вопрос 3?"
  ]
}

Никакого другого текста, только JSON. Вопросы — на русском языке.`;

export async function POST(req: NextRequest) {
  const { topic } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: CLARIFYING_SYSTEM },
      { role: "user", content: `Я хочу изучить: ${topic}` },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(content);

  return NextResponse.json({ questions: parsed.questions ?? [] });
}
