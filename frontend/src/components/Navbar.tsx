'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Search, Menu, X, User, LogOut, Shield, LayoutDashboard, Database, HelpCircle } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, initialize, logout } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const query = searchParams.get('search') || '';
    setSearchQuery(query);
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/category?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/category');
    }
  };

  const handleLogoutClick = () => {
    logout();
    router.push('/');
    setUserDropdownOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-brand-dark/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-purple to-brand-cyan text-white shadow-md shadow-brand-purple/20 group-hover:scale-105 transition-transform duration-200">
              <Database className="h-5 w-5" />
            </span>
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-brand-cyan transition-all duration-300">
              Digital<span className="font-extrabold text-brand-purple text-glow">Vault</span>
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative group">
            <input
              type="text"
              placeholder="Search premium templates, vectors, ebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full border border-white/10 bg-white/5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-purple focus:bg-white/10 transition-all duration-200"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-brand-purple transition-colors duration-200" />
          </form>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/category" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Browse Products
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Pricing Plans
            </Link>
            <Link href="/#faq" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              FAQs
            </Link>
            <Link href="/blog" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Blog
            </Link>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-4">
            
            {/* Search Icon for Mobile */}
            <Link href="/category" className="md:hidden p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
              <Search className="h-5 w-5" />
            </Link>

            {isAuthenticated && user ? (
              /* User authenticated dropdown */
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:border-brand-purple transition-all duration-200 cursor-pointer"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center text-xs font-bold text-white uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/5 bg-[#09090b]/95 backdrop-blur-xl p-2 shadow-2xl shadow-black/80 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                      <p className="text-xs text-zinc-500">Signed in as</p>
                      <p className="text-sm font-semibold text-zinc-200 truncate">{user.email}</p>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <LayoutDashboard className="h-4 w-4 text-brand-purple" />
                      User Dashboard
                    </Link>

                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-all"
                      >
                        <Shield className="h-4 w-4 text-brand-cyan" />
                        Admin Control Panel
                      </Link>
                    )}

                    <button
                      onClick={handleLogoutClick}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Guest Auth Buttons */
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-block rounded-full px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90 transition-opacity text-white text-sm font-semibold px-4 py-2 shadow-md shadow-brand-purple/20"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/5 bg-brand-dark/95 backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <div className="space-y-1 px-4 pb-4 pt-2">
            <Link
              href="/category"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Browse Products
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Pricing Plans
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              FAQs
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Blog
            </Link>
            {!isAuthenticated && (
              <div className="border-t border-white/5 mt-4 pt-4 flex gap-4">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
