"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Play, Square, Sparkles, TimerReset } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type WorkoutItem = { id: string; title: string; instructions: string; seconds: number; completed?: boolean };

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"chat" | "workout">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Describe your goals, equipment, time, and any constraints." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [workout, setWorkout] = useState<WorkoutItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const canSend = input.trim().length > 0 && !sending;

  async function sendMessage() {
    if (!canSend) return;
    const newMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((m) => [...m, newMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, newMsg] }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Chat failed");
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      alert(e?.message || "Chat failed");
    } finally {
      setSending(false);
    }
  }

  async function generateWorkout() {
    setGenerating(true);
    try {
      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
      const data = await res.json();
      setWorkout(data.items);
      setActiveTab("workout");
    } catch (e: any) {
      alert(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="sticky top-0 z-20 mb-6 border-b bg-background/95 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Workout Planner</h1>
          <nav className="ml-auto flex gap-2">
            <button onClick={() => setActiveTab("chat")} className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "chat" ? "bg-primary text-white" : "border"}`}>Chat</button>
            <button onClick={() => setActiveTab("workout")} className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "workout" ? "bg-primary text-white" : "border"}`}>Workout</button>
          </nav>
        </div>
      </header>

      {activeTab === "chat" ? (
        <section className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="max-h-[50dvh] overflow-y-auto space-y-3 pr-1">
              {messages.map((m, i) => (
                <div key={i} className={`rounded-lg p-3 ${m.role === "assistant" ? "bg-muted" : "border"}`}>
                  <div className="text-xs text-muted-foreground mb-1">{m.role === "assistant" ? "Coach" : "You"}</div>
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="e.g., 30 min full-body, dumbbells, low impact"
                className="flex-1 rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={sendMessage} disabled={!canSend} aria-busy={sending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white shadow-soft disabled:opacity-50">
                {sending ? (<><Loader2 className="size-4 animate-spin" /> Sending…</>) : (<><Sparkles className="size-4" /> Send</>)}
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Ready to generate your workout?</div>
                <div className="text-xs text-muted-foreground">We use the chat context to build a plan.</div>
              </div>
              <button onClick={generateWorkout} disabled={generating} aria-busy={generating} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white shadow-soft disabled:opacity-50">
                {generating ? (<><Loader2 className="size-4 animate-spin" /> Generating…</>) : (<><TimerReset className="size-4" /> Generate workout</>)}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <WorkoutRunner items={workout} onUpdate={setWorkout} />
      )}
    </div>
  );
}

function WorkoutRunner({ items, onUpdate }: { items: WorkoutItem[]; onUpdate: (w: WorkoutItem[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  useEffect(() => {
    if (!items.length) setActiveId(null);
  }, [items.length]);

  return (
    <section className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No workout yet. Generate one from the Chat tab.</div>
      ) : (
        items.map((it, idx) => (
          <ExerciseBox
            key={it.id}
            item={it}
            isActive={activeId === it.id}
            onStart={() => setActiveId(it.id)}
            onComplete={() => {
              const next = items.map((x) => x.id === it.id ? { ...x, completed: true } : x);
              onUpdate(next);
              const nextIdx = next.findIndex((x) => x.id === it.id) + 1;
              if (nextIdx < next.length) setActiveId(next[nextIdx].id); else setActiveId(null);
            }}
          />
        ))
      )}
    </section>
  );
}

function ExerciseBox({ item, isActive, onStart, onComplete }: { item: WorkoutItem; isActive: boolean; onStart: () => void; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(item.seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(item.seconds);
    setRunning(false);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, [item.id, item.seconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(intervalRef.current!);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running]);

  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = Math.floor(remaining % 60).toString().padStart(2, "0");

  return (
    <div className={`rounded-xl border p-4 shadow-soft ${item.completed ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-medium">{item.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{item.instructions}</div>
        </div>
        <div className="text-right">
          <div className="font-mono tabular-nums text-lg">{minutes}:{seconds}</div>
          <div className="mt-2 flex justify-end gap-2">
            {!running ? (
              <button onClick={() => { onStart(); setRunning(true); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"><Play className="size-4" /> Start</button>
            ) : (
              <button onClick={() => setRunning(false)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"><Square className="size-4" /> Pause</button>
            )}
            <button onClick={onComplete} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-white"><CheckCircle2 className="size-4" /> Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}


