"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SunMedium, Moon, Loader2 } from "lucide-react";

type Mode = "morning" | "night" | null;

export default function Page() {
  const [mode, setMode] = useState<Mode>(null);
  const [loading, setLoading] = useState(false);
  const audioVoiceRef = useRef<HTMLAudioElement | null>(null);
  const audioMusicRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);

  const handleStart = (m: Mode) => {
    setMode(m);
  };

  useEffect(() => {
    if (!mode) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // iOS autoplay requires user gesture + unlocked audio context
        if (!audioCtxRef.current) {
          try {
            const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (Ctx) audioCtxRef.current = new Ctx();
          } catch {}
        }
        if (audioCtxRef.current?.state === "suspended") {
          await audioCtxRef.current.resume().catch(() => {});
        }

        setStage("generate:start");
        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });
        if (!genRes.ok) {
          const err = await genRes.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to generate prompts");
        }
        const gen = await genRes.json() as {
          voiceText: string;
          musicPrompt: string;
          weather: unknown;
          debug?: any;
        };
        setDebug({ stage: "generated", details: gen.debug, weather: gen.weather, voiceText: gen.voiceText, musicPrompt: gen.musicPrompt });

        setStage("tts:start");
        const voiceRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: gen.voiceText }),
        });
        if (!voiceRes.ok) {
          const txt = await voiceRes.text().catch(() => "");
          throw new Error(`TTS failed ${txt ? `- ${txt}` : ""}`.trim());
        }
        const voiceBlob = await voiceRes.blob();
        const voiceUrl = URL.createObjectURL(voiceBlob);
        if (audioVoiceRef.current) {
          audioVoiceRef.current.src = voiceUrl;
        }

        // Create music in background but wait for TTS to fully end before play
        setStage("music:start");
        const musicPromise = (async () => {
          const musicRes = await fetch("/api/music", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: gen.musicPrompt }),
          });
          if (!musicRes.ok) {
            const txt = await musicRes.text().catch(() => "");
            throw new Error(`Music generation failed ${txt ? `- ${txt}` : ""}`.trim());
          }
          const musicBlob = await musicRes.blob();
          return URL.createObjectURL(musicBlob);
        })();

        // Play the voice report fully first
        setStage("tts:play");
        await new Promise<void>((resolve, reject) => {
          const el = audioVoiceRef.current;
          if (!el) return resolve();
          const onEnded = () => { el.removeEventListener("ended", onEnded); resolve(); };
          el.addEventListener("ended", onEnded);
          el.play().catch(reject);
        });

        // After voice ends, play the generated track
        setStage("music:await");
        const musicUrl = await musicPromise;
        if (audioMusicRef.current) {
          audioMusicRef.current.src = musicUrl;
          setStage("music:play");
          await audioMusicRef.current.play();
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
        setStage("error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [mode]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      <BackgroundVisuals mode={mode} />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="glass max-w-xl w-full rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">Rise & Rest</h1>
            <button
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              onClick={() => setShowDebug((v) => !v)}
              aria-label="Toggle settings"
              title="Settings"
            >
              {showDebug ? "Hide debug" : "Show debug"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FancyButton
              label="Good morning"
              Icon={SunMedium}
              onClick={() => handleStart("morning")}
              disabled={loading}
            />
            <FancyButton
              label="Good night"
              Icon={Moon}
              onClick={() => handleStart("night")}
              disabled={loading}
            />
          </div>

          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-2 text-white/80"
              >
                <Loader2 className="animate-spin" />
                Preparing your personalized experience…
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 text-red-300 text-sm">
              {error}
              {error.includes("HTTP 402") && (
                <div className="mt-2 text-yellow-300 text-xs">
                  ElevenLabs Music requires a paid plan and Music API access. See their quickstart docs to enable access.
                  {" "}
                  <a className="underline" href="https://elevenlabs.io/docs/cookbooks/music/quickstart" target="_blank" rel="noreferrer">Music quickstart</a>
                </div>
              )}
            </div>
          )}

          <audio ref={audioVoiceRef} className="hidden" playsInline />
          <audio ref={audioMusicRef} className="hidden" playsInline />

          {showDebug && (
            <div className="mt-6 rounded-xl border border-white/15 bg-black/30 p-4 text-sm max-h-80 overflow-auto">
              <div className="mb-2 font-medium">Debug</div>
              <div className="grid gap-1">
                <div><span className="text-white/60">stage:</span> {stage ?? "idle"}</div>
                {error && <div className="text-red-300">error: {error}</div>}
                {debug?.details && (
                  <details className="mt-2 max-h-48 overflow-auto">
                    <summary className="cursor-pointer text-white/80">openai prompts</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-white/70">{JSON.stringify(debug.details, null, 2)}</pre>
                  </details>
                )}
                {debug?.weather && (
                  <details className="mt-2 max-h-48 overflow-auto">
                    <summary className="cursor-pointer text-white/80">weather</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-white/70">{JSON.stringify(debug.weather, null, 2)}</pre>
                  </details>
                )}
                {debug?.voiceText && (
                  <details className="mt-2 max-h-48 overflow-auto">
                    <summary className="cursor-pointer text-white/80">voiceText</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-white/70">{debug.voiceText}</pre>
                  </details>
                )}
                {debug?.musicPrompt && (
                  <details className="mt-2 max-h-48 overflow-auto">
                    <summary className="cursor-pointer text-white/80">musicPrompt</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-white/70">{debug.musicPrompt}</pre>
                  </details>
                )}
                {debug?.details?.openaiResponses && (
                  <details className="mt-2 max-h-48 overflow-auto">
                    <summary className="cursor-pointer text-white/80">openaiResponses</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-white/70">{JSON.stringify(debug.details.openaiResponses, null, 2)}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FancyButton({ label, Icon, onClick, disabled }: { label: string; Icon: any; onClick: () => void; disabled?: boolean; }) {
  return (
    <button
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left transition hover:bg-white/15 disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
        <div className="absolute -inset-[40%] bg-gradient-to-tr from-fuchsia-500/40 via-indigo-400/30 to-sky-400/40 blur-2xl" />
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-lg font-medium">{label}</div>
          <div className="text-xs text-white/70">Tap to begin</div>
        </div>
      </div>
    </button>
  );
}

function BackgroundVisuals({ mode }: { mode: Mode }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.12),transparent)]" />
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

      <AnimatePresence>
        {mode === "morning" && (
          <motion.div
            key="morning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-b from-yellow-400/20 to-transparent"
          />
        )}
        {mode === "night" && (
          <motion.div
            key="night"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-b from-slate-700/30 to-transparent"
          />
        )}
      </AnimatePresence>
    </div>
  );
}


