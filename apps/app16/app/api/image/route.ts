import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { idea } = (await req.json()) as { idea?: string };
    const description = (idea || "").trim();
    if (!description) return NextResponse.json({ error: "Missing idea" }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const client = new OpenAI({ apiKey });

    // Prefer Responses images tool if available in SDK; otherwise use Images API
    // Use a safety-forward, inclusive visual brief
    const basePrompt = `Create a modern, respectful mental health advertisement visual. ${description}. Avoid stigmatizing imagery. Use calming colors and accessible, legible typography. Center positivity and support.`;

    // Use Images API per latest docs; return a data URL for reliability
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: basePrompt,
      size: "1024x1024",
      n: 1,
    });
    const url = result.data?.[0]?.url;
    const b64 = (result.data?.[0] as any)?.b64_json;
    if (url) return NextResponse.json({ url });
    if (b64) return NextResponse.json({ url: `data:image/png;base64,${b64}` });
    return NextResponse.json({ error: "No image returned" }, { status: 500 });
  } catch (e: any) {
    const msg = e?.error?.message || e?.message || "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


