import { NextResponse } from "next/server";

type FontFixRequest = {
  text?: string;
  fontId?: string;
  layoutMode?: "compact" | "focus" | "premium";
};

const modelName = process.env.OPENAI_MODEL ?? "gpt-5.5";

function createHeuristicSuggestion(payload: Required<Pick<FontFixRequest, "text" | "fontId" | "layoutMode">>) {
  const plainText = payload.text.replace(/\s+/g, "");
  const longText = plainText.length > 16;
  const denseText = plainText.length > 24 || /[，。！？；：]/.test(plainText);

  return {
    provider: "heuristic",
    summary: longText
      ? "这段内容更适合放在更安静的版式里，先看结构，再看风格。"
      : "这段内容适合试试更有性格的字体，再观察笔画落点。",
    suggestedFontId: denseText ? "songti" : payload.fontId,
    suggestedLayout: longText ? "focus" : payload.layoutMode,
    rewrite: plainText.slice(0, 48),
    confidence: Math.min(95, 72 + Math.min(18, plainText.length)),
    notes: [
      denseText ? "标点密集时，宋体或仿宋更清楚。" : "可以试一版更显笔意的字体。",
      longText ? "预览区放大后更容易检查字间节奏。" : "短句适合更大胆的字体变化。",
      "后续接上真实模型后，这个接口形状可以直接复用。",
    ],
  };
}

function extractJsonLikeText(value: string) {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return value.slice(firstBrace, lastBrace + 1);
}

export async function POST(request: Request) {
  let body: FontFixRequest = {};

  try {
    body = (await request.json()) as FontFixRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim();
  const fontId = body.fontId ?? "kaiti";
  const layoutMode = body.layoutMode ?? "focus";

  if (!text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(createHeuristicSuggestion({ text, fontId, layoutMode }));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "你是 z-type 的字体修正助手。请根据文本长度、版式与字体气质，给出简洁、可执行的 JSON 建议。输出必须只包含 JSON，不要附带解释文本。",
          },
          {
            role: "user",
            content: JSON.stringify({
              text,
              fontId,
              layoutMode,
              output: {
                provider: "openai",
                summary: "string",
                suggestedFontId: "string",
                suggestedLayout: "compact|focus|premium",
                rewrite: "string",
                confidence: "number",
                notes: ["string"],
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const raw = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const content = raw.choices?.[0]?.message?.content ?? "";
    const jsonText = extractJsonLikeText(content);

    if (!jsonText) {
      throw new Error("OpenAI response missing JSON payload.");
    }

    const parsed = JSON.parse(jsonText) as {
      provider?: string;
      summary?: string;
      suggestedFontId?: string;
      suggestedLayout?: "compact" | "focus" | "premium";
      rewrite?: string;
      confidence?: number;
      notes?: string[];
    };

    return NextResponse.json({
      provider: parsed.provider ?? "openai",
      summary: parsed.summary ?? "已生成字体修正建议。",
      suggestedFontId: parsed.suggestedFontId ?? fontId,
      suggestedLayout: parsed.suggestedLayout ?? layoutMode,
      rewrite: parsed.rewrite ?? text,
      confidence: parsed.confidence ?? 80,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    });
  } catch {
    return NextResponse.json(createHeuristicSuggestion({ text, fontId, layoutMode }));
  }
}
