'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import { useAuth } from '../../context/auth-context';
import {
  Button,
  Card,
  Badge,
  AnalyticsCard,
  Progress,
} from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  BookOpen,
  History,
  Target,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Clock,
  Award,
  AlertTriangle,
  FileCheck2,
  Flame,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  ListTodo,
  Layers,
  Zap,
  Loader2,
  Send,
  Calendar,
  Bot,
} from 'lucide-react';
import { AcademyTarget } from '@cdsprep/types';

interface DashboardResponse {
  hasData: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    targetAcademy: AcademyTarget;
    currentStreak: number;
    highestStreak: number;
    lastActiveDate: string | null;
  };
  streak: {
    currentStreak: number;
    highestStreak: number;
    isActiveToday: boolean;
  };
  metrics: {
    testsCompleted: number;
    totalQuestionsAttempted: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalSkipped: number;
    totalQuestions: number;
    averageAccuracy: number;
    averageScore: number;
    readinessScore: number;
    totalStudyTimeMinutes: number;
    activeMistakesCount: number;
    bookmarksCount: number;
  };
  weakTopics: Array<{
    topicName: string;
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
    weaknessIndicator: 'CRITICAL_WEAKNESS' | 'MODERATE' | 'STRONG';
  }>;
  recentTests: Array<{
    id: string;
    resultId: string;
    testTitle: string;
    testType: string;
    score: number;
    totalMarks: number;
    accuracy: number;
    date: string;
  }>;
  continuePractice: {
    sessionId: string;
    mode: string;
    subjectName?: string;
    topicName?: string;
    questionCount: number;
    startedAt: string;
  } | null;
  dailyGoals: {
    questions: { current: number; target: number; completed: boolean };
    tests: { current: number; target: number; completed: boolean };
    studyTime: { currentMinutes: number; targetMinutes: number; completed: boolean };
  };
  studyPlan: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    actionLabel: string;
    actionUrl: string;
    priority: number;
    isCompleted: boolean;
  }>;
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <DashboardContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [gamification, setGamification] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashRes, gamRes] = await Promise.all([
          apiClient.get<DashboardResponse>('/analytics/dashboard'),
          apiClient.get<any>('/gamification/profile').catch(() => null),
        ]);
        setData(dashRes);
        if (gamRes) setGamification(gamRes);
      } catch (err) {
        console.error('Failed to load student dashboard', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any | null>(null);
  const [aiCustomQuery, setAiCustomQuery] = useState('');
  const [activeQueryType, setActiveQueryType] = useState<string | null>(null);

  const handleAskAiAdvisor = async (queryType: string, customMessage?: string) => {
    setAiLoading(true);
    setActiveQueryType(queryType);
    try {
      const res: any = await apiClient.post('/ai/assistant', {
        queryType,
        message: customMessage?.trim() || undefined,
      });
      setAiAdvice(res.data);
    } catch (err: any) {
      console.error('Failed to get AI study advice', err);
    } finally {
      setAiLoading(false);
    }
  };

  const targetAcademy = user?.targetAcademy || AcademyTarget.IMA;
  const cutoffThreshold = targetAcademy === AcademyTarget.OTA ? 95 : 135;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const streak = data?.streak || {
    currentStreak: user?.currentStreak || 0,
    highestStreak: user?.highestStreak || 0,
    isActiveToday: false,
  };

  const metrics = data?.metrics || {
    testsCompleted: 0,
    totalQuestionsAttempted: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalSkipped: 0,
    totalQuestions: 0,
    averageAccuracy: 0,
    averageScore: 0,
    readinessScore: 0,
    totalStudyTimeMinutes: 0,
    activeMistakesCount: 0,
    bookmarksCount: 0,
  };

  const dailyGoals = data?.dailyGoals || {
    questions: { current: 0, target: 30, completed: false },
    tests: { current: 0, target: 1, completed: false },
    studyTime: { currentMinutes: 0, targetMinutes: 45, completed: false },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Officer Candidate Profile Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Target Commission:
              </span>
              <Badge variant={targetAcademy.toLowerCase() as any}>
                {targetAcademy}
              </Badge>
              {streak.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  <Flame className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {streak.currentStreak} Day Streak {streak.isActiveToday ? '• Active Today' : ''}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Cadet {user?.fullName || 'Officer Candidate'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {user?.email} • Enlisted Track:{' '}
              <span className="text-slate-200 font-semibold">{targetAcademy} Regular Course</span>
            </p>

            {/* Rank & XP Progression Strip */}
            {gamification && (
              <div className="pt-2 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="rounded bg-indigo-950 border border-indigo-800/50 px-2 py-0.5 text-[10px] text-indigo-300">
                      Rank: {gamification.currentRank}
                    </span>
                    <span className="text-slate-400 font-normal">
                      • {gamification.totalXp.toLocaleString()} Total XP
                    </span>
                  </div>
                  {gamification.nextRank && (
                    <span className="text-[11px] text-slate-400">
                      {gamification.xpToNextRank} XP to {gamification.nextRank}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${gamification.rankProgressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/leaderboard">
                <Button variant="outline" size="sm" className="font-semibold text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/20">
                  Merit Leaderboard
                </Button>
              </Link>
              <Link href="/practice">
                <Button variant="outline" size="sm" className="font-semibold text-xs border-slate-700 hover:bg-slate-800">
                  Practice Drills
                </Button>
              </Link>
              <Link href="/tests">
                <Button size="sm" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs shadow-lg shadow-emerald-950/40">
                  Launch Live Mock Exam
                </Button>
              </Link>
            </div>

            {/* Badges showcase */}
            {gamification?.earnedBadges && gamification.earnedBadges.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Decorations:</span>
                {gamification.earnedBadges.slice(0, 4).map((b: any) => (
                  <span
                    key={b.id}
                    title={`${b.title}: ${b.description}`}
                    className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-amber-300 shadow-sm"
                  >
                    🏅 {b.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Academy Readiness Score"
          value={`${metrics.readinessScore}%`}
          subtitle={`Compared against ${targetAcademy} cutoff (${cutoffThreshold} marks)`}
          icon={<Award className="h-4 w-4 text-emerald-400" />}
          variant={metrics.readinessScore >= 70 ? 'success' : 'default'}
        />

        <AnalyticsCard
          title="Overall Accuracy"
          value={`${metrics.averageAccuracy}%`}
          subtitle={`${metrics.totalCorrect} correct of ${metrics.totalQuestionsAttempted} solved`}
          icon={<Target className="h-4 w-4 text-sky-400" />}
          variant={metrics.averageAccuracy >= 70 ? 'success' : 'default'}
        />

        <AnalyticsCard
          title="Daily Preparation Streak"
          value={`${streak.currentStreak} Days`}
          subtitle={streak.isActiveToday ? 'Activity recorded today' : 'Complete today to maintain'}
          icon={<Flame className="h-4 w-4 text-amber-400" />}
          variant={streak.isActiveToday ? 'warning' : 'default'}
        />

        <AnalyticsCard
          title="Total Study Time"
          value={`${metrics.totalStudyTimeMinutes} mins`}
          subtitle={`${metrics.testsCompleted} tests completed`}
          icon={<Clock className="h-4 w-4 text-teal-400" />}
          variant="info"
        />
      </div>

      {/* Daily Goals Strip */}
      <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Today&apos;s Cadet Preparation Goals
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Resets midnight UTC • Authoritative tracking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Questions Solved</span>
              <span className="font-bold text-emerald-400">
                {dailyGoals.questions.current} / {dailyGoals.questions.target}
              </span>
            </div>
            <Progress
              value={Math.min(100, (dailyGoals.questions.current / dailyGoals.questions.target) * 100)}
              indicatorClassName={dailyGoals.questions.completed ? 'bg-emerald-500' : 'bg-sky-500'}
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Mock Examination</span>
              <span className="font-bold text-amber-400">
                {dailyGoals.tests.current} / {dailyGoals.tests.target}
              </span>
            </div>
            <Progress
              value={Math.min(100, (dailyGoals.tests.current / dailyGoals.tests.target) * 100)}
              indicatorClassName={dailyGoals.tests.completed ? 'bg-emerald-500' : 'bg-amber-500'}
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Study Pacing</span>
              <span className="font-bold text-teal-400">
                {dailyGoals.studyTime.currentMinutes}m / {dailyGoals.studyTime.targetMinutes}m
              </span>
            </div>
            <Progress
              value={Math.min(100, (dailyGoals.studyTime.currentMinutes / dailyGoals.studyTime.targetMinutes) * 100)}
              indicatorClassName={dailyGoals.studyTime.completed ? 'bg-emerald-500' : 'bg-teal-500'}
            />
          </div>
        </div>
      </Card>

      {/* AI Cadet Study Advisor */}
      <Card className="p-5 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                AI Cadet Study Advisor
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  Pedagogical AI
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Actionable study guidance synthesized from your verified accuracy and daily goals
              </p>
            </div>
          </div>

          <span className="text-[11px] text-slate-500">
            Tenant Isolated • Non-Authoritative
          </span>
        </div>

        {/* Quick Query Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'study_today', label: 'What should I study today?' },
            { id: 'weakest_topic', label: 'What is my weakest topic?' },
            { id: 'revision_plan', label: 'Give me a revision plan' },
            { id: 'performance_trend', label: 'Why is my performance decreasing?' },
            { id: 'similar_practice', label: 'Give me similar practice' },
          ].map((chip) => {
            const isActive = activeQueryType === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => handleAskAiAdvisor(chip.id)}
                disabled={aiLoading}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Advisor Response Area */}
        {aiLoading ? (
          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-950/60 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
            <span>Analyzing your CDS performance trajectory & weak topics...</span>
          </div>
        ) : aiAdvice ? (
          <div className="p-4 sm:p-5 rounded-xl border border-emerald-500/30 bg-slate-950/80 space-y-4">
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {aiAdvice.summary}
            </div>

            {/* Recommended Actions */}
            {aiAdvice.recommendedActions?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Priority Action Checklist
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiAdvice.recommendedActions.map((action: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revision Schedule if available */}
            {aiAdvice.revisionSchedule?.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Multi-Day Timetable
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {aiAdvice.revisionSchedule.map((day: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-xs">
                      <span className="font-bold text-amber-300">{day.day}</span>
                      <p className="text-slate-300 mt-0.5">{day.focus}</p>
                      <span className="text-[10px] text-slate-500 font-semibold">{day.durationMinutes} mins</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Custom Follow-Up Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (aiCustomQuery.trim()) {
              handleAskAiAdvisor('general_advice', aiCustomQuery);
              setAiCustomQuery('');
            }
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            value={aiCustomQuery}
            onChange={(e) => setAiCustomQuery(e.target.value)}
            placeholder="Ask AI Study Advisor a custom prep question (e.g. 'How to balance GK and Maths?')..."
            disabled={aiLoading}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            disabled={aiLoading || !aiCustomQuery.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-3.5"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </Card>

      {/* Deterministic Study Plan & Active Continue Practice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Plan Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-emerald-400" />
              Recommended Study Plan (Diagnostic Driven)
            </h3>
            <span className="text-xs text-slate-400">Prioritized for maximum UPSC merit</span>
          </div>

          <div className="space-y-3">
            {data?.studyPlan && data.studyPlan.length > 0 ? (
              data.studyPlan.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">{task.title}</span>
                      <Badge variant="outline" className="text-[10px]">Priority {task.priority}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{task.description}</p>
                  </div>

                  <Link href={task.actionUrl} className="self-start sm:self-auto flex-shrink-0">
                    <Button size="sm" className="h-8 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 flex items-center gap-1">
                      <span>{task.actionLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                All daily preparation tasks completed! Take a full mock test or explore 20-year PYQs.
              </div>
            )}
          </div>
        </div>

        {/* Continue Practice & Quick Links */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-sky-400" />
            Resume Practice
          </h3>

          {data?.continuePractice ? (
            <Card className="p-4 border-slate-800 bg-slate-900/60 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                  In-Progress Session
                </span>
                <h4 className="text-sm font-bold text-white">
                  {data.continuePractice.subjectName || 'All Subjects'} • {data.continuePractice.topicName || 'General Practice'}
                </h4>
                <p className="text-xs text-slate-400">
                  {data.continuePractice.questionCount} Questions configured
                </p>
              </div>

              <Link href={`/practice`}>
                <Button size="sm" className="w-full font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 text-xs">
                  Continue Session
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-4 border-slate-800 bg-slate-900/60 space-y-3 text-center">
              <p className="text-xs text-slate-400">
                No unfinished practice session. Launch a new drill by topic, chapter, or difficulty.
              </p>
              <Link href="/practice">
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold border-slate-700">
                  Start New Practice Drill
                </Button>
              </Link>
            </Card>
          )}

          {/* Quick Hub Links */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link href="/mistakes" className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 block transition">
              <span className="text-rose-400 font-bold block">Mistake Notebook</span>
              <span className="text-[11px] text-slate-400">{metrics.activeMistakesCount} active errors</span>
            </Link>
            <Link href="/bookmarks" className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 block transition">
              <span className="text-amber-400 font-bold block">Bookmarks</span>
              <span className="text-[11px] text-slate-400">{metrics.bookmarksCount} saved</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Weak Topics Section */}
      {data?.weakTopics && data.weakTopics.length > 0 && (
        <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Critical Weak Topics (&lt; 70% Accuracy)
              </h3>
              <p className="text-xs text-slate-400">
                These topics currently generate negative mark drag. Drill them before your next test.
              </p>
            </div>
            <Link href="/practice">
              <Button variant="outline" size="sm" className="text-xs border-slate-700">
                Practice All Weak Topics
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {data.weakTopics.map((top) => (
              <div key={top.topicName} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white truncate max-w-[150px]">{top.topicName}</span>
                  <Badge variant="destructive" className="text-[10px] font-bold">
                    {top.accuracy}% Acc
                  </Badge>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{top.correctCount} correct</span>
                  <span className="text-rose-400 font-bold">{top.incorrectCount} incorrect</span>
                </div>
                <Link href={`/practice?topic=${encodeURIComponent(top.topicName)}`}>
                  <Button variant="ghost" size="sm" className="w-full text-[11px] h-7 text-emerald-400 hover:bg-emerald-950/30">
                    Drill 10 Questions →
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Tests Performance Table */}
      {data?.recentTests && data.recentTests.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Recent Mock Examination Performance</h2>
            <Link href="/tests" className="text-xs font-semibold text-emerald-400 hover:underline">
              View All Tests →
            </Link>
          </div>

          <div className="space-y-3">
            {data.recentTests.map((attempt) => (
              <div
                key={attempt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40 gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{attempt.testTitle}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(attempt.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} • Accuracy: {attempt.accuracy}%
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Marks Obtained</span>
                    <span className="text-base font-black text-emerald-400">
                      {attempt.score.toFixed(2)} / {attempt.totalMarks}
                    </span>
                  </div>
                  <Link href={`/result/${attempt.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      View Merit Analysis
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
