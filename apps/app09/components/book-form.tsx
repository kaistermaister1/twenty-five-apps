"use client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createEmptyBook, type Book } from "@/data/repo";

export function BookForm({ initial, onSubmit, onCancel }: { initial?: Book; onSubmit: (book: Book) => void; onCancel?: () => void }) {
	const [book, setBook] = useState<Book>(initial ?? createEmptyBook());
	const [tagInput, setTagInput] = useState("");

	useEffect(() => { if (initial) setBook(initial); }, [initial]);

	return (
		<form
			className="space-y-3"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(book);
			}}
		>
			<div className="grid gap-2 sm:grid-cols-2">
				<label className="grid gap-1 text-sm">
					<span className="text-muted-foreground">Title</span>
					<Input required value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} placeholder="The Great Book" />
				</label>
				<label className="grid gap-1 text-sm">
					<span className="text-muted-foreground">Author</span>
					<Input required value={book.author} onChange={(e) => setBook({ ...book, author: e.target.value })} placeholder="Jane Doe" />
				</label>
			</div>
			<div className="grid gap-2 sm:grid-cols-3">
				<label className="grid gap-1 text-sm">
					<span className="text-muted-foreground">Status</span>
					<select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground" value={book.status} onChange={(e) => setBook({ ...book, status: e.target.value as Book["status"] })}>
						<option value="to-read">To read</option>
						<option value="reading">Reading</option>
						<option value="finished">Finished</option>
					</select>
				</label>
				<label className="grid gap-1 text-sm">
					<span className="text-muted-foreground">Started</span>
					<Input type="date" value={book.startedDate ?? ""} onChange={(e) => setBook({ ...book, startedDate: e.target.value || undefined })} />
				</label>
				<label className="grid gap-1 text-sm">
					<span className="text-muted-foreground">Finished</span>
					<Input type="date" value={book.finishedDate ?? ""} onChange={(e) => setBook({ ...book, finishedDate: e.target.value || undefined })} />
				</label>
			</div>
			<div className="grid gap-2 sm:grid-cols-3">
				<label className="grid gap-1 text-sm">
					<span className="text-muted-foreground">Rating</span>
					<select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground" value={String(book.rating ?? "")} onChange={(e) => setBook({ ...book, rating: e.target.value ? Number(e.target.value) : undefined })}>
						<option value="">—</option>
						{[1,2,3,4,5].map((r) => (<option key={r} value={r}>{r}</option>))}
					</select>
				</label>
				<label className="grid gap-1 text-sm sm:col-span-2">
					<span className="text-muted-foreground">Tags</span>
					<div className="flex gap-2">
						<Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag and press Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (tagInput.trim() && !book.categories.includes(tagInput.trim())) { setBook({ ...book, categories: [...book.categories, tagInput.trim()] }); setTagInput(""); } } }} />
						<Button type="button" variant="outline" onClick={() => { if (tagInput.trim() && !book.categories.includes(tagInput.trim())) { setBook({ ...book, categories: [...book.categories, tagInput.trim()] }); setTagInput(""); } }}>Add</Button>
					</div>
					{book.categories.length > 0 ? (
						<div className="mt-1 flex flex-wrap gap-1">
							{book.categories.map((c) => (
								<button key={c} type="button" className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent" onClick={() => setBook({ ...book, categories: book.categories.filter((t) => t !== c) })}>{c} ×</button>
							))}
						</div>
					) : null}
				</label>
			</div>
			<label className="grid gap-1 text-sm">
				<span className="text-muted-foreground">Notes</span>
				<Textarea rows={4} value={book.notes ?? ""} onChange={(e) => setBook({ ...book, notes: e.target.value || undefined })} placeholder="Thoughts, quotes, impressions…" />
			</label>
			<div className="flex items-center justify-end gap-2 pt-1">
				{onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}
				<Button type="submit">Save</Button>
			</div>
		</form>
	);
}


