import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64: string | undefined = body?.image;
    if (!imageBase64) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const inputContent = [
      { type: "input_text", text: "Extract classes from this image and return JSON only with the schema: { classes: Array<{ id: string, name: string, daysOfWeek: string[], startTime: string, endTime: string, startDate?: string }> }. Use MO,TU,WE,TH,FR,SA,SU and 24h HH:MM times." },
      { type: "input_image", image_url: imageBase64 },
    ];

    // Prefer Responses API; fall back to Chat Completions if needed.
    let raw = "{}";
    try {
      const resp = await client.responses.create({
        model: "gpt-5-nano",
        input: [ { role: "user", content: inputContent as any } ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_output_tokens: 800,
      } as any);
      raw = (resp?.output_text as string) ?? JSON.stringify(resp);
    } catch {
      const messages = [
        { role: "system", content: "You extract schedules into strict JSON." },
        { role: "user", content: inputContent as any },
      ];
      const response = await client.chat.completions.create({
        model: "gpt-5-nano",
        messages: messages as any,
        temperature: 0,
        response_format: { type: "json_object" },
        max_tokens: 800,
      });
      raw = response.choices?.[0]?.message?.content ?? "{}";
    }

    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const classes = Array.isArray(parsed?.classes) ? parsed.classes : [];
    return NextResponse.json({ classes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to parse" }, { status: 500 });
  }
}


