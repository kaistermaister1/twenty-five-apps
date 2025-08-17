"use client";
import { Toaster as T } from "./use-toast";
export function Toaster({ children }: { children?: React.ReactNode }) {
	return <T>{children}</T>;
}


