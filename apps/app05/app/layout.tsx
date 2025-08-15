import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cycling Birthday Winners",
  description: "Find pro cycling winners on your birthday",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: "#006bff",
  manifest: "/manifest.webmanifest",
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


