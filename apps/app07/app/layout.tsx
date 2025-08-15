import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Caveat } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-hand" });

export const metadata: Metadata = {
	title: "Poop Map",
	description: "Track your bathroom adventures with notes and photos",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Poop Map",
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
	themeColor: "#fa5252",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`h-full bg-[#F8F5EE] ${poppins.variable} ${caveat.variable}`}>
			<body className="min-h-full antialiased text-slate-900">
				<div className="safe-top" />
				<div className="mx-auto max-w-md min-h-screen pb-24">
					{children}
				</div>
				<div className="safe-bottom" />
			</body>
		</html>
	);
}


