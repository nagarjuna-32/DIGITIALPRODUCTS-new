'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Database, Mail, Lock, User, Loader2 } from 'lucide-react';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, token, isAuthenticated } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // If already logged in, bounce out
    if (isAuthenticated && token) {
      router.push(redirectUrl);
    }
  }, [isAuthenticated, token, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save credentials in client store
      login(data.token, data.user);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Google Login Simulation for Dev Testing
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const devName = `dev_${Math.floor(Math.random() * 1000)}`;
      const mockGoogleToken = `mock_${devName}`;

      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ googleToken: mockGoogleToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Google Auth verification failed');
      }

      login(data.token, data.user);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative grid-dots bg-slate-950 text-white min-h-[calc(100vh-4rem)]">
      {/* Glow ambient background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] bg-brand-cyan/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-white mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan text-white shadow-md shadow-brand-purple/20">
              <Database className="h-5.5 w-5.5" />
            </span>
            <span>Digital<span className="font-extrabold text-brand-purple">Vault</span></span>
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-white">Create your free account</h2>
          <p className="text-xs text-zinc-500 mt-1">Get lifetime access to thousands of premium resources</p>
        </div>

        {/* Card Shell */}
        <div className="p-8 rounded-3xl border border-white/5 bg-[#09090b]/45 backdrop-blur-md space-y-5">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/10 bg-red-500/5 text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400">Your Full Name:</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
                <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400">Email Address:</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400">Account Password:</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {/* Sign-up Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-brand-purple hover:bg-brand-purple/95 font-bold text-xs text-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-semibold uppercase">Or continue with</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Google Login Trigger */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="h-4 w-4 text-brand-cyan fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.532 0-6.4-2.868-6.4-6.4s2.868-6.4 6.4-6.4c1.782 0 3.255.672 4.4 1.76l3.226-3.227C19.167 2.057 15.932 1 12.24 1 5.766 1 12.24 5.766 12.24 12.24s4.766 11.24 11.24 11.24c6.326 0 11.24-4.596 11.24-11.24 0-.742-.08-1.423-.2-1.955H12.24z" />
            </svg>
            Google Auth (Sandbox test)
          </button>

          {/* Footer Register Link */}
          <p className="text-center text-xs text-zinc-500 pt-2">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-purple hover:underline font-bold transition-all">
              Sign in
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex justify-center items-center py-44">
        <Loader2 className="h-10 w-10 animate-spin text-brand-purple" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
