'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ottodotApi } from '@/lib/ottodot-api';
import {
  LogIn,
  User,
  Shield,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('parent1@byteseeker.net');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (
    e?: React.FormEvent,
    overrideEmail?: string,
    overridePassword?: string
  ) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const targetEmail = overrideEmail || email;
    const targetPassword = overridePassword || password;

    try {
      const res = await ottodotApi.login(targetEmail, targetPassword);
      if (res.success && res.data.token) {
        localStorage.setItem('ottodot_token', res.data.token);
        localStorage.setItem('ottodot_user', JSON.stringify(res.data.user));
        router.push('/dashboard');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Invalid credentials or server unavailable'
      );
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (quickEmail: string, role: string, name: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    localStorage.setItem('ottodot_demo_role', role);
    localStorage.setItem('ottodot_demo_name', name);
    handleLogin(undefined, quickEmail, 'password123');
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-[#15172B] relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,246,229,.88), rgba(255,255,255,.92) 48%, rgba(221,241,246,.72)), #ffffff'
      }}
    >
      {/* Background ambient light blobs matching Ottodot homepage */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#6ACCE1]/15 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#FBAE24]/15 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="flex justify-center mb-4">
          <Logo size="md" href="/" />
        </div>

        <div className="inline-flex items-center gap-2 bg-white border border-[#EDE7DC] px-4 py-2 rounded-sm shadow-sm mb-4">
          <BookOpen className="w-4 h-4 text-[#E73449]" />
          <span className="bg-[#E73449] text-white px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide">
            Trial Booking Engine
          </span>
          <span className="text-xs font-semibold text-[#3F4159]">
            Ottodot Tuition Singapore
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#15172B] tracking-tight">
          <span className="italic text-[#E73449]">Tuition</span> Platform
        </h1>
        <p className="mt-2 text-sm text-[#3F4159]">
          Primary Math &amp; Science Tuition blended with Roblox gameplay
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white border border-[#EDE7DC] py-8 px-6 shadow-xl rounded-sm sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-[#FFF6E5] border border-[#E73449]/40 text-[#C72236] text-xs p-3 rounded-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#15172B] mb-1">
                Parent / User Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#555770]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-[#EDE7DC] rounded-sm text-sm text-[#15172B] placeholder-[#555770] focus:outline-none focus:border-[#E73449] focus:ring-1 focus:ring-[#E73449] transition-colors"
                  placeholder="parent@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#15172B] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#555770]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-[#EDE7DC] rounded-sm text-sm text-[#15172B] placeholder-[#555770] focus:outline-none focus:border-[#E73449] focus:ring-1 focus:ring-[#E73449] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-sm text-sm font-bold text-white bg-[#E73449] hover:bg-[#C72236] focus:outline-none cursor-pointer disabled:opacity-50 transition-all shadow-[0_6px_0_-2px_rgba(231,52,73,0.35)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Portal
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 border-t border-[#EDE7DC] pt-6">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wider text-[#E73449]">
              <Sparkles className="w-4 h-4 text-[#FBAE24]" />
              Quick Demo Login Options
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  quickLogin(
                    'parent1@byteseeker.net',
                    'parent',
                    'Ikhsan Parent'
                  )
                }
                className="w-full flex items-center justify-between p-3 bg-[#FFF6E5] hover:bg-[#FFECC9] border border-[#EDE7DC] rounded-sm text-left transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-bold text-[#15172B] group-hover:text-[#E73449]">
                    Parent 1: Ikhsan Parent
                  </div>
                  <div className="text-[11px] text-[#555770]">
                    2 Children: Leo (8y), Maya (10y)
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#83C341] group-hover:text-[#E73449]" />
              </button>

              <button
                type="button"
                onClick={() =>
                  quickLogin(
                    'parent2@byteseeker.net',
                    'parent',
                    'Sarah Jenkins'
                  )
                }
                className="w-full flex items-center justify-between p-3 bg-[#FFF6E5] hover:bg-[#FFECC9] border border-[#EDE7DC] rounded-sm text-left transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-bold text-[#15172B] group-hover:text-[#E73449]">
                    Parent 2: Sarah Jenkins
                  </div>
                  <div className="text-[11px] text-[#555770]">
                    1 Child: Ethan (7y)
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#83C341] group-hover:text-[#E73449]" />
              </button>

              <button
                type="button"
                onClick={() =>
                  quickLogin(
                    'admin@ottodot.net',
                    'admin',
                    'Ottodot Teacher Admin'
                  )
                }
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-[#FFF6E5] border border-[#EDE7DC] rounded-sm text-left transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-bold text-[#15172B] group-hover:text-[#E73449] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#E73449]" />
                    Teacher / Admin Mode
                  </div>
                  <div className="text-[11px] text-[#555770]">
                    View Live Roster &amp; Dynamic Seat Limits
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#6ACCE1]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
