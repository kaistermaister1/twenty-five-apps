import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Loom Reviewer",
  description: "Swipe to mark Loom videos Passed or Failed and sync to monday.com",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Loom Reviewer",
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
  themeColor: "#0ea5e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gradient-to-br from-sky-50 to-white">
      <body className="min-h-full antialiased text-slate-900">
        <div className="safe-top" />
        <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">{children}</div>
        <div className="safe-bottom" />
      </body>
    </html>
  );
}


