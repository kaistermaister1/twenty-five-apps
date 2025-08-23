"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Track = {
  id: string;
  name: string;
  preview_url: string | null;
  external_urls: { spotify: string };
  artists: { name: string }[];
  album: { images: { url: string; width: number; height: number }[] };
};

const SCOPES = "user-read-email"; // minimal scope for profile fetch if needed

function generateRandomQuery(): { q: string; offset: number } {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  const ch = charset[Math.floor(Math.random() * charset.length)];
  const q = ch; // simple random char search
  const offset = Math.floor(Math.random() * 900); // 0..899
  return { q, offset };
}

async function sha256Base64Url(input: string) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier(length = 64) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let out = "";
  for (let i = 0; i < length; i++) out += possible.charAt(Math.floor(Math.random() * possible.length));
  return out;
}

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    return base + "/callback";
  }, []);

  const beginLogin = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/spotify-client-id");
      const { clientId } = await res.json();
      if (!clientId) { setError("Missing Spotify client id"); return; }
      const verifier = randomVerifier();
      localStorage.setItem("spotify_verifier", verifier);
      const resp = await fetch("/api/spotify-auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code_verifier: verifier, redirect_uri: redirectUri, scope: SCOPES }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data?.error || "Auth URL error"); return; }
      const { url } = data;
      window.location.href = url as string;
    } catch (e: any) {
      setError(e?.message || "Login error");
    }
  }, [redirectUri]);

  const fetchRandom = useCallback(async () => {
    if (!token) { await beginLogin(); return; }
    setLoading(true);
    setTrack(null);
    try {
      setError(null);
      const { q, offset } = generateRandomQuery();
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", q);
      url.searchParams.set("type", "track");
      url.searchParams.set("market", "US");
      url.searchParams.set("limit", "50");
      url.searchParams.set("offset", String(offset));
      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("search failed");
      const data = await r.json();
      const items: Track[] = data?.tracks?.items || [];
      if (!items.length) throw new Error("no results");
      const pick = items[Math.floor(Math.random() * items.length)];
      setTrack(pick);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = pick.preview_url || "";
        if (pick.preview_url) audioRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message || "Search error");
      // try again quickly once
      try {
        const { q, offset } = generateRandomQuery();
        const url = new URL("https://api.spotify.com/v1/search");
        url.searchParams.set("q", q);
        url.searchParams.set("type", "track");
        url.searchParams.set("market", "US");
        url.searchParams.set("limit", "50");
        url.searchParams.set("offset", String(offset));
        const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        const data = await r.json();
        const items: Track[] = data?.tracks?.items || [];
        if (items.length) {
          const pick = items[Math.floor(Math.random() * items.length)];
          setTrack(pick);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = pick.preview_url || "";
            if (pick.preview_url) audioRef.current.play().catch(() => {});
          }
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [token, beginLogin]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const isCallback = window.location.pathname === "/callback";
    if (isCallback && code) {
      const verifier = localStorage.getItem("spotify_verifier") || "";
      (async () => {
        const r = await fetch("/api/spotify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier }),
        });
        const data = await r.json();
        if (!r.ok) { setError(data?.error || "Token error"); return; }
        const t = data?.access_token as string | undefined;
        if (t) {
          setToken(t);
          sessionStorage.setItem("spotify_access_token", t);
          // clean url then go to home
          window.history.replaceState({}, "", "/");
        }
      })();
    }
  }, [redirectUri]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = sessionStorage.getItem("spotify_access_token");
      if (t) setToken(t);
    }
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold mb-6 inline-flex items-center gap-2 justify-center">
          <span>Random Spotify Song</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spotify.svg" alt="Spotify" className="h-6 w-6" />
        </h1>
        <button
          className="w-full rounded-xl bg-primary px-5 py-3 text-black font-medium active:scale-[.98] disabled:opacity-50"
          onClick={fetchRandom}
          disabled={loading}
        >
          {loading ? "Finding..." : "Find Random Song"}
        </button>

        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}

        {track && (
          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl overflow-hidden aspect-square bg-black/20">
              {/* album art */}
              {track.album.images?.[0]?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.album.images[0].url} alt="album art" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <div className="text-xl font-medium">{track.name}</div>
              <div className="text-sm text-white/70">{track.artists.map(a => a.name).join(", ")}</div>
            </div>
            <div className="flex gap-3 justify-center">
              <audio ref={audioRef} controls className="w-full" />
            </div>
            <a
              className="inline-flex justify-center rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
              href={track.external_urls.spotify}
              target="_blank"
              rel="noreferrer"
            >
              Open in Spotify
            </a>
          </div>
        )}
      </div>
    </main>
  );
}


