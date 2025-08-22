import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };
    if (!prompt) return new Response("Missing prompt", { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY as string;
    if (!apiKey) return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });

    const doRequest = async (ms: number) => {
      const r = await fetch("https://api.elevenlabs.io/v1/music/compose", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({ prompt, music_length_ms: ms }),
      });
      return r;
    };

    let res = await doRequest(30000);
    if (!res.ok && (res.status === 422 || res.status === 400)) {
      // Fallback to 15s if provider rejects 30s
      const tryShort = await doRequest(15000);
      if (tryShort.ok) {
        const ab = await tryShort.arrayBuffer();
        return new Response(Buffer.from(new Uint8Array(ab)), {
          headers: { "Content-Type": "audio/mpeg", "X-Music-Length": "15000" },
        });
      }
      res = tryShort; // surface the short attempt error below
    }

    if (!res.ok) {
      // Surface ElevenLabs JSON error if available
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err?.error) msg = typeof err.error === "string" ? err.error : JSON.stringify(err.error);
        else if (err?.message) msg = err.message;
      } catch {}
      return new Response(`Music generation failed: ${msg}`, { status: 500 });
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Response(Buffer.from(new Uint8Array(arrayBuffer)), {
      headers: { "Content-Type": "audio/mpeg", "X-Music-Length": "30000" },
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Server error";
    return new Response(`Music generation failed: ${msg}`, { status: 500 });
  }
}


