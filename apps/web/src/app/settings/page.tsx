'use client';

import React, { useEffect, useState } from 'react';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import {
  Button,
  Card,
  Badge,
  useToast,
} from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import {
  Settings as SettingsIcon,
  Shield,
  Clock,
  Keyboard,
  Bell,
  Eye,
  CheckCircle2,
  Sliders,
  Lock,
  Save,
} from 'lucide-react';

interface CandidatePreferences {
  exam: {
    timerUrgentAlert: boolean;
    highContrastMath: boolean;
    confirmBeforeFinish: boolean;
    autoAdvanceOnSelect: boolean;
  };
  notifications: {
    dailyStreakReminder: boolean;
    mockTestReleases: boolean;
    performanceDigest: boolean;
  };
  privacy: {
    anonymousLeaderboard: boolean;
    shareStudyStreak: boolean;
  };
}

const DEFAULT_PREFERENCES: CandidatePreferences = {
  exam: {
    timerUrgentAlert: true,
    highContrastMath: true,
    confirmBeforeFinish: true,
    autoAdvanceOnSelect: false,
  },
  notifications: {
    dailyStreakReminder: true,
    mockTestReleases: true,
    performanceDigest: false,
  },
  privacy: {
    anonymousLeaderboard: false,
    shareStudyStreak: true,
  },
};

export default function SettingsPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <SettingsContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [preferences, setPreferences] = useState<CandidatePreferences>(DEFAULT_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Load existing preferences if present on user object
    if (user && (user as any).preferences) {
      const userPrefs = (user as any).preferences;
      setPreferences({
        exam: { ...DEFAULT_PREFERENCES.exam, ...(userPrefs.exam || {}) },
        notifications: { ...DEFAULT_PREFERENCES.notifications, ...(userPrefs.notifications || {}) },
        privacy: { ...DEFAULT_PREFERENCES.privacy, ...(userPrefs.privacy || {}) },
      });
    }
  }, [user]);

  const updatePreference = <
    Category extends keyof CandidatePreferences,
    Key extends keyof CandidatePreferences[Category]
  >(
    category: Category,
    key: Key
  ) => {
    setPreferences((prev) => {
      const currentVal = prev[category][key];
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: !currentVal,
        },
      };
      setDirty(true);
      return updated;
    });
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/users/preferences', { preferences });
      if (refreshProfile) {
        await refreshProfile();
      }
      setDirty(false);
      addToast({
        type: 'success',
        title: 'Preferences Synchronized',
        description: 'Your candidate settings have been stored securely.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        description: err.message || 'Could not persist candidate preferences.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 md:p-8 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <SettingsIcon className="h-3.5 w-3.5" />
              <span>Platform Configurations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">Candidate Environment Settings</h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
              Customize exam simulation behavior, anti-distraction alerts, notification preferences, and privacy settings.
            </p>
          </div>

          <Button
            onClick={handleSavePreferences}
            disabled={saving || !dirty}
            className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition ${
              dirty
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : dirty ? 'Save Changes' : 'All Saved'}</span>
          </Button>
        </div>
      </div>

      {/* Exam Arena Preferences */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Exam Simulation Engine Preferences</h2>
        </div>
        <p className="text-xs text-slate-400">
          Controls the interactive flow during active UPSC mock tests and sectional drills.
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">5-Minute Timer Warning Flash</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pulsing amber warning badge when exam time drops below 5 minutes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('exam', 'timerUrgentAlert')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.exam.timerUrgentAlert ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle timer alert"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.exam.timerUrgentAlert ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">High-Contrast KaTeX Mathematical Typesetting</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enhance equation contrast for complex geometry, trigonometry, and calculus formulas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('exam', 'highContrastMath')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.exam.highContrastMath ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle math contrast"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.exam.highContrastMath ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">Confirmation Dialog on Exam Finish</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displays question status summary before final server-side evaluation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('exam', 'confirmBeforeFinish')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.exam.confirmBeforeFinish ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle confirmation dialog"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.exam.confirmBeforeFinish ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">Auto-Advance on Answer Selection</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Automatically navigate to the next question upon selecting an option (practice mode only).
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('exam', 'autoAdvanceOnSelect')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.exam.autoAdvanceOnSelect ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle auto advance"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.exam.autoAdvanceOnSelect ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">Notifications & Reminders</h2>
        </div>
        <p className="text-xs text-slate-400">
          Control operational reminders and mock test release alerts.
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">Daily Streak Protection Alert</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evening reminder notification if no practice session or mock test has been logged today.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('notifications', 'dailyStreakReminder')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.notifications.dailyStreakReminder ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle daily streak reminder"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.notifications.dailyStreakReminder ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">New Mock Test Releases & PYQ Papers</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Notifications when fresh full-length mock tests or past papers are verified and published.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('notifications', 'mockTestReleases')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.notifications.mockTestReleases ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle mock test alerts"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.notifications.mockTestReleases ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">Weekly Performance Digest</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Weekly intelligence report summarizing topic accuracies, study minutes, and weak areas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('notifications', 'performanceDigest')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.notifications.performanceDigest ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle weekly digest"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.notifications.performanceDigest ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Privacy & Visibility */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Privacy & Visibility</h2>
        </div>
        <p className="text-xs text-slate-400">
          Manage how your cadet rank and study milestones are displayed across leaderboards.
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">Anonymous on All-India Rank Lists</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Display candidate ID as masked Cadet #XXXX rather than your full name on competitive leaderboards.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('privacy', 'anonymousLeaderboard')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.privacy.anonymousLeaderboard ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle anonymous leaderboard"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.privacy.anonymousLeaderboard ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div>
              <p className="text-xs font-semibold text-white">Public Study Streak</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Allow peers to view your consecutive study day streak on community forum activities.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreference('privacy', 'shareStudyStreak')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.privacy.shareStudyStreak ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle public streak"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.privacy.shareStudyStreak ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Keyboard Shortcuts Cheat Sheet */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Official Examination Keyboard Shortcuts</h2>
        </div>
        <p className="text-xs text-slate-400">
          UPSC testing centers support swift keyboard controls. Use these shortcuts to maximize speed during mock attempts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-300">Select Option A / B / C / D</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">1</kbd>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">2</kbd>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">3</kbd>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">4</kbd>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-300">Save Response & Next</span>
            <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">
              Enter
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-300">Mark for Review & Next</span>
            <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">
              M
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-300">Clear Current Selection</span>
            <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">
              C
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-300">Previous Question</span>
            <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">
              ← Left Arrow
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-300">Next Question</span>
            <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold">
              → Right Arrow
            </kbd>
          </div>
        </div>
      </Card>
    </div>
  );
}
