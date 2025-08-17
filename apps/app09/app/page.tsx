"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, BookOpenCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createBooksRepo, type Book, type BookStatus, type ReadingGoal } from "@/data/repo";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { BookForm } from "@/components/book-form";
import { BookCard } from "@/components/book-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
	const repo = useMemo(() => createBooksRepo(), []);
	const { toast } = useToast();
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<BookStatus | "all">("all");
	const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
	const [books, setBooks] = useState<Book[] | null>(null);
	const [categories, setCategories] = useState<string[]>([]);
	const [goal, setGoal] = useState<ReadingGoal | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Book | null>(null);

	useEffect(() => {
		const load = async () => {
			const all = await repo.listBooks();
			setBooks(all);
			setCategories(await repo.listCategories());
			setGoal(await repo.getGoal());
		};
		load();
	}, [repo]);

	const filtered = useMemo(() => {
		if (!books) return null;
		return books.filter((b) => {
			const matchesQuery = `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase());
			const matchesStatus = statusFilter === "all" ? true : b.status === statusFilter;
			const matchesCategory = categoryFilter === "all" ? true : b.categories?.includes(categoryFilter);
			return matchesQuery && matchesStatus && matchesCategory;
		});
	}, [books, query, statusFilter, categoryFilter]);

	const finishedThisYear = useMemo(() => {
		if (!books) return 0;
		const year = new Date().getFullYear();
		return books.filter((b) => b.status === "finished" && b.finishedDate && new Date(b.finishedDate).getFullYear() === year).length;
	}, [books]);

	const handleSave = async (book: Book) => {
		await repo.upsertBook(book);
		setBooks(await repo.listBooks());
		setCategories(await repo.listCategories());
		toast({ title: "Saved", description: `“${book.title}” saved.` });
		setShowForm(false);
		setEditing(null);
	};

	const handleDelete = async (id: string) => {
		await repo.deleteBook(id);
		setBooks(await repo.listBooks());
		toast({ title: "Deleted", description: "Book removed." });
	};

	const handleMarkFinished = async (book: Book) => {
		const now = new Date();
		const updated: Book = {
			...book,
			status: "finished",
			finishedDate: book.finishedDate ?? now.toISOString().slice(0, 10),
		};
		await repo.upsertBook(updated);
		setBooks(await repo.listBooks());
		toast({ title: "Marked finished", description: `“${book.title}” completed.` });
	};

	const handleGoalSave = async (target: number) => {
		await repo.setGoal({ year: new Date().getFullYear(), target });
		setGoal(await repo.getGoal());
		toast({ title: "Goal updated", description: `Target set to ${target}.` });
	};

	return (
		<div className="space-y-6">
			<header className="flex items-center justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Reading Tracker</h1>
					<p className="text-sm text-muted-foreground">Keep track of books across your reading journey.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => setShowForm(true)}>
						<Plus className="size-4" /> Add book
					</Button>
				</div>
			</header>

			<section className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-lg border bg-card p-4 shadow-soft">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Target className="size-4 text-primary" />
							<h2 className="text-sm font-medium">Yearly goal</h2>
						</div>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								const form = e.currentTarget as HTMLFormElement;
								const input = form.elements.namedItem("goal") as HTMLInputElement;
								const val = parseInt(input.value || "0", 10) || 0;
								handleGoalSave(val);
							}}>
							<div className="flex items-center gap-2">
								<Input name="goal" defaultValue={goal?.target ?? 12} className="w-24" inputMode="numeric" />
								<Button type="submit" size="sm" variant="outline">Save</Button>
							</div>
						</form>
					</div>
					<div className="mt-4 space-y-2">
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<span>{finishedThisYear} finished</span>
							<span>{goal?.target ?? 0} target</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary"
								style={{ width: `${Math.min(100, ((finishedThisYear || 0) / Math.max(1, goal?.target || 0)) * 100)}%` }}
							/>
						</div>
					</div>
				</div>

				<div className="rounded-lg border bg-card p-4 shadow-soft">
					<div className="flex items-center gap-2">
						<BookOpenCheck className="size-4 text-primary" />
						<h2 className="text-sm font-medium">Filters</h2>
					</div>
					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						<label className="relative">
							<Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or author" className="pl-8" />
						</label>
						<div className="flex gap-2">
							<select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
								<option value="all">All statuses</option>
								<option value="to-read">To read</option>
								<option value="reading">Reading</option>
								<option value="finished">Finished</option>
							</select>
							<select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
								<option value="all">All categories</option>
								{categories.map((c) => (
									<option key={c} value={c}>{c}</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</section>

			<section className="rounded-lg border bg-card p-2 shadow-soft">
				{!filtered ? (
					<div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="rounded-lg border p-3">
								<Skeleton className="h-4 w-3/5" />
								<div className="mt-2 space-y-2">
									<Skeleton className="h-3 w-4/5" />
									<Skeleton className="h-3 w-2/5" />
								</div>
							</div>
						))}
					</div>
				) : filtered.length === 0 ? (
					<div className="p-10 text-center">
						<p className="text-muted-foreground">No books yet. Add your first one!</p>
						<Button className="mt-4" onClick={() => setShowForm(true)}>
							<Plus className="mr-2 size-4" /> Add book
						</Button>
					</div>
				) : (
					<ScrollArea className="max-h-[60vh]">
						<ul className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
							<AnimatePresence initial={false}>
								{filtered.map((book) => (
									<motion.li key={book.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: "easeOut" }}>
										<BookCard book={book} onEdit={() => { setEditing(book); setShowForm(true); }} onDelete={() => handleDelete(book.id)} onMarkFinished={() => handleMarkFinished(book)} />
									</motion.li>
								))}
							</AnimatePresence>
						</ul>
					</ScrollArea>
				)}
			</section>

			<AnimatePresence>
				{showForm && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
						<div className="absolute inset-0 bg-black/40" onClick={() => { setShowForm(false); setEditing(null); }} />
						<motion.div initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24 }} transition={{ duration: 0.18 }} className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl border bg-background p-4 shadow-soft">
							<div className="flex items-center justify-between">
								<h3 className="text-base font-semibold">{editing ? "Edit book" : "Add book"}</h3>
								<Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Close</Button>
							</div>
							<div className="mt-2">
								<BookForm initial={editing ?? undefined} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<Toaster />
		</div>
	);
}


