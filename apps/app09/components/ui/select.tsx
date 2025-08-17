"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

export function Select({ value, onValueChange, children, className }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; className?: string }) {
	return (
		<SelectPrimitive.Root value={value} onValueChange={onValueChange}>
			<SelectPrimitive.Trigger className={cn("flex h-9 w-full rounded-md border bg-transparent px-3 text-sm", className)}>
				<SelectPrimitive.Value />
			</SelectPrimitive.Trigger>
			<SelectPrimitive.Portal>
				<SelectPrimitive.Content className="z-50 overflow-hidden rounded-md border bg-background shadow-soft">
					<SelectPrimitive.Viewport className="p-1">
						{children}
					</SelectPrimitive.Viewport>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
	return (
		<SelectPrimitive.Item value={value} className="relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent">
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}


