import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Overclock Store // Licenças Digitais, Spoofers e Utilitários para PC",
  description: "Overclock Store — Licenças digitais, spoofers e utilitários para PC com entrega automática via Pix, status transparente e suporte em português.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicone.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },
};

import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-surface-container-lowest text-on-surface font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen relative overflow-x-hidden"
      >
        {/* Stitch Dual-Layer Background: Emerald Glow + Subtle 16px Dot-Grid */}
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12)_0%,_rgba(11,15,13,0)_65%)]" />
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:16px_16px]" />

        <AuthProvider>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Suspense fallback={<div className="h-16" />}>
              <Navbar />
            </Suspense>
            <main className="relative z-10 w-full pt-16 bg-transparent flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}


