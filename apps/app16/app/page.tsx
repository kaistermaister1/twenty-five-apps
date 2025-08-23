"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ImageIcon, Sparkles, Loader2 } from "lucide-react";

type Analysis = {
  audience: string;
  concept: string;
  times: string[];
};

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [useFeedback, setUseFeedback] = useState(true);
  const [details, setDetails] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  const canAnalyze = prompt.trim().length > 0 && !loading;
  const canGenerate = !genLoading && (useFeedback ? Boolean(analysis) : details.trim().length > 0);

  const combinedIdea = useMemo(() => {
    if (useFeedback && analysis) {
      const base = `${analysis.concept} — Target: ${analysis.audience}.`;
      return details.trim() ? `${base} Extra: ${details.trim()}` : base;
    }
    return details.trim();
  }, [useFeedback, analysis, details]);

  async function runAnalysis() {
    setLoading(true);
    setAnalysis(null);
    setImageUrl(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        let msg = "Analysis failed";
        try { const j = await res.json(); msg = j?.error || msg; } catch { msg = await res.text(); }
        throw new Error(msg);
      }
      const data = await res.json();
      setAnalysis(data);
      // scroll to next section
      document.getElementById("adgen")?.scrollIntoView({ behavior: "smooth" });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateAd() {
    setGenLoading(true);
    setImageUrl(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: combinedIdea }),
      });
      if (!res.ok) {
        let msg = "Image generation failed";
        try { const j = await res.json(); msg = j?.error || msg; } catch { msg = await res.text(); }
        throw new Error(msg);
      }
      const { url } = await res.json();
      setImageUrl(url);
      setTimeout(() => linkRef.current?.focus(), 50);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Image generation failed");
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="sticky top-0 z-20 mb-6 border-b bg-background/95 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Mental Health Advertising</h1>
          <p className="text-sm text-muted-foreground">Plan and visualize effective, ethical ads.</p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Describe your advertising goal</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Promote an online therapy app to college students during finals week"
            className="w-full resize-none rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={runAnalysis}
              disabled={!canAnalyze}
              aria-busy={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white shadow-soft disabled:opacity-50"
            >
              {loading ? (<><Loader2 className="size-4 animate-spin" /> Analyzing…</>) : (<><Sparkles className="size-4" /> Analyze</>)}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border bg-card p-4 shadow-soft"
            >
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">AI suggestion</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Target audience</div>
                  <div className="mt-1 text-sm">{analysis.audience}</div>
                </div>
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">Ad concept</div>
                  <div className="mt-1 text-sm">{analysis.concept}</div>
                </div>
                <div className="rounded-lg border p-3 sm:col-span-3">
                  <div className="text-xs text-muted-foreground">Top posting times</div>
                  <div className="mt-1 text-sm">{analysis.times.join(", ")}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section id="adgen" className="mt-8 space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <h2 className="mb-3 text-base font-medium">Generate advertisement</h2>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useFeedback} onChange={(e) => setUseFeedback(e.target.checked)} />
            Use AI suggestion above
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={useFeedback ? "Optional: add specifics (colors, mood, formats)…" : "Or write a completely new ad idea"}
            className="mt-2 w-full resize-none rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={generateAd}
              disabled={!canGenerate}
              aria-busy={genLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white shadow-soft disabled:opacity-50"
            >
              {genLoading ? (<><Loader2 className="size-4 animate-spin" /> Generating…</>) : (<><ImageIcon className="size-4" /> Generate ad</>)}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border bg-card p-4 shadow-soft"
            >
              <img src={imageUrl} alt="Generated ad" className="mx-auto max-h-[480px] w-full rounded-lg object-contain" />
              <div className="mt-3 flex justify-center">
                <a
                  ref={linkRef}
                  href={imageUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2"
                >
                  <Download className="size-4" /> Download
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}


