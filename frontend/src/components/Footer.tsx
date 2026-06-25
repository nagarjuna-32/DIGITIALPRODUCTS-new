import React from 'react';
import Link from 'next/link';
import { Database, Mail, MapPin, Shield, CheckCircle, HelpCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black pt-16 pb-8 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white group">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-purple to-brand-cyan text-white shadow-md shadow-brand-purple/20">
                <Database className="h-5 w-5" />
              </span>
              <span>
                Digital<span className="font-extrabold text-brand-purple">Vault</span>
              </span>
            </Link>
            <p className="text-sm max-w-sm text-zinc-400 leading-relaxed">
              Access thousands of premium digital products, mockups, code templates, vectors, editing presets, ebooks, and courses instantly with high-speed secure CDN downloads.
            </p>
            <div className="flex gap-4 pt-2 text-zinc-500">
              <span className="flex items-center gap-1 text-xs hover:text-zinc-300">
                <Shield className="h-3.5 w-3.5" /> SECURE GATEWAY
              </span>
              <span className="flex items-center gap-1 text-xs hover:text-zinc-300">
                <CheckCircle className="h-3.5 w-3.5" /> VERIFIED ASSETS
              </span>
            </div>
          </div>

          {/* Core Categories */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wider uppercase">Hot Categories</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/category?category=graphics-assets" className="hover:text-white transition-colors">
                  Graphics Assets
                </Link>
              </li>
              <li>
                <Link href="/category?category=t-shirt-designs" className="hover:text-white transition-colors">
                  T-Shirt Designs
                </Link>
              </li>
              <li>
                <Link href="/category?category=canva-templates" className="hover:text-white transition-colors">
                  Canva Templates
                </Link>
              </li>
              <li>
                <Link href="/category?category=editing-assets" className="hover:text-white transition-colors">
                  Editing Assets
                </Link>
              </li>
              <li>
                <Link href="/category?category=ebooks" className="hover:text-white transition-colors">
                  Ebooks & Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Policy */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wider uppercase">Company Policies</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/legal/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/refund" className="hover:text-white transition-colors">
                  Refund & Return Policy
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Our Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Ticket */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wider uppercase">Contact Support</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors font-medium">
                  <HelpCircle className="h-4 w-4 text-brand-purple" />
                  Open Support Ticket
                </Link>
              </li>
              <li className="flex items-start gap-2 pt-2">
                <Mail className="h-4.5 w-4.5 text-brand-cyan shrink-0 mt-0.5" />
                <span className="break-all text-zinc-400">support@digitalvault.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4.5 w-4.5 text-brand-cyan shrink-0 mt-0.5" />
                <span className="text-zinc-500">Global Offices, India</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Digital Vault. Designed for creators globally.</p>
          <div className="flex gap-4">
            <span className="text-zinc-600">Razorpay Protected</span>
            <span className="text-zinc-600">Cloudflare CDN Served</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
