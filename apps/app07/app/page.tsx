"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import "leaflet/dist/leaflet.css";

type PoopEntry = {
	id: string;
	createdAt: number;
	note: string;
	lat: number | null;
	lng: number | null;
	photoDataUrl?: string;
};

type TabKey = "home" | "map";

function usePersistentEntries() {
	const [entries, setEntries] = useState<PoopEntry[]>([]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("poop-entries");
			if (raw) setEntries(JSON.parse(raw));
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem("poop-entries", JSON.stringify(entries));
		} catch {}
	}, [entries]);

	return { entries, setEntries };
}

function useUserLocation() {
	const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
	useEffect(() => {
		if (!navigator.geolocation) return;
		navigator.geolocation.getCurrentPosition(
			(pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
			() => setCoords(null),
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}, []);
	return coords;
}

function CameraInput({ onCapture }: { onCapture: (dataUrl: string | undefined) => void }) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	return (
		<div>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={async (e) => {
					const file = e.target.files?.[0];
					if (!file) return onCapture(undefined);
					const reader = new FileReader();
					reader.onload = () => onCapture(typeof reader.result === "string" ? reader.result : undefined);
					reader.readAsDataURL(file);
				}}
			/>
			<button
				onClick={() => inputRef.current?.click()}
				className="w-full rounded-xl bg-brand-500 text-white py-3 font-medium shadow active:scale-[0.99]"
			>
				Add Photo
			</button>
		</div>
	);
}

function BottomTabs({ active, setActive }: { active: TabKey; setActive: (t: TabKey) => void }) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;
	return createPortal(
		<div className="fixed bottom-0 left-0 right-0 z-50">
			<div className="safe-bottom" />
			<div className="mx-auto max-w-md border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
				<div className="grid grid-cols-2">
					<button
						className={`py-3 flex flex-col items-center gap-1 ${active === "home" ? "text-brand-600" : "text-slate-500"}`}
						onClick={() => setActive("home")}
					>
						<span className="text-xl">🏠</span>
						<span className="text-xs">Home</span>
					</button>
					<button
						className={`py-3 flex flex-col items-center gap-1 ${active === "map" ? "text-brand-600" : "text-slate-500"}`}
						onClick={() => setActive("map")}
					>
						<span className="text-xl">🗺️</span>
						<span className="text-xs">Map</span>
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
}

function HomeTab({
	onAdd,
	onUpdate,
	onDelete,
	entries,
	currentCoords,
}: {
	onAdd: (entry: Omit<PoopEntry, "id" | "createdAt">) => void;
	onUpdate: (id: string, updates: Partial<PoopEntry>) => void;
	onDelete: (id: string) => void;
	entries: PoopEntry[];
	currentCoords: { lat: number; lng: number } | null;
}) {
	const [note, setNote] = useState("");
	const [photo, setPhoto] = useState<string | undefined>(undefined);
	const [editingId, setEditingId] = useState<string | null>(null);

	function resetForm() {
		setNote("");
		setPhoto(undefined);
		setEditingId(null);
	}

	return (
		<div className="p-4 space-y-5">
			<h1 className="section-title">{editingId ? "Edit Entry" : "New Entry"}</h1>
			<textarea
				value={note}
				onChange={(e) => setNote(e.target.value)}
				placeholder="How was it? Any notes..."
				className="w-full min-h-28 card focus:ring-2 focus:ring-brand-300"
			/>
			{photo && (
				<div className="relative w-full h-48 overflow-hidden rounded-2xl border">
					<Image src={photo} alt="poop photo" fill className="object-cover" />
				</div>
			)}
			<CameraInput onCapture={setPhoto} />
			<div className="flex gap-3">
				<button
					onClick={() => {
						if (editingId) {
							onUpdate(editingId, { note, photoDataUrl: photo });
							resetForm();
						} else {
							onAdd({ note, photoDataUrl: photo, lat: currentCoords?.lat ?? null, lng: currentCoords?.lng ?? null });
							resetForm();
						}
					}}
					className="flex-1 rounded-xl bg-black text-white py-3 font-medium shadow active:scale-[0.99]"
				>
					{editingId ? "Save Changes" : "Save Entry"}
				</button>
				{editingId && (
					<button onClick={resetForm} className="flex-1 rounded-xl bg-slate-200 text-slate-800 py-3 font-medium active:scale-[0.99]">
						Cancel
					</button>
				)}
			</div>
			<p className="text-center text-xs text-slate-500">Location: {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : "Unknown"}</p>

			<div className="pt-2">
				<h2 className="section-title">Previous Entries</h2>
				{entries.length === 0 && <p className="text-sm text-slate-500">No entries yet.</p>}
				<ul className="space-y-3">
					{entries.map((e) => (
						<li key={e.id} className="card flex items-center gap-3">
							{e.photoDataUrl ? (
								<div className="relative w-16 h-16 rounded-xl overflow-hidden border">
									<Image src={e.photoDataUrl} alt="thumb" fill className="object-cover" />
								</div>
							) : (
								<div className="w-16 h-16 rounded-xl bg-slate-100 grid place-items-center">💩</div>
							)}
							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium truncate">{new Date(e.createdAt).toLocaleString()}</div>
								<div className="text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">{e.note || "No notes"}</div>
								{e.lat != null && e.lng != null && (
									<div className="text-xs text-slate-400">{e.lat.toFixed(4)}, {e.lng.toFixed(4)}</div>
								)}
							</div>
							<div className="flex flex-col gap-2">
								<button
									onClick={() => {
										setEditingId(e.id);
										setNote(e.note);
										setPhoto(e.photoDataUrl);
									}}
									className="px-3 py-2 rounded-xl bg-brand-500 text-white text-sm shadow"
								>
									Edit
								</button>
								<button
									onClick={() => {
										if (window.confirm("Delete this entry?")) {
											onDelete(e.id);
											if (editingId === e.id) resetForm();
										}
									}}
									className="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-sm"
								>
									Delete
								</button>
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function MapTab({ entries }: { entries: PoopEntry[] }) {
	const [client, setClient] = useState(false);
	useEffect(() => setClient(true), []);
	const center = useMemo(() => {
		const first = entries.find((e) => e.lat && e.lng);
		return first ? [first.lat!, first.lng!] : [0, 0];
	}, [entries]);

	if (!client) return <div className="p-4">Loading map...</div>;

	// Lazy-load Leaflet only on client to avoid SSR issues
	const { MapContainer, TileLayer, Marker, Popup } = require("react-leaflet");
	const L = require("leaflet");
	const redIcon = L.icon({
		iconUrl:
			"https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
		shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		iconSize: [25, 41],
		shadowSize: [41, 41],
	});

	return (
		<div className="w-full h-[calc(100vh-160px)]">
			<MapContainer center={center as any} zoom={13} className="w-full h-full z-0">
				<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
				{entries.filter((e) => e.lat && e.lng).map((e) => (
					<Marker key={e.id} position={[e.lat!, e.lng!]} icon={redIcon}>
						<Popup>
							<div className="space-y-2">
								<div className="text-sm font-medium">{new Date(e.createdAt).toLocaleString()}</div>
								{e.photoDataUrl && (
									<div className="relative w-48 h-32">
										<Image src={e.photoDataUrl} alt="entry photo" fill className="object-cover rounded" />
									</div>
								)}
								<div className="text-sm text-slate-700 whitespace-pre-wrap">{e.note || "No notes"}</div>
							</div>
						</Popup>
					</Marker>
				))}
			</MapContainer>
		</div>
	);
}

export default function App() {
	const [active, setActive] = useState<TabKey>("home");
	const { entries, setEntries } = usePersistentEntries();
	const coords = useUserLocation();

	function addEntry(data: Omit<PoopEntry, "id" | "createdAt">) {
		const newEntry: PoopEntry = { id: crypto.randomUUID(), createdAt: Date.now(), ...data };
		setEntries([newEntry, ...entries]);
	}

	function updateEntry(id: string, updates: Partial<PoopEntry>) {
		setEntries(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
	}

	function deleteEntry(id: string) {
		setEntries(entries.filter((e) => e.id !== id));
	}

	return (
		<div className="pb-20">
			{active === "home" ? (
				<HomeTab onAdd={addEntry} onUpdate={updateEntry} onDelete={deleteEntry} entries={entries} currentCoords={coords} />
			) : (
				<MapTab entries={entries} />
			)}
			<BottomTabs active={active} setActive={setActive} />
		</div>
	);
}


