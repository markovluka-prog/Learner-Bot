import { NextRequest, NextResponse } from "next/server";
import { EPub } from "epub-gen-memory";

interface Section {
  heading: string;
  content: string;
  type: "text" | "mermaid";
}

interface Practice {
  question: string;
  hint: string;
}

interface LearnerContent {
  title: string;
  description: string;
  sections: Section[];
  practice: Practice[];
  summary: string;
}

function sectionToHtml(section: Section): string {
  if (section.type === "mermaid") {
    // Mermaid не рендерится в EPUB — показываем как текстовую схему
    const lines = section.content
      .split(/;|\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !l.startsWith("graph") && !l.startsWith("sequenceDiagram"));
    return `<h2>${section.heading}</h2>
<div style="font-family: monospace; background: #f5f5f5; padding: 12px; border-left: 3px solid #888;">
${lines.map((l) => `<p style="margin:4px 0">${l}</p>`).join("")}
</div>`;
  }

  const paragraphs = section.content
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
    .join("\n");

  return `<h2>${section.heading}</h2>\n${paragraphs}`;
}

export async function POST(req: NextRequest) {
  const content: LearnerContent = await req.json();

  const summaryItems = content.summary
    .split(/\.\s+|;\s+|\n/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);

  const chapters = [
    {
      title: "Введение",
      content: `<h1>${content.title}</h1>
<div style="background:#f9f6ee;padding:16px;border-left:4px solid #c8a84b;">
<p><em>${content.description}</em></p>
</div>`,
    },
    ...content.sections.map((s) => ({
      title: s.heading,
      content: sectionToHtml(s),
    })),
    {
      title: "Практика",
      content: `<h2>Практика и упражнения</h2>
${content.practice
  .map(
    (p, i) => `<div style="margin-bottom:20px;">
<p><strong>${i + 1}. ${p.question}</strong></p>
<p style="color:#555;font-style:italic;">Подсказка: ${p.hint}</p>
</div>`
  )
  .join("\n")}`,
    },
    {
      title: "Ключевые выводы",
      content: `<h2>Ключевые выводы</h2>
<ul>
${summaryItems.map((s) => `<li>${s}</li>`).join("\n")}
</ul>`,
    },
  ];

  const epub = await new EPub(
    {
      title: content.title,
      author: "Learner-Bot",
      lang: "ru",
      css: `
        body { font-family: Georgia, serif; line-height: 1.7; margin: 1em; }
        h1 { font-size: 1.8em; margin-bottom: 0.5em; }
        h2 { font-size: 1.3em; margin-top: 1.5em; }
        p { margin: 0.8em 0; }
        ul { padding-left: 1.5em; }
        li { margin: 0.4em 0; }
      `,
    },
    chapters
  ).genEpub();

  return new NextResponse(epub.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${content.title.replace(/\s+/g, "-").toLowerCase()}.epub"`,
    },
  });
}
