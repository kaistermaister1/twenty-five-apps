import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice Notes",
  description: "Beautiful, simple voice-to-text notes",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gradient-to-br from-brand-50 to-white">
      <body className="min-h-full antialiased text-slate-900">
        <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </body>
    </html>
  );
}


