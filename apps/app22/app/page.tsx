"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CloudUpload, Link2, Loader2, LogIn, PlusCircle, RefreshCcw, Trash2 } from "lucide-react";

type ParsedClass = {
  id: string;
  name: string;
  daysOfWeek: string[]; // e.g., ["MO","WE","FR"]
  startTime: string; // HH:MM 24h
  endTime: string;   // HH:MM 24h
  startDate?: string; // YYYY-MM-DD (first date to start recurring)
};

type EditableClass = ParsedClass & {
  location: string;
  color: string;
  notes: string;
  selected: boolean;
};

export default function HomePage() {
  const [connected, setConnected] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [classes, setClasses] = useState<EditableClass[]>([]);
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        const data = await res.json();
        setConnected(Boolean(data?.connected));
      } catch {
        setConnected(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    load();
  }, []);

  function onChooseFile(f: File | null) {
    setFile(f);
    setClasses([]);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function parseSchedule() {
    if (!file) return;
    setParsing(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Parse failed");
      const data = await res.json();
      const items: EditableClass[] = (data.classes as ParsedClass[]).map((c) => ({
        ...c,
        location: "",
        color: "#0ea5e9",
        notes: "",
        selected: true,
      }));
      setClasses(items);
    } catch (e: any) {
      alert(e?.message || "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  async function createSelectedEvents() {
    const selected = classes.filter((c) => c.selected);
    if (selected.length === 0) {
      alert("Select at least one class");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Create failed");
      const data = await res.json();
      alert(`Created ${data.created} event(s)`);
      setClasses((prev) => prev.map((c) => ({ ...c, selected: false })));
    } catch (e: any) {
      alert(e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  const allSelected = useMemo(() => classes.every((c) => c.selected), [classes]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="sticky top-0 z-20 mb-6 border-b bg-background/95 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Schedule to Google Calendar</h1>
          <div className="ml-auto flex items-center gap-2">
            {checkingAuth ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking…</span>
            ) : connected ? (
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-green-700">Connected</span>
            ) : (
              <a href="/api/auth/google/start" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-white shadow-soft"><LogIn className="size-4" /> Connect Google</a>
            )}
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <CloudUpload className="size-4" />
              <input type="file" accept="image/*" onChange={(e) => onChooseFile(e.target.files?.[0] ?? null)} className="hidden" />
              Choose schedule image
            </label>
            <button onClick={() => { setFile(null); setPreview(null); setClasses([]); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Trash2 className="size-4" /> Clear</button>
            <button onClick={parseSchedule} disabled={!file || parsing} aria-busy={parsing} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white shadow-soft disabled:opacity-50">
              {parsing ? (<><Loader2 className="size-4 animate-spin" /> Parsing…</>) : (<><RefreshCcw className="size-4" /> Parse with AI</>)}
            </button>
          </div>
          {preview && (
            <div className="mt-4 overflow-hidden rounded-lg border">
              {/** eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Schedule preview" className="h-auto w-full" />
            </div>
          )}
        </div>

        {classes.length > 0 && (
          <div className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2">
              <button onClick={() => setClasses((prev) => prev.map((c) => ({ ...c, selected: !allSelected })))} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                <PlusCircle className="size-4" /> {allSelected ? "Unselect all" : "Select all"}
              </button>
              <button onClick={createSelectedEvents} disabled={!connected || creating} aria-busy={creating} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white shadow-soft disabled:opacity-50">
                {creating ? (<><Loader2 className="size-4 animate-spin" /> Creating…</>) : (<><CheckCircle2 className="size-4" /> Add to Google Calendar</>)}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {classes.map((cls, idx) => (
                <ClassCard key={cls.id} value={cls} onChange={(next) => setClasses((prev) => prev.map((c) => c.id === cls.id ? next : c))} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ClassCard({ value, onChange }: { value: EditableClass; onChange: (v: EditableClass) => void }) {
  const readableDays = useMemo(() => value.daysOfWeek.join(", "), [value.daysOfWeek]);
  return (
    <div className={`rounded-xl border p-4 shadow-soft ${value.selected ? "" : "opacity-70"}`}>
      <div className="flex items-start gap-4">
        <input type="checkbox" checked={value.selected} onChange={(e) => onChange({ ...value, selected: e.target.checked })} className="mt-1 size-5" />
        <div className="w-full">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-base font-medium">{value.name}</div>
            <div className="text-sm text-muted-foreground">{readableDays} · {value.startTime}–{value.endTime}</div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <div className="mb-1 text-muted-foreground">Location</div>
              <input value={value.location} onChange={(e) => onChange({ ...value, location: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary" placeholder="e.g., Room 204" />
            </label>
            <label className="block text-sm">
              <div className="mb-1 text-muted-foreground">Color</div>
              <input type="color" value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} className="h-[40px] w-full rounded-lg border bg-background" />
            </label>
            <label className="block text-sm sm:col-span-3">
              <div className="mb-1 text-muted-foreground">Notes</div>
              <textarea value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary" placeholder="Optional" rows={2} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}


