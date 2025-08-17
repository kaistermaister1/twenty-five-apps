import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "Reading Tracker",
	description: "Goodreads-style personal reading tracker.",
	manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	viewportFit: "cover",
	themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<ThemeProvider>
					<Toaster>
						<div className="min-h-dvh bg-background text-foreground">
							<div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
								{children}
							</div>
						</div>
					</Toaster>
				</ThemeProvider>
			</body>
		</html>
	);
}


