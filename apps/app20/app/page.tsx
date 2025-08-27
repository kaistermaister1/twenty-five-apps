"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PaperCanvas from "@/components/PaperCanvas";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";

type Token = "." | "-" | "/";

type PresenceState = {
  roomId: string | null;
  role: "host" | "guest" | null;
  code: string | null; // human code for pairing
};

// Utility to generate a short, copyable room code
function generateCode() {
  const words = "alpha,bravo,charlie,delta,echo,foxtrot,golf,hotel,india,juliet,kilo,lima,mike,november,oscar,papa,quebec,romeo,sierra,tango,uniform,victor,whiskey,xray,yankee,zulu".split(","
  );
  const pick = () => words[Math.floor(Math.random() * words.length)].slice(0, 3);
  return `${pick()}-${pick()}-${Math.floor(Math.random() * 90 + 10)}`;
}

export default function Page() {
  const [presence, setPresence] = useState<PresenceState>({ roomId: null, role: null, code: null });
  const [outgoingTokens, setOutgoingTokens] = useState<Token[]>([]);
  const [incomingTokens, setIncomingTokens] = useState<Token[]>([]);
  const pressStartRef = useRef<number | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const roomName = useMemo(() => (presence.code ? `morse-${presence.code}` : null), [presence.code]);

  // Morse timing: press < 200ms => dot, >= 200ms => dash. 600ms idle => word gap
  const DOT_THRESHOLD = 200;

  // Setup Supabase channel when we have a room name
  useEffect(() => {
    if (!roomName) return;
    const channel = supabase.channel(roomName, { config: { broadcast: { ack: true } } });

    channel.on("broadcast", { event: "token" }, (payload) => {
      const token = payload.payload.token as Token;
      setIncomingTokens((prev) => [...prev, token]);
    });

    channel.subscribe((status) => {
      // noop
    });

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomName]);

  const emitToken = useCallback((t: Token) => {
    setOutgoingTokens((prev) => [...prev, t]);
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "token", payload: { token: t } });
    }
  }, []);

  const onPressStart = useCallback(() => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    pressStartRef.current = Date.now();
  }, []);

  const onPressEnd = useCallback(() => {
    const start = pressStartRef.current;
    pressStartRef.current = null;
    if (!start) return;
    const duration = Date.now() - start;
    emitToken(duration < DOT_THRESHOLD ? "." : "-");
    // schedule word gap if idle after this symbol
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    gapTimerRef.current = setTimeout(() => {
      emitToken("/");
      gapTimerRef.current = null;
    }, 600);
  }, [emitToken]);

  const onWordGap = useCallback(() => {
    emitToken("/");
  }, [emitToken]);

  // Host / Join
  const host = useCallback(() => {
    const code = generateCode();
    setPresence({ roomId: code, role: "host", code });
  }, []);

  const join = useCallback((code: string) => {
    setPresence({ roomId: code, role: "guest", code });
  }, []);

  // UI helpers
  const [joinOpen, setJoinOpen] = useState(false);
  const joinInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (joinOpen) setTimeout(() => joinInputRef.current?.focus(), 0);
  }, [joinOpen]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">Morse Realtime</div>
        <div className="flex items-center gap-2">
          {roomName ? (
            <div className="rounded-lg bg-card px-3 py-2 text-sm shadow-soft">
              Linked: <span className="font-mono font-semibold">{presence.code}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={host} className="rounded-lg bg-secondary px-3 py-2 text-white shadow-soft active:translate-y-px">Host</button>
              <button onClick={() => setJoinOpen(true)} className="rounded-lg bg-accent px-3 py-2 text-white shadow-soft active:translate-y-px">Join</button>
            </div>
          )}
        </div>
      </header>

      <main className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl bg-card p-4 shadow-soft">
          <div className="mb-2 text-sm font-medium text-gray-600">Outgoing</div>
          <PaperCanvas tokens={outgoingTokens} />
        </section>

        <section className="rounded-xl bg-card p-4 shadow-soft">
          <div className="mb-2 text-sm font-medium text-gray-600">Incoming</div>
          <PaperCanvas tokens={incomingTokens} />
        </section>
      </main>

      <div className="mt-8 flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onPointerDown={onPressStart}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          className="h-28 w-28 rounded-full bg-primary text-white shadow-soft active:translate-y-px"
        >
          Press
        </motion.button>
        <div className="text-xs text-gray-500">Short press = dot •  Long press = dash —  Tap below for word gap</div>
        <button onClick={onWordGap} className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-muted">Insert word gap</button>
      </div>

      <AnimatePresence>
        {joinOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onClick={() => setJoinOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-md rounded-xl bg-white p-4 shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 text-lg font-semibold">Join a Host</div>
              <div className="text-sm text-gray-600 mb-3">Enter their code to link:</div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = joinInputRef.current?.value?.trim();
                  if (v) {
                    join(v);
                    setJoinOpen(false);
                  }
                }}
                className="flex gap-2"
              >
                <input ref={joinInputRef} placeholder="e.g. rom-uni-42" className="flex-1 rounded-lg border px-3 py-2" />
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-white shadow-soft">Link</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


