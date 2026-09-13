'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { Button, Input } from '@cdsprep/ui';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Cadet Sign In</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Enter your credentials to access your CDS prep dashboard and active tests.
        </p>
      </div>

      {/* Demo Credentials Helper Box for seamless testing */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <UserCheck className="h-4 w-4" />
          <span>Quick Demo Access (Click to autofill)</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('student@cdsprep.com', 'Cdsprep@2026')}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            <div className="font-semibold text-slate-200">Cadet (Student)</div>
            <div className="text-[10px] text-slate-500 truncate">student@cdsprep.com</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('editor@cdsprep.com', 'Cdsprep@2026')}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            <div className="font-semibold text-slate-200">Content Editor</div>
            <div className="text-[10px] text-slate-500 truncate">editor@cdsprep.com</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('moderator@cdsprep.com', 'Cdsprep@2026')}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            <div className="font-semibold text-slate-200">Moderator</div>
            <div className="text-[10px] text-slate-500 truncate">moderator@cdsprep.com</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin@cdsprep.com', 'Cdsprep@2026')}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            <div className="font-semibold text-slate-200">Admin Staff</div>
            <div className="text-[10px] text-slate-500 truncate">admin@cdsprep.com</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('superadmin@cdsprep.com', 'Cdsprep@2026')}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            <div className="font-semibold text-slate-200">Super Admin</div>
            <div className="text-[10px] text-slate-500 truncate">superadmin@cdsprep.com</div>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Email Address
          </label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cadet@example.com"
              className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          ) : (
            <>
              <span>Sign In to Cadet HQ</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Don&apos;t have an active cadet registration?{' '}
        <Link
          href="/register"
          className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
        >
          Register for CDSPrep
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading sign in...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
