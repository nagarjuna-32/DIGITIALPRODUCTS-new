'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Search, Menu, X, LogOut, Shield, LayoutDashboard, Database } from 'lucide-react';

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
    <nav className="sticky top-0 z-30 w-full border-b border-slate-200/50 bg-white/45 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-purple text-white shadow-sm shadow-brand-indigo/25 group-hover:scale-105 transition-transform duration-200">
              <Database className="h-5 w-5" />
            </span>
            <span className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent group-hover:to-brand-indigo transition-all duration-300">
              Digital<span className="font-extrabold text-brand-indigo">Vault</span>
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative group">
            <input
              type="text"
              placeholder="Search premium templates, vectors, ebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full border border-slate-200 bg-white/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-indigo focus:bg-white/80 transition-all duration-200"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-brand-indigo transition-colors duration-200" />
          </form>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/category" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Browse Products
            </Link>
            <Link href="/#pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Pricing Plans
            </Link>
            <Link href="/#faq" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              FAQs
            </Link>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-4">
            
            {/* Search Icon for Mobile */}
            <Link href="/category" className="md:hidden p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
              <Search className="h-5 w-5" />
            </Link>

            {isAuthenticated && user ? (
              /* User authenticated dropdown */
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-purple flex items-center justify-center text-xs font-bold text-white uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xl p-2 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{user.email}</p>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                      <LayoutDashboard className="h-4 w-4 text-brand-indigo" />
                      User Dashboard
                    </Link>

                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                      >
                        <Shield className="h-4 w-4 text-brand-purple" />
                        Admin Control Panel
                      </Link>
                    )}

                    <button
                      onClick={handleLogoutClick}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all text-left cursor-pointer"
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
                  className="hidden sm:inline-block rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full btn-navy text-xs font-bold px-5 py-2 cursor-pointer transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <div className="space-y-1 px-4 pb-4 pt-2">
            <Link
              href="/category"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Browse Products
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Pricing Plans
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              FAQs
            </Link>
            {!isAuthenticated && (
              <div className="border-t border-slate-100 mt-4 pt-4 flex gap-4">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-lg btn-navy py-2.5 text-sm font-semibold text-white"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
