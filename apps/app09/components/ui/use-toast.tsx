"use client";
import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";

type ToastItem = { id: number; title?: string; description?: string };

const ToastContext = React.createContext<{ notify: (t: Omit<ToastItem, "id">) => void } | null>(null);

export function Toaster({ children }: { children?: React.ReactNode }) {
	const [items, setItems] = React.useState<ToastItem[]>([]);
	const notify = React.useCallback((t: Omit<ToastItem, "id">) => {
		setItems((prev) => [...prev, { id: Date.now() + Math.random(), ...t }]);
	}, []);
	return (
		<ToastContext.Provider value={{ notify }}>
			{children}
			<ToastPrimitives.Provider swipeDirection="right">
				<div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
					{items.map((t) => (
						<ToastPrimitives.Root key={t.id} className="rounded-md border bg-background p-3 shadow-soft" onOpenChange={(open) => { if (!open) setItems((p) => p.filter((i) => i.id !== t.id)); }} open>
							<ToastPrimitives.Title className="text-sm font-semibold">{t.title}</ToastPrimitives.Title>
							{t.description ? <ToastPrimitives.Description className="text-sm text-muted-foreground">{t.description}</ToastPrimitives.Description> : null}
						</ToastPrimitives.Root>
					))}
				</div>
				<ToastPrimitives.Viewport />
			</ToastPrimitives.Provider>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = React.useContext(ToastContext);
	return {
		toast: (t: { title?: string; description?: string }) => ctx?.notify?.(t),
	};
}


