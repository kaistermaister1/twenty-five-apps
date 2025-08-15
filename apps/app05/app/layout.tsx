import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cycling Birthday Winners",
  description: "Find pro cycling winners on your birthday",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cycling Birthday Winners",
  },
  icons: {
    apple: "/icons/icon192.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#006bff",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gradient-to-b from-brand-50 to-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}


