import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Flashcard = { id: string; front: string; back: string; tags: string[]; group: string };

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const client = new OpenAI({ apiKey });

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = Buffer.from(bytes).toString("base64");
    const mime = (file as any).type || "image/png";
    const dataUrl = `data:${mime};base64,${base64}`;

    const system = [
      "You are an expert study coach.",
      "Extract concise Q/A flashcards from the provided image.",
      "Return STRICT JSON only: { cards: Array<{ id: string; front: string; back: string; tags?: string[]; group?: string }> }.",
      "Front is the question/prompt; Back is the concise answer.",
      "Prefer 8-20 cards. Keep each side under 240 characters.",
      "Do not include any commentary or markdown; JSON only.",
    ].join(" ");

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-nano",
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Create flashcards from this image. Respond with JSON only." },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
    } as any);

    // @ts-ignore: accommodate multiple SDK shapes
    const text: string | undefined = (response as any)?.output_text
      ?? (response as any)?.choices?.[0]?.message?.content?.[0]?.text
      ?? (response as any)?.choices?.[0]?.text
      ?? (response as any)?.output?.[0]?.content?.[0]?.text;

    if (!text) return NextResponse.json({ error: "No text" }, { status: 500 });

    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      const raw = (response as any)?.output?.[0]?.content?.[0]?.text;
      try { parsed = typeof raw === "string" ? JSON.parse(raw) : undefined; } catch {}
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.cards)) {
      return NextResponse.json({ error: "Invalid response" }, { status: 500 });
    }

    const cards: Flashcard[] = parsed.cards.map((c: any, idx: number) => ({
      id: String(c.id || `card-${idx + 1}`),
      front: sanitizeSide(c.front),
      back: sanitizeSide(c.back),
      tags: Array.isArray(c.tags) ? c.tags.map((t: any) => String(t)).slice(0, 8) : [],
      group: typeof c.group === "string" ? c.group.slice(0, 60) : "Ungrouped",
    })).filter((c: Flashcard) => c.front && c.back);

    return NextResponse.json({ cards });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

function sanitizeSide(value: unknown): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.slice(0, 240);
}


