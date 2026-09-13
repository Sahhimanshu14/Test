'use client';

import React, { useState, useEffect } from 'react';
import { CadetNav } from '../../components/cadet-nav';
import { AuthGuard } from '../../components/auth-guard';
import { api } from '../../lib/api';
import {
  Bell,
  CheckCheck,
  Filter,
  SlidersHorizontal,
  FileCheck2,
  Calendar,
  Sparkles,
  Flame,
  Bookmark,
  ExternalLink,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

interface PreferencesData {
  testResults: boolean;
  dailyReminders: boolean;
  studyRecommendations: boolean;
  weeklySummary: boolean;
  newContent: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<PreferencesData>({
    testResults: true,
    dailyReminders: true,
    studyRecommendations: true,
    weeklySummary: true,
    newContent: true,
  });

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        notifications: NotificationItem[];
        unreadCount: number;
        total: number;
      }>('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await api.get<{ preferences: PreferencesData }>('/notifications/preferences');
      if (res.preferences) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const updatePreference = async (key: keyof PreferencesData, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try {
      await api.patch('/notifications/preferences', { preferences: updated });
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'TEST_RESULT':
        return { icon: FileCheck2, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40' };
      case 'DAILY_REMINDER':
        return { icon: Flame, color: 'text-amber-400 bg-amber-950/60 border-amber-800/40' };
      case 'RECOMMENDATION':
        return { icon: Sparkles, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40' };
      case 'WEEKLY_SUMMARY':
        return { icon: Calendar, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40' };
      default:
        return { icon: Bell, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  const displayedNotifications =
    activeTab === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <CadetNav />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white">Cadet Briefings & Alerts</h1>
                  <p className="text-xs text-slate-400">
                    Stay updated on test evaluations, streak warnings, and study recommendations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Preferences</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-slate-800 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Preferences Drawer */}
          {showPreferences && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 mb-6 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white mb-3">Notification Alert Preferences</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'testResults', label: 'Test Results & Mock Evaluations' },
                  { key: 'dailyReminders', label: 'Daily Practice Streak Reminders' },
                  { key: 'studyRecommendations', label: 'AI Study & Weak Topic Recommendations' },
                  { key: 'weeklySummary', label: 'Weekly Performance & Ranking Rollup' },
                  { key: 'newContent', label: 'New PYQ Papers & Mock Test Releases' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950 transition cursor-pointer"
                  >
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={preferences[item.key as keyof PreferencesData]}
                      onChange={(e) =>
                        updatePreference(item.key as keyof PreferencesData, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-4">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'UNREAD'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-3"></div>
              <p className="text-xs text-slate-400">Loading cadet briefings...</p>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <Bell className="mx-auto h-10 w-10 text-slate-700 mb-3" />
              <h3 className="text-sm font-semibold text-white">All clear, Cadet!</h3>
              <p className="mt-1 text-xs text-slate-500">
                {activeTab === 'UNREAD'
                  ? 'You have read all your notifications.'
                  : 'No active briefing notifications at this moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedNotifications.map((n) => {
                const badge = getCategoryIcon(n.category);
                const Icon = badge.icon;

                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-4 rounded-xl border p-4 transition ${
                      n.isRead
                        ? 'border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/50'
                        : 'border-emerald-500/30 bg-slate-900/80 shadow-md shadow-emerald-950/20'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${badge.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            n.isRead ? 'text-slate-300' : 'text-white'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(n.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>

                      <div className="mt-2.5 flex items-center gap-3">
                        {n.actionUrl && (
                          <Link
                            href={n.actionUrl}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                          >
                            <span>Open Briefing</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}

                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-300"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>

                    {!n.isRead && (
                      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
