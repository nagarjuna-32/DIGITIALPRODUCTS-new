'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Home, ShoppingBag, LayoutDashboard, Shield, LogIn, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated, initialize, logout } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Browse Catalog', href: '/category', icon: ShoppingBag },
  ];

  if (isAuthenticated && user) {
    navItems.push({ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard });
    if (user.role === 'ADMIN') {
      navItems.push({ name: 'Admin Panel', href: '/admin', icon: Shield });
    }
  }

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`hidden md:flex fixed left-4 top-24 bottom-24 z-40 flex flex-col justify-between p-3.5 rounded-3xl glass-panel shadow-sm transition-all duration-300 ease-out ${
        isExpanded ? 'w-56' : 'w-14'
      }`}
    >
      <div className="flex flex-col gap-6">
        {/* Brand / Logo Icon */}
        <div className="flex items-center gap-3 px-1.5 py-1">
          <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl bg-brand-indigo text-white shadow-sm shadow-brand-indigo/25">
            <span className="font-extrabold text-[10px]">DV</span>
          </div>
          {isExpanded && (
            <span className="font-bold text-xs text-slate-800 tracking-tight animate-in fade-in duration-200">
              Digital<span className="text-brand-indigo">Vault</span>
            </span>
          )}
        </div>

        {/* Navigation Routes */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
                {isExpanded && (
                  <span className="text-[11px] font-bold tracking-tight whitespace-nowrap animate-in fade-in duration-200">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile or Sign In Actions */}
      <div className="flex flex-col gap-1.5 border-t border-slate-200/50 pt-4">
        {isAuthenticated && user ? (
          <button
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="flex items-center gap-3 p-2.5 rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 cursor-pointer text-left w-full"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {isExpanded && (
              <span className="text-[11px] font-bold whitespace-nowrap animate-in fade-in duration-200">
                Sign Out
              </span>
            )}
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-3 p-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer"
          >
            <LogIn className="h-4.5 w-4.5 shrink-0" />
            {isExpanded && (
              <span className="text-[11px] font-bold whitespace-nowrap animate-in fade-in duration-200">
                Sign In
              </span>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
}
