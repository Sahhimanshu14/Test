'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import { Button, Card, Badge, AvatarCadet, useToast } from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import {
  Shield,
  Mail,
  Flame,
  CheckCircle2,
  Building,
  User,
  Lock,
  Settings,
  KeyRound,
  AlertCircle,
  Save,
} from 'lucide-react';
import { AcademyTarget } from '@cdsprep/types';

const ACADEMY_DESCRIPTIONS: Record<AcademyTarget, { name: string; papers: string; marks: number }> = {
  [AcademyTarget.IMA]: {
    name: 'Indian Military Academy (Dehradun)',
    papers: 'English, General Knowledge, Elementary Mathematics',
    marks: 300,
  },
  [AcademyTarget.INA]: {
    name: 'Indian Naval Academy (Ezhimala)',
    papers: 'English, General Knowledge, Elementary Mathematics',
    marks: 300,
  },
  [AcademyTarget.AFA]: {
    name: 'Air Force Academy (Dundigal, Hyderabad)',
    papers: 'English, General Knowledge, Elementary Mathematics',
    marks: 300,
  },
  [AcademyTarget.OTA]: {
    name: 'Officers Training Academy (Chennai)',
    papers: 'English, General Knowledge (No Maths)',
    marks: 200,
  },
};

export default function ProfilePage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <ProfileContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, refreshProfile } = useAuth();
  const { addToast } = useToast();

  // Profile details state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Target academy state
  const [targetAcademy, setTargetAcademy] = useState<AcademyTarget>(
    (user?.targetAcademy as AcademyTarget) || AcademyTarget.IMA
  );
  const [savingAcademy, setSavingAcademy] = useState(false);
  const [academySuccessMsg, setAcademySuccessMsg] = useState<string | null>(null);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
    if (user?.targetAcademy) {
      setTargetAcademy(user.targetAcademy as AcademyTarget);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Candidate name cannot be empty.',
      });
      return;
    }

    setSavingProfile(true);
    try {
      await apiClient.patch('/users/profile', { fullName: fullName.trim() });
      if (refreshProfile) {
        await refreshProfile();
      }
      addToast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Your candidate profile information has been saved.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: err.message || 'Could not update profile information',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateAcademy = async (academy: AcademyTarget) => {
    setTargetAcademy(academy);
    setSavingAcademy(true);
    setAcademySuccessMsg(null);

    try {
      await apiClient.patch('/users/profile', { targetAcademy: academy });
      if (refreshProfile) {
        await refreshProfile();
      }
      const msg = `Target academy preference updated to ${academy}`;
      setAcademySuccessMsg(msg);
      addToast({
        type: 'success',
        title: 'Target Academy Updated',
        description: msg,
      });
    } catch (err: any) {
      console.error('Failed to update target academy', err);
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: err.message || 'Could not update academy preference',
      });
    } finally {
      setSavingAcademy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!oldPassword || !newPassword) {
      setPasswordError('Please provide both current and new password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      addToast({
        type: 'success',
        title: 'Password Updated',
        description: 'Your account security credentials have been updated successfully.',
      });
    } catch (err: any) {
      const msg = err.message || 'Failed to update password. Verify your current password.';
      setPasswordError(msg);
      addToast({
        type: 'error',
        title: 'Password Update Failed',
        description: msg,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarCadet
              name={fullName || user?.fullName || 'Cadet'}
              academy={targetAcademy}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-black text-white">{fullName || user?.fullName || 'Cadet'}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={targetAcademy.toLowerCase() as any}>
                  Active Aspirant • {targetAcademy}
                </Badge>
                {user?.isEmailVerified && (
                  <span className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center min-w-[90px]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center justify-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-400" /> Streak
              </span>
              <p className="text-lg font-black text-amber-400 mt-0.5">
                {user?.currentStreak ?? 1} Days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Profile Info & Password Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Candidate Information Form */}
        <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Cadet Information</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Cadet Vikram Batra"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address (Permanent Identifier)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Email is locked to maintain audit logging and examination records.
              </p>
            </div>

            <Button
              type="submit"
              disabled={savingProfile}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </Button>
          </form>
        </Card>

        {/* Security / Password Management */}
        <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Security & Password</h2>
          </div>

          {passwordError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 flex items-center gap-2 text-xs font-medium text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, strong combination"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={savingPassword}
              variant="outline"
              className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-950/20 font-semibold py-2 rounded-xl flex items-center justify-center gap-2 mt-2"
            >
              <Lock className="h-4 w-4" />
              <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </Button>
          </form>
        </Card>
      </div>

      {/* Target Academy Selection */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-emerald-400" />
              CDS Target Academy Preference
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Selecting your target academy customizes your mock test package, syllabus weightage, and cutoff estimations.
            </p>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <Settings className="h-3.5 w-3.5" />
              <span>Platform Settings</span>
            </Button>
          </Link>
        </div>

        {academySuccessMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{academySuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {(Object.keys(ACADEMY_DESCRIPTIONS) as AcademyTarget[]).map((academy) => {
            const isSelected = targetAcademy === academy;
            const info = ACADEMY_DESCRIPTIONS[academy];

            return (
              <div
                key={academy}
                onClick={() => handleUpdateAcademy(academy)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 space-y-2 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500 shadow-md shadow-emerald-950/30'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-white">{academy}</span>
                  {isSelected && (
                    <span className="flex items-center gap-1 rounded bg-emerald-500 text-slate-950 px-2 py-0.5 text-[10px] font-bold">
                      <CheckCircle2 className="h-3 w-3" /> Selected
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-300">{info.name}</p>

                <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 space-y-1">
                  <div>
                    <strong className="text-slate-300">Papers:</strong> {info.papers}
                  </div>
                  <div>
                    <strong className="text-slate-300">Total Marks:</strong> {info.marks} Marks
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
