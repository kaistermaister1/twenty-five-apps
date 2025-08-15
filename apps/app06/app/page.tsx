"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Note = {
  id: string;
  text: string;
  createdAt: number;
};

function useLocalStorageNotes(key: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(notes));
    } catch {}
  }, [key, notes]);

  return [notes, setNotes] as const;
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<"record" | "notes">("record");
  const [notes, setNotes] = useLocalStorageNotes("voice-notes");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [manualText, setManualText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSpeechSupported = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    );
  }, []);

  useEffect(() => {
    if (!isSpeechSupported) return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition: SpeechRecognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript + " ";
        }
      }
      if (interimTranscript) setInterimText(interimTranscript.trim());
      if (finalTranscript) {
        setNotes((prev) => [
          {
            id: crypto.randomUUID(),
            text: finalTranscript.trim(),
            createdAt: Date.now(),
          },
          ...prev,
        ]);
        setInterimText("");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isSpeechSupported, setNotes]);

  const toggleRecording = () => {
    if (!isSpeechSupported || !recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInterimText("");
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {}
    }
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <main className="space-y-6">
      <header className="pt-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">Voice Notes</h1>
        <p className="mt-1 text-slate-600">Simple, beautiful voice-to-text notes with timestamps.</p>
      </header>

      <div className="mt-4 flex items-center rounded-full bg-white/80 backdrop-blur border border-slate-200 p-1 shadow-sm">
        <button
          className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "record"
              ? "bg-brand-600 text-white shadow"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("record")}
        >
          Record
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "notes"
              ? "bg-brand-600 text-white shadow"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          onClick={() => setActiveTab("notes")}
        >
          Notes
        </button>
      </div>

      {activeTab === "record" ? (
        <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-sm">
          {!isSpeechSupported ? (
            <div className="space-y-4">
              <p className="text-slate-700">
                Your browser doesn't support in-app speech recognition. On iPhone, use the
                keyboard's microphone button to dictate into the box below, then save it.
              </p>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Tap the keyboard mic to dictate, or type your note…"
                className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white/60 p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Tip: tap the mic on your iOS keyboard.</span>
                <button
                  onClick={() => {
                    const text = manualText.trim();
                    if (!text) return;
                    setNotes((prev) => [
                      { id: crypto.randomUUID(), text, createdAt: Date.now() },
                      ...prev,
                    ]);
                    setManualText("");
                  }}
                  disabled={!manualText.trim()}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    manualText.trim()
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Save note
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={toggleRecording}
                className={`w-full inline-flex items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  isRecording
                    ? "bg-red-600 text-white shadow hover:bg-red-700"
                    : "bg-brand-600 text-white shadow hover:bg-brand-700"
                }`}
              >
                <span className="inline-block h-3 w-3 rounded-full bg-white animate-pulse"></span>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>

              <div className="min-h-[96px] rounded-xl border border-slate-200 bg-white/60 p-4 text-slate-800">
                {interimText ? (
                  <p className="text-base leading-relaxed">{interimText}</p>
                ) : (
                  <p className="text-slate-500">Speak to dictate your note…</p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
          {notes.length === 0 ? (
            <div className="p-6 text-center text-slate-600">No notes yet. Record your first one!</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {notes.map((note) => (
                <li key={note.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-slate-900 leading-relaxed whitespace-pre-wrap">
                        {note.text}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}


