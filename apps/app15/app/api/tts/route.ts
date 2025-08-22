import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string };
    if (!text) return new Response("Missing text", { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY as string;
    // Default to ElevenLabs public "Rachel" voice ID if none provided
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    // ElevenLabs TTS REST
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) return new Response("TTS failed", { status: 500 });
    const arrayBuffer = await res.arrayBuffer();
    return new Response(Buffer.from(arrayBuffer), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (e: any) {
    return new Response(e?.message || "Server error", { status: 500 });
  }
}


