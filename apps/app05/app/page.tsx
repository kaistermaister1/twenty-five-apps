"use client";

import { useEffect, useMemo, useState } from "react";

type WinnerResult = {
  raceName: string;
  raceUrl: string;
  editionYear: number;
  date: string; // e.g. "2025-04-12"
  winner: string;
  winnerUrl?: string;
  categoryT: number;
};

type ApiResponse = {
  results: WinnerResult[];
  meta?: {
    year: number;
    categoriesTried: number;
    racePagesVisited: number;
    raceLinksByCategory: Record<string, string[]>;
    visitedRaceUrls: string[];
  };
};

export default function HomePage() {
  const [birthday, setBirthday] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WinnerResult[]>([]);
  const [raw, setRaw] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  const prettyDate = useMemo(() => {
    if (!birthday) return "";
    // Parse birthday (YYYY-MM-DD) as a local date to avoid TZ off-by-one
    const [y, m, d] = birthday.split("-").map((v) => parseInt(v, 10));
    const local = new Date(y, (m || 1) - 1, d || 1);
    return local.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [birthday]);

  function formatIsoDate(iso: string): string {
    if (!iso) return "";
    // Force Z to avoid local TZ shifting
    const d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
    if (!birthday) return;
    setLoading(true);
    setProgress(5);
    setShowProgress(true);
    try {
      const year = new Date(birthday).getUTCFullYear();
      const url = `/api/winners?birthday=${encodeURIComponent(birthday)}&year=${year}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      setResults(data.results);
      setRaw(data);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
      setProgress(100);
      setTimeout(() => setShowProgress(false), 800);
    }
  }

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 3 + Math.random() * 4, 90));
    }, 250);
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="text-center mt-10 mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-brand-700 to-brand-400 bg-clip-text text-transparent">
          Cycling Winners on Your Birthday
        </h1>
        <p className="mt-3 text-gray-600">
          Enter your birthday and discover which pro cyclists won a race on that day.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
            <input
              type="date"
              className="input"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary h-10 md:h-11" disabled={loading}>
            {loading ? "Searching…" : "Find Winners"}
          </button>
        </div>
        {showProgress && (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {progress < 100
                ? "Scraping firstcycling.com. Please wait around 1 minute for results..."
                : "Finalizing results"}
            </div>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-6 card p-4 text-red-700 bg-red-50 border-red-200">
          {error}
        </div>
      )}

      {!loading && !!birthday && raw && results.length === 0 && (
        <div className="mt-6 card p-4 text-gray-700 bg-gray-50 border-gray-200">
          No winners were found for {prettyDate}. Try another year or check back later.
        </div>
      )}

      {!!results.length && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            Winners on {prettyDate}
          </h2>
          <ul className="grid gap-3">
            {results.map((r, idx) => (
              <li key={idx} className="card p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <a
                      href={r.raceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {r.raceName} ({r.editionYear})
                    </a>
                    <div className="text-sm text-gray-600">{formatIsoDate(r.date)}</div>
                  </div>
                  <div className="text-gray-900">
                    Winner: {r.winnerUrl ? (
                      <a href={r.winnerUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                        {r.winner}
                      </a>
                    ) : (
                      <span className="font-medium">{r.winner}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!raw && (
        <div className="mt-6">
          <button
            type="button"
            className="text-sm text-brand-700 hover:underline"
            onClick={() => setShowDebug((v) => !v)}
          >
            {showDebug ? "Hide scraped data" : "Show scraped data"}
          </button>
        </div>
      )}

      {raw && showDebug && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">All scraped data</h2>
          <div className="card overflow-hidden">
            <pre className="max-h-[480px] overflow-auto p-4 text-sm leading-6 bg-white">{JSON.stringify(raw, null, 2)}</pre>
          </div>
          {!!raw.meta?.visitedRaceUrls?.length && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-2">Visited race URLs</h3>
              <ul className="card p-4 grid gap-2 max-h-[320px] overflow-auto">
                {raw.meta.visitedRaceUrls.map((u, i) => (
                  <li key={i} className="truncate">
                    <a href={u} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}


