'use client';

import React, { useState, useEffect } from 'react';
import { CadetNav } from '../../components/cadet-nav';
import { AuthGuard } from '../../components/auth-guard';
import { LeaderboardPeriod } from '@cdsprep/types';
import { api } from '../../lib/api';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Flame,
  Shield,
  EyeOff,
  Eye,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  rank: number;
  cadetName: string;
  targetAcademy: string;
  testsCompleted: number;
  totalScore: number;
  averageAccuracy: number;
  streak: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  period: LeaderboardPeriod;
  targetAcademy: string | null;
  standings: LeaderboardEntry[];
  candidateRank: {
    rank: number;
    totalScore: number;
    testsCompleted: number;
    averageAccuracy: number;
    isAnonymous: boolean;
  } | null;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>(LeaderboardPeriod.WEEKLY);
  const [academy, setAcademy] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [privacyToggling, setPrivacyToggling] = useState<boolean>(false);

  const fetchLeaderboard = async (p: LeaderboardPeriod, acad: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', p);
      if (acad) params.set('academy', acad);

      const res = await api.get<LeaderboardData>(`/leaderboard?${params.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(period, academy);
  }, [period, academy]);

  const toggleAnonymous = async () => {
    if (!data?.candidateRank) return;
    setPrivacyToggling(true);
    try {
      const nextVal = !data.candidateRank.isAnonymous;
      await api.patch('/leaderboard/privacy', { anonymousOnLeaderboard: nextVal });
      setData((prev) =>
        prev
          ? {
              ...prev,
              candidateRank: prev.candidateRank
                ? { ...prev.candidateRank, isAnonymous: nextVal }
                : null,
            }
          : null,
      );
      fetchLeaderboard(period, academy);
    } catch (err) {
      console.error('Failed to toggle anonymous:', err);
    } finally {
      setPrivacyToggling(false);
    }
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
          <Crown className="h-4 w-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40">
          <Medal className="h-4 w-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40">
          <Award className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400 font-bold text-xs border border-slate-800">
        #{rank}
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <CadetNav />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 mb-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-400 mb-3">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>National Cadet Standings</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Officer Merit Leaderboard
                </h1>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Real verified CDS mock and drill performance. Compete with aspirants across India targeting IMA, INA, AFA, and OTA.
                </p>
              </div>

              {/* Privacy Control Card */}
              {data?.candidateRank && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 shrink-0 max-w-xs shadow-inner">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Your Standing
                    </span>
                    <span className="rounded-md bg-emerald-950 border border-emerald-800/40 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      Rank #{data.candidateRank.rank}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>Score: <strong className="text-white">{data.candidateRank.totalScore}</strong></span>
                    <span>Acc: <strong className="text-white">{data.candidateRank.averageAccuracy}%</strong></span>
                  </div>
                  <button
                    onClick={toggleAnonymous}
                    disabled={privacyToggling}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
                  >
                    {data.candidateRank.isAnonymous ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                        <span>Masked (Cadet #ID)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Visible (Full Name)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Period & Academy Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              {[
                { label: 'Weekly Merit', value: LeaderboardPeriod.WEEKLY },
                { label: 'Monthly Merit', value: LeaderboardPeriod.MONTHLY },
                { label: 'All-Time Honor', value: LeaderboardPeriod.ALL_TIME },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setPeriod(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    period === tab.value
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Academy Target:</span>
              <select
                value={academy}
                onChange={(e) => setAcademy(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Academies</option>
                <option value="IMA">IMA (Dehradun)</option>
                <option value="INA">INA (Ezhimala)</option>
                <option value="AFA">AFA (Dundigal)</option>
                <option value="OTA">OTA (Chennai)</option>
              </select>
            </div>
          </div>

          {/* Leaderboard Table / Cards */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-4"></div>
              <p className="text-xs text-slate-400">Loading national merit standings...</p>
            </div>
          ) : !data || data.standings.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-slate-700 mb-3" />
              <h3 className="text-base font-semibold text-white">No attempts recorded for this period</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Complete practice question drills and authentic CDS mock tests to earn score and claim your place on the merit list!
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Cadet</th>
                      <th className="py-3 px-4">Target Academy</th>
                      <th className="py-3 px-4 text-center">Tests Solved</th>
                      <th className="py-3 px-4 text-center">Accuracy</th>
                      <th className="py-3 px-4 text-center">Streak</th>
                      <th className="py-3 px-4 text-right">Score / XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.standings.map((item) => {
                      return (
                        <tr
                          key={item.userId}
                          className={`transition ${
                            item.isCurrentUser
                              ? 'bg-emerald-950/20 font-medium'
                              : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getRankMedal(item.rank)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold ${
                                  item.isCurrentUser ? 'text-emerald-400 font-bold' : 'text-white'
                                }`}
                              >
                                {item.cadetName}
                              </span>
                              {item.isCurrentUser && (
                                <span className="rounded bg-emerald-950 border border-emerald-800/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                              {item.targetAcademy || 'IMA'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-300">
                            {item.testsCompleted}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                item.averageAccuracy >= 75
                                  ? 'text-emerald-400'
                                  : item.averageAccuracy >= 50
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.averageAccuracy}%
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 text-amber-400">
                              <Flame className="h-3 w-3" />
                              <span className="font-bold">{item.streak}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="text-sm font-black text-white">
                              {item.totalScore.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
