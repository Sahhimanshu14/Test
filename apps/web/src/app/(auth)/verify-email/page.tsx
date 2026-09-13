'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { Button, Input } from '@cdsprep/ui';
import {
  MailCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setError('Please provide a valid verification token.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/auth/verify-email', {
        token: tokenToVerify.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Email verification failed. The token may be expired or already used.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryToken) {
      handleVerify(queryToken);
    }
  }, [queryToken]);

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
        <h2 className="text-2xl font-bold tracking-tight text-white">Verify Email Address</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Confirm your cadet communication channel for UPSC exam updates and mock results.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Email Clearance Verified!</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your cadet email status is now verified with full platform access. You can take all full-length mock exams and receive AI explanations.
          </p>
          <Link href="/dashboard">
            <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
              Access Cadet Dashboard
            </Button>
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(token);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Verification Token
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from registration"
                className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white font-mono text-xs placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full h-11 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <>
                <span>Confirm Email Verification</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading verification...</div>}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
