import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Rise & Rest",
  description: "Beautiful morning and night companion",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rise & Rest",
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
  themeColor: "#111827",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased text-white bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-900">
        <div className="safe-top" />
        {children}
        <div className="safe-bottom" />
      </body>
    </html>
  );
}


