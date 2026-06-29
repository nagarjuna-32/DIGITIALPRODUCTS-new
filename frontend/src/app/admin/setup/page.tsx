'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Database, ShieldCheck, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function AdminSetup() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Check if admin setup is required
    fetch(`${API_URL}/admin/setup-init`)
      .then(res => res.ok ? res.json() : { setupRequired: false })
      .then(data => {
        setSetupRequired(data.setupRequired);
        if (data.setupRequired === false) {
          router.push('/admin'); // redirect to standard admin log
        }
      })
      .catch(err => {
        console.error(err);
        setSetupRequired(false);
      });
  }, [API_URL, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password.length < 8) {
      setError('Administrative password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_URL}/admin/setup-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Setup creation failed');
      }

      // Log in the new admin user
      login(data.token, data.user);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'An error occurred during system setup');
    } finally {
      setLoading(false);
    }
  };

  if (setupRequired === null) {
    return (
      <div className="flex justify-center items-center py-44 flex-grow">
        <Loader2 className="h-10 w-10 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative grid-dots bg-slate-950 text-white min-h-[calc(100vh-4rem)]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] bg-brand-purple/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        <div className="text-center">
          <span className="inline-flex items-center gap-1 bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
            First Launch Setup
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-purple" /> Establish System Administrator
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Configure your root security account credentials to run the marketplace</p>
        </div>

        <div className="p-8 rounded-3xl border border-white/5 bg-[#09090b]/45 backdrop-blur-md space-y-5">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/10 bg-red-500/5 text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400">Administrator Name:</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="System Admin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
                <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400">Admin Email:</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@digitalvault.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400">Security Password:</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-brand-purple hover:bg-brand-purple/95 font-bold text-xs text-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Provisioning System...
                </>
              ) : (
                'Establish Root Admin'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
