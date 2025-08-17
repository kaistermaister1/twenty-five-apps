"use client";
import { Book, BookStatus } from "@/data/repo";
import { Button } from "@/components/ui/button";
import { BookOpen, Pencil, Trash2, Check } from "lucide-react";

export function BookCard({ book, onEdit, onDelete, onMarkFinished }: { book: Book; onEdit: () => void; onDelete: () => void; onMarkFinished?: () => void }) {
	return (
		<div className="rounded-lg border bg-background p-3 shadow-soft">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<BookOpen className="size-4 text-primary" />
						<h3 className="truncate text-sm font-semibold">{book.title}</h3>
					</div>
					<p className="truncate text-xs text-muted-foreground">{book.author}</p>
					<div className="mt-1 flex flex-wrap gap-1">
						<span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{labelForStatus(book.status)}</span>
						{book.categories?.slice(0, 3).map((c) => (
							<span key={c} className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{c}</span>
						))}
						{(book.categories?.length ?? 0) > 3 ? <span className="text-[10px] text-muted-foreground">+{(book.categories!.length - 3)}</span> : null}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button size="sm" variant="ghost" onClick={onEdit}>
						<Pencil className="size-4" />
					</Button>
					<Button size="sm" variant="ghost" onClick={onDelete}>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>
			{book.notes ? <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{book.notes}</p> : null}
			{book.rating ? <p className="mt-2 text-xs">Rating: {"★".repeat(book.rating)}{"☆".repeat(5 - book.rating)}</p> : null}
			{book.status === "reading" && !book.finishedDate && (
				<div className="mt-2">
					<Button size="sm" onClick={onMarkFinished ?? onEdit}>
						<Check className="mr-1 size-4" /> Mark finished
					</Button>
				</div>
			)}
		</div>
	);
}

function labelForStatus(s: BookStatus) {
	switch (s) {
		case "to-read":
			return "To read";
		case "reading":
			return "Reading";
		case "finished":
			return "Finished";
	}
}


