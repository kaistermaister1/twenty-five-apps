import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const client = new OpenAI({ apiKey });

    const system = "You are an expert ad strategist for mental health services. Respond concisely.";
    const user = `Goal/context: ${prompt}\nReturn JSON with keys: audience (string), concept (string), times (array of 3 short strings).`;
    const input = `System: ${system}\nUser: ${user}\nAssistant:`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-nano",
      input,
    });

    // @ts-ignore
    const text: string | undefined = response.output_text
      ?? (response as any)?.choices?.[0]?.message?.content?.[0]?.text
      ?? (response as any)?.choices?.[0]?.text;
    if (!text) return NextResponse.json({ error: "No text" }, { status: 500 });

    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      const raw = (response as any)?.output?.[0]?.content?.[0]?.text;
      try { parsed = typeof raw === "string" ? JSON.parse(raw) : undefined; } catch {}
    }
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid response" }, { status: 500 });
    }

    const audience = String(parsed.audience || "").trim();
    const concept = String(parsed.concept || "").trim();
    const times = Array.isArray(parsed.times) ? parsed.times.map((t: any) => String(t)) : [];
    if (!audience || !concept || !times.length) {
      return NextResponse.json({ error: "Incomplete response" }, { status: 500 });
    }

    return NextResponse.json({ audience, concept, times });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


