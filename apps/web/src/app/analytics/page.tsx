'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import {
  Card,
  Badge,
  Button,
  AnalyticsCard,
  Progress,
} from '@cdsprep/ui';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  Compass,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ScoreAccuracyChart = dynamic(
  () =>
    import('../../components/analytics/score-accuracy-chart').then(
      (m) => m.ScoreAccuracyChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full flex items-center justify-center bg-slate-950/40 rounded-lg animate-pulse text-slate-500 text-xs">
        Loading score curve...
      </div>
    ),
  },
);

const TimeDistributionChart = dynamic(
  () =>
    import('../../components/analytics/time-distribution-chart').then(
      (m) => m.TimeDistributionChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-60 w-full flex items-center justify-center bg-slate-950/40 rounded-lg animate-pulse text-slate-500 text-xs">
        Loading velocity distribution...
      </div>
    ),
  },
);

interface DashboardMetrics {
  testsCompleted: number;
  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  totalQuestions: number;
  averageAccuracy: number;
  averageScore: number;
  readinessScore: number;
  activeMistakesCount: number;
  bookmarksCount: number;
}

interface SubjectMetric {
  subjectName: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  attemptedCount: number;
  skippedCount: number;
  netScore: number;
  accuracy: number;
}

interface TopicMetric {
  topicName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  weaknessIndicator: 'CRITICAL_WEAKNESS' | 'MODERATE' | 'STRONG';
}

interface TrendMetric {
  attemptNumber: number;
  resultId: string;
  date: string;
  testTitle: string;
  testType: string;
  netScore: number;
  totalMarks: number;
  accuracyPercent: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalQuestions: number;
  cumulativeQuestionsSolved: number;
}

