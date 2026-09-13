'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { Button, Input } from '@cdsprep/ui';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; resetToken?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post<{ message: string; resetToken?: string }>(
        '/auth/forgot-password',
        { email },
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch password recovery request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">Recover Credentials</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Enter your registered cadet email address to receive secure reset credentials.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {result ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Reset Request Received</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {result.message}
          </p>

          {result.resetToken && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-left space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Security Token (Development / Inspection Token):</span>
              </div>
              <p className="text-[11px] font-mono text-slate-300 break-all bg-slate-950 p-2 rounded border border-slate-800">
                {result.resetToken}
              </p>
              <Link
                href={`/reset-password?token=${encodeURIComponent(result.resetToken)}`}
                className="block"
              >
                <Button className="w-full h-9 text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
                  Proceed to Reset Password
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Registered Email Address
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
