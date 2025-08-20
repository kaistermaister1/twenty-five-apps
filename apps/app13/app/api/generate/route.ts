import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pantry: string[] = Array.isArray(body?.pantry) ? body.pantry : [];

    const prompt = `You are RecipeHelper. Given pantry items: ${pantry.join(", ")}.\nReturn EXACTLY TypeScript code for a constant named recipes, like:\nconst recipes = [\n  { id: "...", name: "...", ingredients: ["..."], preview: "...", instructions: "..." },\n  ... total 4 entries ...\n];\nNo prose, no backticks, only the code for that one const. Ensure each preview is a short line summarizing name + key ingredients. Instructions should be concise multi-line text.`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Using Responses API for latest SDK
    const response = await client.responses.create({
      model: "gpt-5-nano",
      input: prompt,
    });

    // Prefer output_text helper if available; fallback to choices/text
    // @ts-ignore - older SDKs might not have output_text
    const text: string | undefined = response.output_text ?? (response as any)?.choices?.[0]?.message?.content?.[0]?.text ?? (response as any)?.choices?.[0]?.text;

    if (!text) {
      return new Response(JSON.stringify({ error: "No response text" }), { status: 500 });
    }

    // Return raw code string for the frontend to eval in a safe scope
    return new Response(JSON.stringify({ code: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), { status: 500 });
  }
}


