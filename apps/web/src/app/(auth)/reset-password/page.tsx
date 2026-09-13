'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { Button, Input } from '@cdsprep/ui';
import {
  Lock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isFormValid =
    token.trim().length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (!passwordsMatch) {
        setError('New passwords do not match.');
      } else {
        setError('Please fulfill all password security rules.');
      }
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Token may be expired or invalid.');
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
        <h2 className="text-2xl font-bold tracking-tight text-white">Reset Password</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Set up a brand new secure credential for your CDSPrep account.
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Credentials Updated!</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your password has been successfully reset using Argon2id encryption. All other active sessions have been invalidated for security.
          </p>
          <Link href="/login">
            <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
              Sign In with New Password
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Reset Token
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your 64-character security token"
                className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white font-mono text-xs placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              New Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Confirm New Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1.5 text-[11px] text-slate-400">
            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : ''}`}>
              {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>8+ characters minimum</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasUppercase && hasLowercase ? 'text-emerald-400' : ''}`}>
              {hasUppercase && hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>Upper & lowercase letters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
              {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>At least one number</span>
            </div>
            <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : ''}`}>
              {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>Passwords match exactly</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full h-11 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <>
                <span>Commit New Password</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading password reset...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
