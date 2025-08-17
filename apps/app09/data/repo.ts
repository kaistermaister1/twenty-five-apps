export type BookStatus = "to-read" | "reading" | "finished";

export type Book = {
	id: string;
	title: string;
	author: string;
	status: BookStatus;
	categories: string[];
	startedDate?: string; // ISO
	finishedDate?: string; // ISO
	rating?: number; // 1-5
	notes?: string;
};

export type ReadingGoal = { year: number; target: number };

export type BooksRepo = {
	listBooks(): Promise<Book[]>;
	getBook(id: string): Promise<Book | null>;
	upsertBook(book: Book): Promise<void>;
	deleteBook(id: string): Promise<void>;
	listCategories(): Promise<string[]>;
	getGoal(): Promise<ReadingGoal | null>;
	setGoal(goal: ReadingGoal): Promise<void>;
};

const STORAGE_KEYS = {
	books: "reading-tracker:books",
	goal: "reading-tracker:goal",
} as const;

export function createBooksRepo(): BooksRepo {
	return {
		async listBooks() {
			if (typeof window === "undefined") return [];
			const raw = localStorage.getItem(STORAGE_KEYS.books);
			return raw ? (JSON.parse(raw) as Book[]) : [];
		},
		async getBook(id: string) {
			const all = await this.listBooks();
			return all.find((b) => b.id === id) ?? null;
		},
		async upsertBook(book: Book) {
			const all = await this.listBooks();
			const idx = all.findIndex((b) => b.id === book.id);
			if (idx >= 0) all[idx] = book; else all.push(book);
			localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(all));
		},
		async deleteBook(id: string) {
			const all = await this.listBooks();
			localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(all.filter((b) => b.id !== id)));
		},
		async listCategories() {
			const all = await this.listBooks();
			const set = new Set<string>();
			for (const b of all) for (const c of b.categories ?? []) set.add(c);
			return Array.from(set).sort((a, b) => a.localeCompare(b));
		},
		async getGoal() {
			if (typeof window === "undefined") return null;
			const raw = localStorage.getItem(STORAGE_KEYS.goal);
			return raw ? (JSON.parse(raw) as ReadingGoal) : null;
		},
		async setGoal(goal: ReadingGoal) {
			localStorage.setItem(STORAGE_KEYS.goal, JSON.stringify(goal));
		},
	};
}

export function createEmptyBook(): Book {
	return {
		id: (globalThis as any).crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}_${Date.now()}`,
		title: "",
		author: "",
		status: "to-read",
		categories: [],
	};
}


