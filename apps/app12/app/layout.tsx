import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Calendar",
	description: "Basic calendar UI",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Calendar",
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
  themeColor: "#7b1b3a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          // Use white so iOS PWA safe areas (home indicator) inherit white, matching the bottom ribbon
          background: "#ffffff",
          color: "#111827",
          WebkitTapHighlightColor: "transparent",
          WebkitTouchCallout: "none",
          overflow: "hidden"
        }}
      >
        {children}
      </body>
    </html>
  );
}


