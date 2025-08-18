import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "StaticBall",
	description: "TV-static runner. iOS fullscreen landscape.",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StaticBall",
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0b0f14",
          color: "white",
          WebkitTapHighlightColor: "transparent",
          WebkitTouchCallout: "none",
          touchAction: "none",
        }}
      >
        <div className="safe-top" />
        {children}
        <div className="safe-bottom" />
      </body>
    </html>
  );
}


