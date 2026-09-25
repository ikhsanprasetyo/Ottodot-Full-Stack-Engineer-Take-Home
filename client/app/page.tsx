'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ottodotApi } from '@/lib/ottodot-api';
import { LogIn, User, Shield, Sparkles, BookOpen, CheckCircle2, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('parent1@byteseeker.net');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await ottodotApi.login(email, password);
      if (res.success && res.data.token) {
        localStorage.setItem('ottodot_token', res.data.token);
        localStorage.setItem('ottodot_user', JSON.stringify(res.data.user));
        router.push('/dashboard');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or server unavailable');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (quickEmail: string, role: string, name: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    // Save transient demo state
    localStorage.setItem('ottodot_demo_role', role);
    localStorage.setItem('ottodot_demo_name', name);
    setTimeout(() => {
      handleLogin();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-sm mb-4">
          <BookOpen className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Ottodot Learning
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Trial Booking Reliability & Live Class Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-sm sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs p-3 rounded-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-sm text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-sm text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Selector */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              Quick Demo Accounts
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('parent1@byteseeker.net', 'parent', 'Ikhsan Parent')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950 hover:bg-slate-800/60 border border-slate-800/80 rounded-sm text-left transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">
                    Parent 1: Ikhsan Parent
                  </div>
                  <div className="text-[11px] text-slate-500">2 Children: Leo (8y), Maya (10y)</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => quickLogin('parent2@byteseeker.net', 'parent', 'Sarah Jenkins')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950 hover:bg-slate-800/60 border border-slate-800/80 rounded-sm text-left transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">
                    Parent 2: Sarah Jenkins
                  </div>
                  <div className="text-[11px] text-slate-500">1 Child: Ethan (7y)</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => quickLogin('admin@ottodot.net', 'admin', 'Ottodot Teacher Admin')}
                className="w-full flex items-center justify-between p-2.5 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-800/50 rounded-sm text-left transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    Teacher / Admin Account
                  </div>
                  <div className="text-[11px] text-indigo-400/80">View Rosters & Edit Class Limits</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
