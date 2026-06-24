import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  const { question, topic, context } = await req.json();

  if (!question || !topic) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const system = `Ты дружелюбный учитель который только что объяснил тему "${topic}".
Пользователь задаёт уточняющий вопрос. Отвечай:
- Простыми словами, как для ребёнка 10-12 лет
- С конкретными примерами из жизни
- Коротко и по делу (3-5 предложений максимум)
- На русском языке

Краткое содержание того что уже было объяснено:
${context ?? ""}`;

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
    max_tokens: 400,
  });

  const answer = response.choices[0].message.content ?? "";
  return NextResponse.json({ answer });
}
