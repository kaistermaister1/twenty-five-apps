"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

type Recipe = {
  id: string;
  name: string;
  ingredients: string[];
  preview: string;
  instructions: string;
};

export default function Page() {
  const [activeTab, setActiveTab] = useState<"Pantry" | "Recipes" | "Saved">("Pantry");
  const [pantry, setPantry] = useState<string[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  const supabaseRef = useRef<any>(null);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Load pantry on client only to avoid hydration mismatch
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("app13_pantry_v1") : null;
      if (raw) setPantry(JSON.parse(raw));
    } catch {}
  }, []);

  const [draftItem, setDraftItem] = useState("");
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Recipe[]>([]);

  // Options for generation
  const [count] = useState<number>(4);
  const [allowMissing, setAllowMissing] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    try { localStorage.setItem("app13_pantry_v1", JSON.stringify(pantry)); } catch {}
  }, [pantry]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("app13_saved_v1") : null;
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("app13_saved_v1", JSON.stringify(saved)); } catch {}
  }, [saved]);

  // Supabase auth bootstrap
  useEffect(() => {
    const supa = getSupabaseClient();
    supabaseRef.current = supa;
    if (!supa) return;

    supa.auth.getUser().then(({ data }: { data: { user: any | null } }) => setUser(data?.user ?? null));
    const { data: sub } = supa.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => { sub?.subscription?.unsubscribe(); };
  }, []);

  // When user logs in, pull remote pantry/saved (if any)
  useEffect(() => {
    const supa = supabaseRef.current;
    if (!supa || !user) return;
    (async () => {
      try {
        const { data: p } = await supa
          .from("app13_pantry")
          .select("items")
          .eq("user_id", user.id)
          .single();
        if (p?.items && Array.isArray(p.items)) setPantry(p.items as string[]);
      } catch {}
      try {
        const { data: s } = await supa
          .from("app13_saved")
          .select("recipes")
          .eq("user_id", user.id)
          .single();
        if (s?.recipes && Array.isArray(s.recipes)) setSaved(s.recipes as any[]);
      } catch {}
    })();
  }, [user]);

  // Persist to Supabase when authenticated
  useEffect(() => {
    const supa = supabaseRef.current;
    if (!supa || !user) return;
    supa.from("app13_pantry").upsert({ user_id: user.id, items: pantry }, { onConflict: "user_id" }).then(() => {});
  }, [user, pantry]);

  useEffect(() => {
    const supa = supabaseRef.current;
    if (!supa || !user) return;
    supa.from("app13_saved").upsert({ user_id: user.id, recipes: saved }, { onConflict: "user_id" }).then(() => {});
  }, [user, saved]);

  function addItem() {
    const v = draftItem.trim();
    if (!v) return;
    setPantry(prev => Array.from(new Set([...prev, v])));
    setDraftItem("");
  }

  function removeItem(item: string) {
    setPantry(prev => prev.filter(p => p !== item));
  }

  async function generateRecipes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry, count, allowMissing, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      const code: string = data.code as string;
      const fn = new Function(`"use strict"; ${code}; return recipes;`);
      const parsed: any = fn();
      if (!Array.isArray(parsed)) throw new Error("Invalid code result");
      setRecipes(parsed as Recipe[]);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Visual heights
  const bottomBarHeight = 60;

  // Measure top app bar height to avoid overlap
  const appBarRef = useRef<HTMLDivElement | null>(null);
  const [appBarHeight, setAppBarHeight] = useState<number>(56);
  useEffect(() => {
    const measure = () => { if (appBarRef.current) setAppBarHeight(appBarRef.current.offsetHeight); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    // Let the document scroll, not a nested div. Use dynamic viewport units.
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#f8fafc" }}>
      {/* Top bar fixed to the visual top, with safe area */}
      <div
        ref={appBarRef}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          zIndex: 20,
          background: "#0f766e",
          color: "#fff",
          padding: "10px 12px",
          paddingTop: "calc(env(safe-area-inset-top) + 14px)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>Recipe Helper</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            <>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{user.email}</div>
              <button
                onClick={async () => { const supa = supabaseRef.current; if (supa) await supa.auth.signOut(); }}
                style={{ padding: "8px 10px", borderRadius: 10, background: "#134e4a", color: "#fff", fontWeight: 700 }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{ padding: "8px 10px", borderRadius: 10, background: "#134e4a", color: "#fff", fontWeight: 700 }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Main content uses document scrolling and reserves space for top and bottom bars */}
      <main
        style={{
          flex: 1,
          paddingTop: appBarHeight + 10,
          paddingBottom: `calc(${bottomBarHeight}px + env(safe-area-inset-bottom))`,
        }}
      >
        {activeTab === "Pantry" && (
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div style={{ fontSize: 14, color: "#0f172a" }}>Your pantry items</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={draftItem}
                onChange={e => setDraftItem(e.target.value)}
                placeholder="e.g. chicken, tomato, rice"
                style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff" }}
                onKeyDown={e => { if (e.key === "Enter") addItem(); }}
              />
              <button onClick={addItem} style={{ padding: "12px 16px", borderRadius: 10, background: "#0ea5e9", color: "#fff", fontWeight: 700 }}>
                Add
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {hasMounted && pantry.length === 0 && (
                <div style={{ color: "#64748b" }}>No items yet. Add what you have.</div>
              )}
              {hasMounted && pantry.map(item => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#ecfeff",
                    color: "#0f766e",
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid #a5f3fc",
                  }}
                >
                  <span>{item}</span>
                  <button
                    aria-label={`Remove ${item}`}
                    onClick={() => removeItem(item)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#0f766e",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Recipes" && (
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "#ffffff",
                paddingTop: 8,
                paddingBottom: 8,
                zIndex: 1,
              }}
            >
              <button
                onClick={generateRecipes}
                disabled={loading}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "#0f766e",
                  color: "#fff",
                  fontWeight: 700,
                  boxShadow: "0 4px 10px rgba(15,118,110,0.3)",
                }}
              >
                {loading ? "Generating…" : "Generate Recipes"}
              </button>
              <div style={{ alignSelf: "center", color: "#64748b", fontSize: 12 }}>
                Uses pantry: {hasMounted ? pantry.length : 0} items
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "grid", gap: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={allowMissing} onChange={e => setAllowMissing(e.target.checked)} />
                <span style={{ fontSize: 14, color: "#0f172a" }}>Allow missing ingredients</span>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Extra details (diet, cuisine, cooking time, etc.)</span>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. vegetarian, 30 minutes max, prefer Italian"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", resize: "vertical" }}
                />
              </label>
            </div>

            {error && (
              <div style={{ color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "10px 12px", borderRadius: 8 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {!recipes && <div style={{ color: "#64748b" }}>No recipes yet. Tap Generate to get ideas.</div>}
              {recipes &&
                recipes.map(r => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    onSave={rec =>
                      setSaved(prev => {
                        if (prev.find(p => p.id === rec.id)) return prev;
                        return [rec, ...prev];
                      })
                    }
                  />
                ))}
            </div>
          </div>
        )}

        {activeTab === "Saved" && (
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 4 }}>Saved recipes</div>
            {saved.length === 0 && <div style={{ color: "#64748b" }}>No saved recipes yet.</div>}
            {saved.map(r => (
              <RecipeCard key={`saved-${r.id}`} recipe={r} onSave={() => {}} saved />
            ))}
          </div>
        )}
      </main>

      {/* Bottom tabs pinned to the true bottom with safe area padding */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "saturate(120%) blur(8px)",
          borderTop: "1px solid #e5e7eb",
          height: bottomBarHeight,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: "6px 8px",
            boxShadow: "0 2px 8px rgba(2, 8, 23, 0.06)",
          }}
        >
          <TabButton label="Pantry" active={activeTab === "Pantry"} onClick={() => setActiveTab("Pantry")} />
          <TabButton label="Recipes" active={activeTab === "Recipes"} onClick={() => setActiveTab("Recipes")} />
          <TabButton label="Saved" active={activeTab === "Saved"} onClick={() => setActiveTab("Saved")} />
        </div>
      </nav>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSignedIn={() => setShowAuth(false)} supabaseRef={supabaseRef} />)
      }
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 12,
        background: active ? "#0f766e" : "transparent",
        color: active ? "#ffffff" : "#334155",
        fontWeight: 700,
        transition: "background 120ms ease, color 120ms ease",
      }}
    >
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function RecipeCard({ recipe, onSave, saved }: { recipe: Recipe; onSave?: (r: Recipe) => void; saved?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#ffffff", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", padding: 14, display: "grid", gap: 6, background: "transparent", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#0f766e" }} />
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{recipe.name}</div>
        </div>
        <div style={{ color: "#334155", fontSize: 12 }}>{recipe.preview}</div>
        <div style={{ color: "#64748b", fontSize: 12 }}>Ingredients: {recipe.ingredients.join(", ")}</div>
      </button>
      {open && (
        <div style={{ padding: 14, borderTop: "1px solid #e2e8f0", whiteSpace: "pre-wrap", color: "#0f172a" }}>
          {recipe.instructions}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {!saved && (
              <button
                onClick={() => onSave && onSave(recipe)}
                style={{ padding: "10px 12px", borderRadius: 10, background: "#0ea5e9", color: "#fff", fontWeight: 700 }}
              >
                Save Recipe
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModal({ onClose, onSignedIn, supabaseRef }: { onClose: () => void; onSignedIn: () => void; supabaseRef: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const supa = supabaseRef.current;
    if (!supa) { setError("Supabase not configured"); return; }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error: e } = await supa.auth.signUp({ email, password });
        if (e) throw e;
      } else {
        const { error: e } = await supa.auth.signInWithPassword({ email, password });
        if (e) throw e;
      }
      onSignedIn();
    } catch (e: any) {
      setError(e?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0 as any, background: "rgba(2,6,23,0.6)", display: "grid", placeItems: "center", zIndex: 50 }}>
      <div style={{ width: "min(92vw, 420px)", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(2,6,23,0.2)", padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{isSignUp ? "Create account" : "Sign in"}</div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, background: "#f1f5f9", color: "#0f172a" }}>×</button>
        </div>
        {error && <div style={{ color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "10px 12px", borderRadius: 8 }}>{error}</div>}
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>Email</span>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff" }} />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: "10px 12px", borderRadius: 10, background: "#0f766e", color: "#fff", fontWeight: 800 }}>
            {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
          <button onClick={() => setIsSignUp(v => !v)} style={{ padding: "10px 12px", borderRadius: 10, background: "#ecfeff", color: "#0f766e", fontWeight: 700 }}>
            {isSignUp ? "Have an account? Sign in" : "New here? Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
