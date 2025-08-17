import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "Reading Tracker",
	description: "Goodreads-style personal reading tracker.",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Reading Tracker",
	},
	icons: {
		icon: [
			{ url: "/icons/icon192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon512.png", sizes: "512x512", type: "image/png" },
		],
		apple: "/icons/icon192.png",
	},
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
			<body className="antialiased" style={{ WebkitTapHighlightColor: "transparent", WebkitTouchCallout: "none" }}>
				<ThemeProvider>
					<Toaster>
						<div className="min-h-dvh bg-background text-foreground">
							<div className="safe-top" />
							<div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
								{children}
							</div>
							<div className="safe-bottom" />
						</div>
					</Toaster>
				</ThemeProvider>
			</body>
		</html>
	);
}