interface TimeMetric {
  hasData: boolean;
  averageTimePerQuestionSeconds: number;
  totalTimeSpentSeconds: number;
  totalTimedQuestions: number;
  slowTopics: Array<{ topicName: string; averageTimeSeconds: number; questionCount: number }>;
  fastTopics: Array<{ topicName: string; averageTimeSeconds: number; questionCount: number }>;
  timeDistribution: {
    under30s: number;
    from30to60s: number;
    from60to120s: number;
    over120s: number;
  };
}

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <AnalyticsContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function AnalyticsContent() {
  const { user } = useAuth();
  const targetAcademy = user?.targetAcademy || 'IMA';

  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [subjects, setSubjects] = useState<SubjectMetric[]>([]);
  const [topics, setTopics] = useState<TopicMetric[]>([]);
  const [trends, setTrends] = useState<TrendMetric[]>([]);
  const [timeStats, setTimeStats] = useState<TimeMetric | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [dashRes, subRes, topRes, trendRes, timeRes] = await Promise.all([
          apiClient.get<{ hasData: boolean; metrics: DashboardMetrics }>('/analytics/dashboard'),
          apiClient.get<{ hasData: boolean; subjects: SubjectMetric[] }>('/analytics/subjects'),
          apiClient.get<{ hasData: boolean; topics: TopicMetric[] }>('/analytics/topics'),
          apiClient.get<{ hasData: boolean; trends: TrendMetric[] }>('/analytics/trends'),
          apiClient.get<TimeMetric>('/analytics/time'),
        ]);

        if (dashRes && dashRes.hasData) {
          setHasData(true);
          setMetrics(dashRes.metrics);
          setSubjects(subRes?.subjects || []);
          setTopics(topRes?.topics || []);
          setTrends(trendRes?.trends || []);
          setTimeStats(timeRes || null);
        } else {
          setHasData(false);
        }
      } catch (err) {
        console.error('Failed to load analytics', err);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // EMPTY STATE (Zero fabrication rule)
  if (!hasData || !metrics) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 p-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Cadet Performance Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Performance Analytics & UPSC Diagnostic Engine
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Real data-driven diagnostics for CDS (IMA, INA, AFA, OTA). CDSPrep strictly computes metrics from authentic test attempts with zero fabrication.
          </p>
        </div>

        <Card className="p-8 sm:p-12 border-slate-800 bg-slate-900/40 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="h-8 w-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white">No Exam History Recorded Yet</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Complete your first Full Mock Test or Subject Sectional to initialize your readiness score, UPSC cutoff projection, and topic weakness radar.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-2">
            <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Subject Breakdown
              </span>
              <p className="text-[11px] text-slate-400">
                Independent accuracy, gross marks, and penalty deductions for English, GK & Maths.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Weakness Radar
              </span>
              <p className="text-[11px] text-slate-400">
                Automated detection of High-Risk topics under 50% accuracy threshold.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Time Velocity
              </span>
              <p className="text-[11px] text-slate-400">
                Pacing distribution histogram to eliminate time-sink questions.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/tests">
              <Button className="h-10 px-6 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs flex items-center gap-2">
                <span>Take First Mock Test</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/practice">
              <Button
                variant="outline"
                className="h-10 px-6 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold"
              >
                Start Practice Engine
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // REAL DATA PRESENTATION
  const timeDistData = timeStats
    ? [
        { bin: '< 30s', count: timeStats.timeDistribution.under30s },
        { bin: '30–60s', count: timeStats.timeDistribution.from30to60s },
        { bin: '60–120s', count: timeStats.timeDistribution.from60to120s },
        { bin: '> 120s', count: timeStats.timeDistribution.over120s },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 md:p-8 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Cadet Performance Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Diagnostic Insights & UPSC Cutoff Projection
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
              Authoritative metrics synthesized from {metrics.testsCompleted} completed examinations for {targetAcademy} aspirants.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link href="/mistakes">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold"
              >
                Review Mistakes ({metrics.activeMistakesCount})
              </Button>
            </Link>
            <Link href="/tests">
              <Button
                size="sm"
                className="h-9 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs flex items-center gap-1.5"
              >
                <span>Take Mock Test</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Overall Accuracy"
          value={`${metrics.averageAccuracy}%`}
          subtitle={`${metrics.totalCorrect} correct of ${metrics.totalQuestionsAttempted} attempted`}
          icon={<Award className="h-4 w-4 text-emerald-400" />}
          variant={metrics.averageAccuracy >= 70 ? 'success' : 'default'}
        />

        <AnalyticsCard
          title="Average Net Score"
          value={`${metrics.averageScore}`}
          subtitle={`Across ${metrics.testsCompleted} tests completed`}
          icon={<TrendingUp className="h-4 w-4 text-teal-400" />}
          variant="success"
        />

        <AnalyticsCard
          title="Questions Solved"
          value={`${metrics.totalQuestionsAttempted}`}
          subtitle={`${metrics.totalSkipped} skipped across papers`}
          icon={<BookOpen className="h-4 w-4 text-sky-400" />}
          variant="info"
        />

        <AnalyticsCard
          title="Cadet Readiness Score"
          value={`${metrics.readinessScore} / 100`}
          subtitle="Streak, volume & accuracy factor"
          icon={<Target className="h-4 w-4 text-amber-400" />}
          variant="default"
        />
      </div>

      {/* Historical Performance Trends Curve */}
      {trends.length > 0 && (
        <Card className="p-5 sm:p-6 border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Historical Progression
              </span>
              <h3 className="text-base font-bold text-white">Score & Accuracy Curve</h3>
              <p className="text-xs text-slate-400">
                Chronological score and accuracy trajectory across completed exam attempts.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total Questions Solved: <strong className="text-emerald-400">{trends[trends.length - 1]?.cumulativeQuestionsSolved}</strong>
            </span>
          </div>

          <ScoreAccuracyChart data={trends} />
        </Card>
      )}

      {/* Subject-Wise Analytics Breakdown */}
      {subjects.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Subject Performance Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              UPSC requires clearing sectional minimums (typically 20% in each subject) as well as the composite cutoff.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjects.map((s) => {
              const isCleared = s.accuracy >= 50;
              return (
                <Card key={s.subjectName} className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-slate-100 text-sm">{s.subjectName}</span>
                    <Badge
                      variant={isCleared ? 'success' : 'warning'}
                      className="text-[10px] font-bold"
                    >
                      {s.accuracy}% Acc
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-1">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-semibold">Attempted</span>
                      <span className="text-sm font-bold text-white">{s.attemptedCount}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-emerald-400 block font-semibold">Correct</span>
                      <span className="text-sm font-bold text-emerald-400">{s.correctCount}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-rose-400 block font-semibold">Incorrect</span>
                      <span className="text-sm font-bold text-rose-400">{s.incorrectCount}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Net Marks Accumulated</span>
                      <strong className="text-emerald-400">{s.netScore}</strong>
                    </div>
                    <Progress value={Math.min(100, s.accuracy)} indicatorClassName={s.accuracy >= 70 ? 'bg-emerald-500' : 'bg-amber-500'} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Topic Weakness Radar */}
      {topics.length > 0 && (
        <Card className="p-5 sm:p-6 border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Diagnostic Matrix
              </span>
              <h3 className="text-base font-bold text-white">Topic Weakness & Accuracy Breakdown</h3>
              <p className="text-xs text-slate-400">
                Focus your revision on High-Risk topics (&lt; 50% accuracy) where negative marks hurt most.
              </p>
            </div>
            <Link href="/practice">
              <Button size="sm" variant="outline" className="text-xs border-slate-700 hover:bg-slate-800">
                Practice Weak Topics
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Topic</th>
                  <th className="py-2.5 px-3 text-center">Questions</th>
                  <th className="py-2.5 px-3 text-center">Correct</th>
                  <th className="py-2.5 px-3 text-center">Incorrect</th>
                  <th className="py-2.5 px-3 text-center">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topics.slice(0, 10).map((top) => (
                  <tr key={top.topicName} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{top.topicName}</td>
                    <td className="py-2.5 px-3 text-center">{top.attemptedCount}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">{top.correctCount}</td>
                    <td className="py-2.5 px-3 text-center text-rose-400">{top.incorrectCount}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{top.accuracy}%</td>
                    <td className="py-2.5 px-3 text-right">
                      {top.weaknessIndicator === 'CRITICAL_WEAKNESS' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                          Critical Weakness
                        </span>
                      ) : top.weaknessIndicator === 'MODERATE' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          Moderate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          Strong
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Speed Diagnostics & Time Distribution */}
      {timeStats && timeStats.hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 sm:p-6 border-slate-800 bg-slate-900/60 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Velocity Analysis
              </span>
              <h3 className="text-base font-bold text-white">Average Pace & Time Distribution</h3>
              <p className="text-xs text-slate-400">
                Average time per question: <strong className="text-sky-400">{timeStats.averageTimePerQuestionSeconds}s</strong> (recommended ceiling: 60s).
              </p>
            </div>

          <TimeDistributionChart data={timeDistData} />
          </Card>

          <Card className="p-5 sm:p-6 border-slate-800 bg-slate-900/60 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Pacing Extremes
              </span>
              <h3 className="text-base font-bold text-white">Slow Topics vs Fast Topics</h3>
              <p className="text-xs text-slate-400">
                Identifies topics consuming excess examination minutes.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                  Slow Topics (Potential Time Traps)
                </h4>
                <div className="space-y-2">
                  {timeStats.slowTopics.slice(0, 3).map((item) => (
                    <div
                      key={item.topicName}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                    >
                      <span className="font-semibold text-slate-200">{item.topicName}</span>
                      <span className="font-bold text-rose-400">{item.averageTimeSeconds}s avg</span>
                    </div>
                  ))}
                  {timeStats.slowTopics.length === 0 && (
                    <p className="text-xs text-slate-500">No pacing anomalies detected.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Fast Topics (Rapid Solves)
                </h4>
                <div className="space-y-2">
                  {timeStats.fastTopics.slice(0, 3).map((item) => (
                    <div
                      key={item.topicName}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                    >
                      <span className="font-semibold text-slate-200">{item.topicName}</span>
                      <span className="font-bold text-emerald-400">{item.averageTimeSeconds}s avg</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Academy Cutoff Matrix */}
      <Card className="p-5 sm:p-6 border-slate-800 bg-slate-900/60 space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" />
          UPSC Combined Defence Services Cutoff Matrix
        </h3>
        <p className="text-xs text-slate-400">
          Historical benchmark minimums required to clear the written examination.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">IMA (Dehradun)</span>
            <span className="font-bold text-emerald-400 text-sm">135–140 / 300</span>
            <span className="text-[10px] text-slate-500 block">English + GK + Maths</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">INA (Ezhimala)</span>
            <span className="font-bold text-sky-400 text-sm">125–130 / 300</span>
            <span className="text-[10px] text-slate-500 block">English + GK + Maths</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">AFA (Dundigal)</span>
            <span className="font-bold text-amber-400 text-sm">145–150 / 300</span>
            <span className="text-[10px] text-slate-500 block">English + GK + Maths</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">OTA (Chennai)</span>
            <span className="font-bold text-purple-400 text-sm">95–100 / 200</span>
            <span className="text-[10px] text-slate-500 block">English + GK (No Maths)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
