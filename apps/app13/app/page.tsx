"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  // Load pantry on client only to avoid hydration mismatch
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem("app13_pantry_v1") : null;
      if (raw) setPantry(JSON.parse(raw));
    } catch {}
  }, []);
  const [draftItem, setDraftItem] = useState("");
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Recipe[]>([]);

  // Options for generation
  const [count, setCount] = useState<number>(4);
  const [allowMissing, setAllowMissing] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    try { localStorage.setItem("app13_pantry_v1", JSON.stringify(pantry)); } catch {}
  }, [pantry]);
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem("app13_saved_v1") : null;
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("app13_saved_v1", JSON.stringify(saved)); } catch {}
  }, [saved]);

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
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry, count, allowMissing, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      const code: string = data.code as string;
      // Build a safe function wrapper to evaluate the const recipes
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

  const bottomBarHeight = 56; // reduce height; outer container no extra bottom padding

  // Measure top app bar height to avoid overlap
  const appBarRef = useRef<HTMLDivElement | null>(null);
  const [appBarHeight, setAppBarHeight] = useState<number>(56);
  useEffect(() => {
    const measure = () => { if (appBarRef.current) setAppBarHeight(appBarRef.current.offsetHeight); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="app-root" style={{ display: "flex", flexDirection: "column", background: "#f8fafc", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div ref={appBarRef} style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 20, background: "#0f766e", color: "#fff", padding: "10px 12px", paddingTop: "calc(var(--safe-area-inset-top) + 14px)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Recipe Helper</div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: appBarHeight + 10 }}>
        {activeTab === "Pantry" && (
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 14, color: '#0f172a' }}>Your pantry items</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={draftItem}
                onChange={e => setDraftItem(e.target.value)}
                placeholder="e.g. chicken, tomato, rice"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff' }}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
              />
              <button onClick={addItem} style={{ padding: '12px 16px', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontWeight: 700 }}>Add</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {hasMounted && pantry.length === 0 && (
                <div style={{ color: '#64748b' }}>No items yet. Add what you have.</div>
              )}
              {hasMounted && pantry.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfeff', color: '#0f766e', padding: '8px 12px', borderRadius: 999, border: '1px solid #a5f3fc' }}>
                  <span>{item}</span>
                  <button aria-label={`Remove ${item}`} onClick={() => removeItem(item)} style={{ width: 18, height: 18, borderRadius: 9, background: '#0f766e', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Recipes" && (
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'sticky', top: 0, background: '#ffffff', paddingTop: 8, paddingBottom: 8, zIndex: 1 }}>
              <button onClick={generateRecipes} disabled={loading} style={{ padding: '12px 16px', borderRadius: 12, background: '#0f766e', color: '#fff', fontWeight: 700, boxShadow: '0 4px 10px rgba(15,118,110,0.3)' }}>
                {loading ? 'Generating…' : 'Generate Recipes'}
              </button>
              <div style={{ alignSelf: 'center', color: '#64748b', fontSize: 12 }}>
                Uses pantry: {hasMounted ? pantry.length : 0} items
              </div>
            </div>
            {/* Options */}
            <div style={{ display: 'grid', gap: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>How many recipes?</span>
                <select value={count} onChange={e => setCount(parseInt(e.target.value, 10))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', width: 160 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={allowMissing} onChange={e => setAllowMissing(e.target.checked)} />
                <span style={{ fontSize: 14, color: '#0f172a' }}>Allow recipes with up to 2 missing minor ingredients</span>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Extra details (diet, cuisine, cooking time, etc.)</span>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="e.g. vegetarian, 30 minutes max, prefer Italian"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', resize: 'vertical' }} />
              </label>
            </div>
            {error && <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 8 }}>{error}</div>}

            <div style={{ display: 'grid', gap: 12 }}>
              {!recipes && (
                <div style={{ color: '#64748b' }}>No recipes yet. Tap Generate to get 4 ideas.</div>
              )}
              {recipes && recipes.map(r => (
                <RecipeCard key={r.id} recipe={r} onSave={(rec) => setSaved(prev => {
                  if (prev.find(p => p.id === rec.id)) return prev;
                  return [rec, ...prev];
                })} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "Saved" && (
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 14, color: '#0f172a', marginBottom: 4 }}>Saved recipes</div>
            {saved.length === 0 && (
              <div style={{ color: '#64748b' }}>No saved recipes yet.</div>
            )}
            {saved.map(r => (
              <RecipeCard key={`saved-${r.id}`} recipe={r} onSave={() => {}} saved />
            ))}
          </div>
        )}
      </div>

      {/* Bottom tabs */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: `${bottomBarHeight}px`, background: '#ffffff', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: '8px 10px', boxShadow: '0 1px 0 rgba(0,0,0,0.04)', marginBottom: 8 }}>
          <TabButton label="Pantry" active={activeTab === 'Pantry'} onClick={() => setActiveTab('Pantry')} />
          <TabButton label="Recipes" active={activeTab === 'Recipes'} onClick={() => setActiveTab('Recipes')} />
          <TabButton label="Saved" active={activeTab === 'Saved'} onClick={() => setActiveTab('Saved')} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 14, background: active ? '#ecfeff' : 'transparent', color: active ? '#0f766e' : '#0f172a' }}>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function RecipeCard({ recipe, onSave, saved }: { recipe: Recipe; onSave?: (r: Recipe) => void; saved?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#ffffff', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: 14, display: 'grid', gap: 6, background: 'transparent', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#0f766e' }} />
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{recipe.name}</div>
        </div>
        <div style={{ color: '#334155', fontSize: 12 }}>{recipe.preview}</div>
        <div style={{ color: '#64748b', fontSize: 12 }}>Ingredients: {recipe.ingredients.join(', ')}</div>
      </button>
      {open && (
        <div style={{ padding: 14, borderTop: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', color: '#0f172a' }}>
          {recipe.instructions}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {!saved && (
              <button onClick={() => onSave && onSave(recipe)} style={{ padding: '10px 12px', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontWeight: 700 }}>Save Recipe</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


