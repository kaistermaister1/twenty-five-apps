"use client";

import { useEffect } from "react";

export default function CallbackPage() {
  useEffect(() => {
    // logic handled in root page effect; keep a tiny UX hint here
  }, []);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="text-center text-white/80">Completing Spotify sign-in…</div>
    </main>
  );
}


