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

function HomeTab({ onAdd, currentCoords }: { onAdd: (entry: Omit<PoopEntry, "id" | "createdAt">) => void; currentCoords: { lat: number; lng: number } | null }) {
	const [note, setNote] = useState("");
	const [photo, setPhoto] = useState<string | undefined>(undefined);

	return (
		<div className="p-4 space-y-4">
			<h1 className="text-2xl font-semibold">New Entry</h1>
			<textarea
				value={note}
				onChange={(e) => setNote(e.target.value)}
				placeholder="How was it? Any notes..."
				className="w-full min-h-28 rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-brand-300"
			/>
			{photo && (
				<div className="relative w-full h-48 overflow-hidden rounded-xl border">
					<Image src={photo} alt="poop photo" fill className="object-cover" />
				</div>
			)}
			<CameraInput onCapture={setPhoto} />
			<button
				onClick={() => {
					onAdd({ note, photoDataUrl: photo, lat: currentCoords?.lat ?? null, lng: currentCoords?.lng ?? null });
					setNote("");
					setPhoto(undefined);
				}}
				className="w-full rounded-xl bg-black text-white py-3 font-medium shadow active:scale-[0.99]"
			>
				Save Entry
			</button>
			<p className="text-center text-xs text-slate-500">Location: {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : "Unknown"}</p>
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

	return (
		<div className="pb-20">
			{active === "home" ? (
				<HomeTab onAdd={addEntry} currentCoords={coords} />
			) : (
				<MapTab entries={entries} />
			)}
			<BottomTabs active={active} setActive={setActive} />
		</div>
	);
}


