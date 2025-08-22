"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Upload, Shirt, ShoppingBag, Heart } from "lucide-react";

type GarmentType = "upper" | "lower";

type GarmentItem = {
	id: string;
	type: GarmentType;
	url: string;
};

type Outfit = {
	id: string;
	upperId: string | null;
	lowerId: string | null;
	createdAt: string;
};

function useLocalCloset() {
	const [items, setItems] = useState<GarmentItem[]>([]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("virtual-closet-items");
			if (raw) setItems(JSON.parse(raw));
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem("virtual-closet-items", JSON.stringify(items));
		} catch {}
	}, [items]);

	const fileToDataUrl = (file: File) =>
		new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});

	const addItem = async (file: File, type: GarmentType) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const url = await fileToDataUrl(file);
		const item: GarmentItem = { id, type, url };
		setItems((prev) => [item, ...prev]);
	};

	return { items, addItem };
}

function useSavedOutfits() {
	const [outfits, setOutfits] = useState<Outfit[]>([]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("virtual-closet-outfits");
			if (raw) setOutfits(JSON.parse(raw));
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem("virtual-closet-outfits", JSON.stringify(outfits));
		} catch {}
	}, [outfits]);

	const saveOutfit = (upperId: string | null, lowerId: string | null) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const createdAt = new Date().toISOString();
		const outfit: Outfit = { id, upperId, lowerId, createdAt };
		setOutfits((prev) => [outfit, ...prev]);
	};

	const deleteOutfit = (id: string) => {
		setOutfits((prev) => prev.filter((o) => o.id !== id));
	};

	return { outfits, saveOutfit, deleteOutfit };
}

export default function HomePage() {
	const [activeTab, setActiveTab] = useState<"closet" | "outfitter" | "saved">("closet");
	const { items, addItem } = useLocalCloset();
	const { outfits, saveOutfit, deleteOutfit } = useSavedOutfits();

	const uppers = useMemo(() => items.filter((i) => i.type === "upper"), [items]);
	const lowers = useMemo(() => items.filter((i) => i.type === "lower"), [items]);

	return (
		<div className="mx-auto max-w-3xl px-4 py-4">
			<header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Virtual Closet</h1>
					<p className="text-sm text-muted-foreground">Upload clothes and build outfits.</p>
				</div>
			</header>

			<nav className="sticky bottom-3 z-10 mt-4">
				<div className="mx-auto w-full max-w-sm rounded-2xl border bg-card p-1 shadow-soft">
					<div className="grid grid-cols-3 gap-1">
						<Button variant={activeTab === "closet" ? "default" : "outline"} onClick={() => setActiveTab("closet")}>
							<ShoppingBag className="mr-2 size-4" /> Closet
						</Button>
						<Button variant={activeTab === "outfitter" ? "default" : "outline"} onClick={() => setActiveTab("outfitter")}>
							<Shirt className="mr-2 size-4" /> Outfitter
						</Button>
						<Button variant={activeTab === "saved" ? "default" : "outline"} onClick={() => setActiveTab("saved")}>
							<Heart className="mr-2 size-4" /> Saved
						</Button>
					</div>
				</div>
			</nav>

			<AnimatePresence mode="wait">
				{activeTab === "closet" ? (
					<motion.section
						key="closet"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.18 }}
						className="space-y-6"
					>
						<UploadRow onAdd={addItem} />

						<Category title="Upper body" items={uppers} emptyHint="Upload shirts, tees, jackets…" />
						<Category title="Lower body" items={lowers} emptyHint="Upload pants, shorts, skirts…" />
					</motion.section>
				) : activeTab === "outfitter" ? (
					<motion.section
						key="outfitter"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.18 }}
					>
						<Outfitter uppers={uppers} lowers={lowers} onSaveOutfit={saveOutfit} />
					</motion.section>
				) : (
					<motion.section
						key="saved"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.18 }}
						className="space-y-4"
					>
						<SavedOutfits outfits={outfits} items={items} onDelete={deleteOutfit} />
					</motion.section>
				)}
			</AnimatePresence>
		</div>
	);
}

function UploadRow({ onAdd }: { onAdd: (file: File, type: GarmentType) => Promise<void> }) {
	const upperRef = useRef<HTMLInputElement | null>(null);
	const lowerRef = useRef<HTMLInputElement | null>(null);

	return (
		<div className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-soft">
			<div className="text-sm text-muted-foreground">Add photos and tag as upper or lower.</div>
			<div className="flex gap-2">
				<input ref={upperRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
					const file = e.target.files?.[0];
					if (file) await onAdd(file, "upper");
					e.currentTarget.value = "";
				}} />
				<Button variant="outline" onClick={() => upperRef.current?.click()}>
					<Upload className="mr-2 size-4" /> Upper
				</Button>
				<input ref={lowerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
					const file = e.target.files?.[0];
					if (file) await onAdd(file, "lower");
					e.currentTarget.value = "";
				}} />
				<Button variant="outline" onClick={() => lowerRef.current?.click()}>
					<Upload className="mr-2 size-4" /> Lower
				</Button>
			</div>
		</div>
	);
}

