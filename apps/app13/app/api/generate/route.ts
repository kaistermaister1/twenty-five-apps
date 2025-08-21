import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pantry: string[] = Array.isArray(body?.pantry) ? body.pantry : [];
    const count: number = Number.isFinite(body?.count) && body.count > 0 ? Math.min(10, Math.max(1, Math.floor(body.count))) : 4;
    const allowMissing: boolean = Boolean(body?.allowMissing);
    const notes: string = typeof body?.notes === 'string' ? body.notes.trim() : '';

    const staples = "You may assume common staples like salt, pepper, oil, butter, water, and sugar are available.";
    const missingRule = allowMissing
      ? "You MAY include up to 2 minor ingredients not in the pantry; if you add any, include them in the ingredients list and suffix them with (add)."
      : "Do NOT use any ingredients beyond the pantry and staples; choose recipes that can be made with what's listed.";

    const extra = notes ? `Additional preferences or constraints: ${notes}.` : "";

    const prompt = `You are RecipeHelper. Pantry items: ${pantry.join(", ")}. ${staples} ${missingRule} ${extra}\nReturn EXACTLY TypeScript code for a constant named recipes, like:\nconst recipes = [\n  { id: "...", name: "...", ingredients: ["..."], preview: "...", instructions: "..." },\n  ... total ${count} entries ...\n];\nNo prose, no backticks, only the code for that one const. Ensure each preview is a short line summarizing name + key ingredients. Instructions should be concise multi-line text.`;

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


