"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Upload, Tags, Folder, RefreshCw } from "lucide-react";

type Flashcard = {
  id: string;
  front: string;
  back: string;
  tags: string[];
  group: string; // group name
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"create" | "library">("create");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="sticky top-0 z-20 mb-6 border-b bg-background/95 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Flashcard Maker</h1>
          <nav className="ml-auto flex gap-2">
            <button onClick={() => setActiveTab("create")} className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "create" ? "bg-primary text-white" : "border"}`}>Create</button>
            <button onClick={() => setActiveTab("library")} className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "library" ? "bg-primary text-white" : "border"}`}>Library</button>
          </nav>
        </div>
      </header>

      {activeTab === "create" ? <CreateTab /> : <LibraryTab />}
    </div>
  );
}

function CreateTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Flashcard[] | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleGenerate() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/flashcards", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
      const data = await res.json();
      const cards: Flashcard[] = data.cards ?? [];
      if (cards.length > 0) {
        saveCardsToStorage(cards);
      }
      setResult(cards);
    } catch (e: any) {
      alert(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-soft">
        <div className="text-sm font-medium">Upload an image</div>
        <div className="mt-2 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Upload className="size-4" /> Choose image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <span className="text-xs text-muted-foreground truncate max-w-[12rem]">{file.name}</span> : <span className="text-xs text-muted-foreground">No file selected</span>}
          <button
            onClick={() => setFile(null)}
            className="ml-auto rounded-lg border px-3 py-2 text-sm"
          >Clear</button>
        </div>
        {preview && (
          <div className="mt-3">
            <img src={preview} alt="Preview" className="max-h-[40dvh] w-full rounded-lg object-contain" />
          </div>
        )}
        <div className="mt-3">
          <button
            onClick={handleGenerate}
            disabled={!file || loading}
            aria-busy={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white shadow-soft disabled:opacity-50"
          >
            {loading ? (<><Loader2 className="size-4 animate-spin" /> Generating…</>) : (<><Sparkles className="size-4" /> Generate flashcards</>)}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <div className="text-sm font-medium">Generated cards</div>
          {result.length === 0 ? (
            <div className="mt-2 text-sm text-muted-foreground">No cards detected.</div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.map((c) => (
                <CardPreview key={c.id} card={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CardPreview({ card }: { card: Flashcard }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button onClick={() => setFlipped((f) => !f)} className="rounded-xl border p-4 text-left shadow-soft">
      <div className="text-xs text-muted-foreground">{flipped ? "Back" : "Front"}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{flipped ? card.back : card.front}</div>
    </button>
  );
}

function LibraryTab() {
  const [cards, setCards] = useState<Flashcard[]>(() => loadCardsFromStorage());
  const groups = useMemo(() => {
    const map: Record<string, Flashcard[]> = {};
    for (const c of cards) {
      const g = c.group || "Ungrouped";
      (map[g] ||= []).push(c);
    }
    return map;
  }, [cards]);

  function updateCard(updated: Flashcard) {
    const next = cards.map((c) => (c.id === updated.id ? updated : c));
    setCards(next);
    saveCardsToStorage(next);
  }

  function resetLibrary() {
    if (!confirm("Clear all saved cards?")) return;
    setCards([]);
    saveCardsToStorage([]);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setCards(loadCardsFromStorage())} className="rounded-lg border px-3 py-2 text-sm inline-flex items-center gap-2"><RefreshCw className="size-4" /> Reload</button>
        <button onClick={resetLibrary} className="rounded-lg border px-3 py-2 text-sm">Clear</button>
        <div className="ml-auto text-xs text-muted-foreground">{cards.length} total cards</div>
      </div>

      {Object.entries(groups).length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No saved cards yet. Generate some on the Create tab.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, groupCards]) => (
            <div key={groupName}>
              <div className="mb-2 flex items-center gap-2">
                <Folder className="size-4" />
                <div className="font-medium">{groupName}</div>
                <div className="text-xs text-muted-foreground">{groupCards.length} cards</div>
              </div>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                {groupCards.map((c) => (
                  <EditableCard key={c.id} card={c} onChange={updateCard} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EditableCard({ card, onChange }: { card: Flashcard; onChange: (c: Flashcard) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [local, setLocal] = useState(card);

  useEffect(() => setLocal(card), [card.id]);

  function save() { onChange(local); }

  return (
    <div className="min-w-[260px] snap-start rounded-xl border bg-card p-4 shadow-soft">
      <button onClick={() => setFlipped((f) => !f)} className="w-full text-left">
        <div className="text-xs text-muted-foreground">{flipped ? "Back" : "Front"}</div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{flipped ? local.back : local.front}</div>
      </button>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Tags className="size-4" />
          <input
            value={local.tags.join(", ")}
            onChange={(e) => setLocal({ ...local, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="tag1, tag2"
            className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Folder className="size-4" />
          <input
            value={local.group}
            onChange={(e) => setLocal({ ...local, group: e.target.value })}
            placeholder="Group name"
            className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

function saveCardsToStorage(cards: Flashcard[] | Flashcard) {
  const existing = loadCardsFromStorage();
  const toAdd = Array.isArray(cards) ? cards : [cards];
  const map = new Map<string, Flashcard>();
  for (const c of [...existing, ...toAdd]) map.set(c.id, c);
  const merged = Array.from(map.values());
  localStorage.setItem("flashcards", JSON.stringify(merged));
}

function loadCardsFromStorage(): Flashcard[] {
  try {
    const raw = localStorage.getItem("flashcards");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.id === "string" && typeof c.front === "string" && typeof c.back === "string");
  } catch {
    return [];
  }
}


