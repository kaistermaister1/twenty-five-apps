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

    const system = "You are an expert fitness coach. Ask clarifying questions. Keep messages concise and friendly.";
    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");
    const input = `System: ${system}\n${transcript}\nAssistant:`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-nano",
      input,
    });

    // @ts-ignore
    const text: string | undefined = (response as any)?.output_text
      ?? (response as any)?.choices?.[0]?.message?.content?.[0]?.text
      ?? (response as any)?.choices?.[0]?.text;
    if (!text) return NextResponse.json({ error: "No text" }, { status: 500 });

    return NextResponse.json({ reply: text.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


// test