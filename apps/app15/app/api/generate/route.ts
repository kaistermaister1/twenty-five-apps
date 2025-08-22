import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Mode = "morning" | "night";

export async function POST(req: NextRequest) {
  try {
    const { mode } = (await req.json()) as { mode: Mode };
    if (mode !== "morning" && mode !== "night") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const weather = await fetchWeather();

    const system = mode === "morning"
      ? "You are a concise, optimistic weatherman and motivational coach. Keep under 20 seconds of speech."
      : "You are a compassionate coach for nighttime reflection. Offer kind, motivating words about the user's efforts today.";

    const user = mode === "morning"
      ? `Weather data: ${JSON.stringify(weather)}\nTask: Write a short, upbeat report for the day with 1-2 motivating lines. Keep it < 20s spoken.`
      : `Weather data: ${JSON.stringify(weather)}\nTask: Write a brief, soothing message praising the user's day and encouraging good rest. Avoid weather specifics.`;

    const voiceResult = await callOpenAiText(system, user);
    const voiceText = voiceResult.text;

    const musicUser = mode === "morning"
      ? `Pop style upbeat 30s song about today's weather and inspiring the user. One short line (<160 chars). Do not mention instruments or say instrumental.`
      : `Calm pop 30s song for night with gentle nods to today's weather and uplifting praise. One short line (<160 chars). Do not mention instruments or say instrumental.`;

    const musicResult = await callOpenAiText(
      "You generate concise creative briefs for a music generator.",
      musicUser
    );
    const musicPromptRaw = musicResult.text;
    const musicPrompt = condenseForMusic(musicPromptRaw, 380);

    return NextResponse.json({
      voiceText,
      musicPrompt,
      weather,
      debug: {
        system,
        user,
        musicUser,
        model: process.env.OPENAI_MODEL || "gpt-5-nano",
        openaiResponses: {
          voice: voiceResult.raw,
          music: musicResult.raw,
        },
        openaiChatFallback: {
          voice: null,
          music: null,
        },
        musicPromptRaw,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error", stage: "generate" }, { status: 500 });
  }
}

async function fetchWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.WEATHER_LAT;
  const lon = process.env.WEATHER_LON;
  const city = process.env.WEATHER_CITY;

  if (!apiKey) {
    return { skipped: true, reason: "Missing OPENWEATHER_API_KEY" };
  }

  const base = "https://api.openweathermap.org/data/2.5/weather";
  const url = city
    ? `${base}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    : `${base}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { skipped: true, reason: `Weather fetch failed (${res.status})` };
    return res.json();
  } catch (e: any) {
    return { skipped: true, reason: "Weather request error" };
  }
}

async function callOpenAiText(system: string, user: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-nano";
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const client = new OpenAI({ apiKey });
  const prompt = `System: ${system}\nUser: ${user}\nAssistant:`;
  // Follow the exact pattern used in app13's route.ts
  const response = await client.responses.create({
    model,
    input: prompt,
  });
  // Prefer output_text helper if available; fallback to choices/text
  // @ts-ignore - older SDKs might not have output_text
  const text: string | undefined = (response as any).output_text
    ?? (response as any)?.choices?.[0]?.message?.content?.[0]?.text
    ?? (response as any)?.choices?.[0]?.text;
  if (!text || !text.trim()) throw new Error("No text returned");
  return { text: text.trim(), raw: response, fallbackRaw: undefined } as const;
}

function condenseForMusic(text: string, maxChars: number): string {
  let t = text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
  if (t.length > maxChars) t = t.slice(0, maxChars - 1).trimEnd() + "…";
  return t;
}


