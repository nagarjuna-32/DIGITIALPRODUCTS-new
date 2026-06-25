import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Vault | Access Thousands of Premium Digital Assets Instantly",
  description: "Download 3000+ premium graphics assets, video editing assets, T-shirt designs, Canva templates, code scripts, mockups, fonts, and ebooks instantly. Standard Category at ₹99, Full Vault Access at ₹499.",
  keywords: "digital products, premium vectors, t-shirt vectors, editing assets, mockup pack, nextjs templates, canva mockups, developer resource, cheap templates",
  openGraph: {
    title: "Digital Vault - Premium Digital Asset Marketplace",
    description: "Get lifetime access to thousands of editing, graphics, apparel designs, mockups, and guides. Standard Category at ₹99, Full Vault Access at ₹499.",
    url: "https://digitalvault.com",
    siteName: "Digital Vault",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=630&q=80",
        width: 1200,
        height: 630,
        alt: "Digital Vault Marketplace Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Vault - Premium Marketplace",
    description: "Download thousands of high-quality mockups, graphics, apparel designs, and templates instantly.",
    images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=630&q=80"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Link for PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f8fafc" />
      </head>
      <body className="min-h-full flex flex-col bg-brand-dark text-slate-900 font-sans relative overflow-x-hidden">
        {/* Futuristic Floating Gradient Blobs */}
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-cyan/10 blur-[120px] pointer-events-none animate-blob" style={{ animationDelay: '0s' }} />
        <div className="fixed top-[45%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-purple/10 blur-[130px] pointer-events-none animate-blob" style={{ animationDelay: '4s' }} />
        <div className="fixed bottom-[-10%] left-[15%] w-[40vw] h-[40vw] rounded-full bg-brand-indigo/8 blur-[110px] pointer-events-none animate-blob" style={{ animationDelay: '8s' }} />

        {/* Soft glass reflections and grids */}
        <div className="fixed inset-0 grid-dots pointer-events-none opacity-70" />

        <Sidebar />

        <Suspense fallback={<div className="h-16 border-b border-zinc-200 bg-white/60 backdrop-blur-md" />}>
          <Navbar />
        </Suspense>
        <main className="flex-grow flex flex-col relative z-10 md:pl-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