function Category({ title, items, emptyHint }: { title: string; items: GarmentItem[]; emptyHint: string }) {
	return (
		<section className="space-y-3">
			<h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
			<div className="rounded-xl border bg-card p-2 shadow-soft">
				{items.length === 0 ? (
					<div className="p-8 text-center text-sm text-muted-foreground">{emptyHint}</div>
				) : (
					<ScrollArea className="w-full">
						<ul className="flex w-max gap-2 p-2">
							{items.map((it) => (
								<li key={it.id} className="h-36 w-36 overflow-hidden rounded-lg border bg-background">
									<img src={it.url} alt="garment" className="size-full object-cover" />
								</li>
							))}
						</ul>
					</ScrollArea>
				)}
			</div>
		</section>
	);
}

function useIndexCycler<T>(items: T[]) {
	const [index, setIndex] = useState(0);
	const count = items.length;
	const next = () => setIndex((i) => (count === 0 ? 0 : (i + 1) % count));
	const prev = () => setIndex((i) => (count === 0 ? 0 : (i - 1 + count) % count));
	useEffect(() => {
		if (index >= count) setIndex(0);
	}, [count]);
	return { index, next, prev };
}

function Outfitter({ uppers, lowers, onSaveOutfit }: { uppers: GarmentItem[]; lowers: GarmentItem[]; onSaveOutfit: (upperId: string | null, lowerId: string | null) => void }) {
	const upper = useIndexCycler(uppers);
	const lower = useIndexCycler(lowers);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				upper.prev();
				lower.prev();
			}
			if (e.key === "ArrowRight") {
				upper.next();
				lower.next();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [upper.index, lower.index]);

	const currentUpperId = uppers[upper.index]?.id ?? null;
	const currentLowerId = lowers[lower.index]?.id ?? null;
	const canSave = currentUpperId !== null || currentLowerId !== null;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-end">
				<Button onClick={() => onSaveOutfit(currentUpperId, currentLowerId)} disabled={!canSave}>
					<Heart className="mr-2 size-4" /> Save outfit
				</Button>
			</div>
			<div ref={containerRef} className="grid gap-4 sm:grid-cols-2">
				<Chooser title="Upper" current={uppers[upper.index]} onPrev={upper.prev} onNext={upper.next} />
				<Chooser title="Lower" current={lowers[lower.index]} onPrev={lower.prev} onNext={lower.next} />
			</div>
		</div>
	);
}

function Chooser({ title, current, onPrev, onNext }: { title: string; current?: GarmentItem; onPrev: () => void; onNext: () => void }) {
	return (
		<div className="rounded-xl border bg-card p-3 shadow-soft">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
				<div className="flex gap-2">
					<Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous">
						<ChevronLeft className="size-4" />
					</Button>
					<Button size="icon" variant="outline" onClick={onNext} aria-label="Next">
						<ChevronRight className="size-4" />
					</Button>
				</div>
			</div>
			<div className="aspect-[4/3] overflow-hidden rounded-lg border bg-background">
				{current ? (
					<img src={current.url} alt={`${title} item`} className="size-full object-cover" />
				) : (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">No items</div>
				)}
			</div>
		</div>
	);
}

function SavedOutfits({ outfits, items, onDelete }: { outfits: Outfit[]; items: GarmentItem[]; onDelete: (id: string) => void }) {
	const getItemById = (id: string | null) => (id ? items.find((i) => i.id === id) : undefined);
	if (!outfits.length) {
		return <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No saved outfits yet.</div>;
	}
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{outfits.map((o) => {
				const upper = getItemById(o.upperId);
				const lower = getItemById(o.lowerId);
				return (
					<div key={o.id} className="rounded-xl border bg-card p-3 shadow-soft">
						<div className="mb-2 flex items-center justify-between">
							<div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
							<Button variant="outline" size="sm" onClick={() => onDelete(o.id)}>Delete</Button>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="aspect-[4/3] overflow-hidden rounded-lg border bg-background">
								{upper ? <img src={upper.url} alt="upper" className="size-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No upper</div>}
							</div>
							<div className="aspect-[4/3] overflow-hidden rounded-lg border bg-background">
								{lower ? <img src={lower.url} alt="lower" className="size-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No lower</div>}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}




