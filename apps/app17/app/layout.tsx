import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Random Spotify",
  description: "Find a random Spotify track with preview.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Random Spotify",
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
  themeColor: "#1DB954",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ WebkitTapHighlightColor: "transparent", WebkitTouchCallout: "none" }}>
        <div className="min-h-dvh bg-background text-foreground">
          <div className="safe-top" />
          {children}
          <div className="safe-bottom" />
        </div>
      </body>
    </html>
  );
}


