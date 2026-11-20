import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "OVERCLOCK STORE // Licenças Digitais e Softwares de Alta Performance",
  description: "A melhor loja de licenças digitais de software com entrega instantânea automatizada, proteção de HWID e suporte 24/7.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicone.jpeg", type: "image/jpeg" },
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
    <html lang="en" className="dark scroll-smooth">
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


