import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schedule to Google Calendar",
  description: "Upload a schedule image, confirm details, and add recurring classes to Google Calendar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Schedule to GCal",
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


