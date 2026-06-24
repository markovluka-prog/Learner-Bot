import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL } from "@/lib/openrouter";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export async function POST(req: NextRequest) {
  const { question, topic, context, history } = await req.json();

  if (!question || !topic) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const system = `Ты дружелюбный учитель который объяснил тему "${topic}".
Веди диалог с учеником — помни что было сказано раньше в разговоре.
Отвечай:
- Простыми словами, как для ребёнка 10-12 лет
- С конкретными примерами из жизни
- По делу, без лишней воды (3-6 предложений)
- На русском языке

Краткое содержание учебной страницы:
${context ?? ""}`;

  const historyMessages = (history ?? []).map((m: Message) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.text,
  }));

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      ...historyMessages,
      { role: "user", content: question },
    ],
    max_tokens: 500,
  });

  const answer = response.choices[0].message.content ?? "";
  return NextResponse.json({ answer });
}
