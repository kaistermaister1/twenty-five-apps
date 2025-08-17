"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Bot, User, Plus } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ user: string; assistant: string }>>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return; // avoid wiping UI on transient errors
      const data = await res.json();
      const pairs: Array<{ user: string; assistant: string }> = data.messages || [];
      setMessages(pairs);
      const last = pairs.length ? pairs[pairs.length - 1] : null;
      setIsThinking(!!last && (!last.assistant || last.assistant.trim() === ""));
    } catch (e) {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 1500);
    return () => clearInterval(id);
  }, [fetchState]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const canSend = useMemo(() => input.trim().length > 0 && !submitting, [input, submitting]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || isThinking) return;
    setSubmitting(true);
    const text = input.trim();
    setInput("");
    // optimistic UI update
    setMessages((prev) => [...prev, { user: text, assistant: "" }]);
    setIsThinking(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      // fetch happens via polling; avoid immediate re-fetch to reduce race
    } finally {
      setSubmitting(false);
    }
  };

  const onNewChat = async () => {
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      setMessages([]);
      setIsThinking(false);
    } catch {}
  };

  useEffect(() => {
    // Clear chat when the page is refreshed/loaded as requested
    onNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Bot className="size-5" />
            <div className="flex flex-col leading-tight">
              <span>KChat</span>
              <span className="text-xs text-muted-foreground">All purpose mysterious AI Agent.</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onNewChat} className="gap-1">
            <Plus className="size-4" /> New Chat
          </Button>
        </header>

        <div className="rounded-md border bg-background">
          <ScrollArea className="h-[60vh] p-4" viewportRef={scrollRef}>
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {/* User on the right */}
                  <div className="flex items-start gap-2 justify-end">
                    <div className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm max-w-[80%]">
                      {m.user}
                    </div>
                    <User className="size-5 mt-0.5 opacity-70" />
                  </div>

                  {/* Assistant on the left (only when present) */}
                  <AnimatePresence initial={false}>
                    {m.assistant ? (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-start gap-2"
                      >
                        <Bot className="size-5 mt-0.5 opacity-70" />
                        <div className="rounded-md bg-card px-3 py-2 text-sm shadow-sm max-w-[80%]">
                          {m.assistant}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ))}

              <AnimatePresence>
                {isThinking ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Loader2 className="size-4 animate-spin" />
                    <span>Assistant is thinking…</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <form onSubmit={onSubmit} className="p-3 border-t flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message"
              autoComplete="off"
              disabled={isThinking}
            />
            <Button type="submit" disabled={!canSend || isThinking}>
              <Send className="size-4 mr-1" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
