'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { AcademyTarget } from '@cdsprep/types';
import { Button, Input } from '@cdsprep/ui';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Shield,
  Check,
  X,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetAcademy, setTargetAcademy] = useState<AcademyTarget>(AcademyTarget.IMA);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ token: string } | null>(null);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please meet all password security requirements before proceeding.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await register({
        fullName,
        email,
        password,
        targetAcademy,
      });

      setSuccessInfo({ token: res.verificationToken });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const academyOptions = [
    {
      id: AcademyTarget.IMA,
      title: 'IMA',
      subtitle: 'Indian Military Academy',
      papers: 'English • GK • Elementary Maths',
    },
    {
      id: AcademyTarget.OTA,
      title: 'OTA',
      subtitle: 'Officers Training Academy',
      papers: 'English • GK (Maths Exempted)',
    },
    {
      id: AcademyTarget.AFA,
      title: 'AFA',
      subtitle: 'Air Force Academy',
      papers: 'English • GK • Elementary Maths',
    },
    {
      id: AcademyTarget.INA,
      title: 'INA',
      subtitle: 'Indian Naval Academy',
      papers: 'English • GK • Elementary Maths',
    },
  ];

  if (successInfo) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Registration Complete!</h2>
        <p className="text-sm text-slate-300">
          Welcome aboard, Cadet <span className="font-semibold text-white">{fullName}</span>. Your CDSPrep profile and target academy (<span className="text-emerald-400 font-bold">{targetAcademy}</span>) have been established.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-left text-xs space-y-1">
          <div className="font-semibold text-slate-400">Email Verification Architecture:</div>
          <p className="text-slate-300 font-mono text-[11px] break-all">
            Token: {successInfo.token}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link href={`/verify-email?token=${encodeURIComponent(successInfo.token)}`}>
            <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
              Verify Email Now
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
              Proceed to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Cadet Enlistment</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Begin your structured preparation for the UPSC Combined Defence Services examination.
        </p>
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
            Cadet Full Name
          </label>
          <div className="relative mt-1.5">
            <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vikram Singh"
              className="pl-10 h-11 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
        </div>

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
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Password
          </label>
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

          {/* Real-time password requirement checklist */}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : ''}`}>
              {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>8+ characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : ''}`}>
              {hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>Uppercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-400' : ''}`}>
              {hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>Lowercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
              {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>At least one number</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Target Academy Preference
          </label>
          <div className="grid grid-cols-2 gap-2">
            {academyOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetAcademy(opt.id)}
                className={`rounded-xl border p-2.5 text-left transition ${
                  targetAcademy === opt.id
                    ? 'border-emerald-500 bg-emerald-950/40 shadow-sm'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{opt.title}</span>
                  {targetAcademy === opt.id && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div className="text-[11px] text-slate-300">{opt.subtitle}</div>
                <div className="mt-1 text-[10px] text-slate-500 line-clamp-1">{opt.papers}</div>
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !isPasswordValid}
          className="w-full h-11 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          ) : (
            <>
              <span>Create Cadet Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link
          href="/login"
          className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
        >
          Sign in here
        </Link>
      </div>
    </div>
  );
}
