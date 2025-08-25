import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages?: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const client = new OpenAI({ apiKey });

    const system = [
      "You are an expert fitness coach.",
      "Create a focused, specific, and concise workout based on the conversation.",
      "Return STRICT JSON only: { items: Array<{ id: string; title: string; instructions: string; seconds: number }> }.",
      "Exactly ONE exercise per item (no combos, no 'or' options, no lists).",
      "Instructions must be a single short sentence (<= 140 chars), action-oriented and clear.",
      "Produce 6-9 total items (warm-up 1-2, main 4-6, cool-down 1).",
      "Each 'seconds' is an integer duration for that exercise, typically 30-120; choose appropriately.",
      "Avoid unsafe advice; adapt to constraints in the conversation succinctly.",
    ].join(" ");

    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");
    const input = `System: ${system}\nConversation:\n${transcript}\nAssistant:`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-nano",
      input,
    });

    // @ts-ignore
    const text: string | undefined = (response as any)?.output_text
      ?? (response as any)?.choices?.[0]?.message?.content?.[0]?.text
      ?? (response as any)?.choices?.[0]?.text;
    if (!text) return NextResponse.json({ error: "No text" }, { status: 500 });

    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      const raw = (response as any)?.output?.[0]?.content?.[0]?.text;
      try { parsed = typeof raw === "string" ? JSON.parse(raw) : undefined; } catch {}
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
      return NextResponse.json({ error: "Invalid response" }, { status: 500 });
    }

    function sanitizeSentence(value: string): string {
      const normalized = String(value || "").replace(/\s+/g, " ").trim();
      const firstSentence = normalized.split(/(?<=[.?!])\s/)[0] || normalized;
      return firstSentence.slice(0, 140);
    }

    function sanitizeTitle(value: string): string {
      const text = String(value || "Exercise").replace(/[•*-].*$/g, "").replace(/\s+/g, " ").trim();
      // If title includes options, keep the first token before "/" or " or "
      const optionSplit = text.split(/\s+or\s+|\//i)[0];
      return optionSplit.slice(0, 60) || "Exercise";
    }

    const items = parsed.items
      .map((it: any, idx: number) => ({
        id: String(it.id || `ex-${idx + 1}`),
        title: sanitizeTitle(it.title),
        instructions: sanitizeSentence(it.instructions || "Maintain good form and breathe steadily."),
        seconds: (() => {
          const n = parseInt(it.seconds, 10);
          const clamped = isNaN(n) ? 60 : n;
          return Math.max(30, Math.min(180, clamped));
        })(),
      }))
      .filter((it: any) => it.title.trim().length > 0)
      .slice(0, 9);

    if (items.length === 0) return NextResponse.json({ error: "Empty workout" }, { status: 500 });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


