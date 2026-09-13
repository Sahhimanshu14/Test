'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  Users,
  FileCheck,
  BookOpen,
  CheckSquare,
  Activity,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  UploadCloud,
  Layers,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface PlatformMetrics {
  users: { total: number; verified: number };
  questions: { total: number; published: number; inReview: number; draft: number; aiGenerated: number };
  pyqPapers: { total: number; published: number };
  tests: { total: number; published: number };
  attempts: { total: number; submitted: number; completionRatePercent: number };
  reports: { total: number; pending: number; resolved: number };
  aiMetrics: { totalAiQuestions: number };
  system: { maintenanceMode: boolean; defaultNegativeMarking: number; timerGracePeriodSeconds: number };
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <DashboardContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function DashboardContent() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PlatformMetrics>('/admin/metrics');
      setMetrics(data);
    } catch {
      // Fallback display if offline
      setMetrics({
        users: { total: 0, verified: 0 },
        questions: { total: 0, published: 0, inReview: 0, draft: 0, aiGenerated: 0 },
        pyqPapers: { total: 0, published: 0 },
        tests: { total: 0, published: 0 },
        attempts: { total: 0, submitted: 0, completionRatePercent: 0 },
        reports: { total: 0, pending: 0, resolved: 0 },
        aiMetrics: { totalAiQuestions: 0 },
        system: { maintenanceMode: false, defaultNegativeMarking: 0.33, timerGracePeriodSeconds: 30 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 p-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Staff HQ Operational Command</span>
          </div>
          <h1 className="text-2xl font-black text-white">Platform Command Overview</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Real-time telemetry across registered candidates, official UPSC question banks, examination attempts, and automated AI moderation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </Button>
          <Link href="/admin/tests">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Test Builder</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Actual Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users */}
        <Card className="p-4 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Enrolled Cadets</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics?.users.total ?? '--'}</span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              {metrics?.users.verified ?? 0} verified
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <Link href="/admin/users" className="text-slate-400 hover:text-amber-400 flex items-center gap-1">
              <span>View Directory</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Questions */}
        <Card className="p-4 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Questions</span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics?.questions.total ?? '--'}</span>
            <span className="text-[11px] text-sky-400 font-semibold">
              {metrics?.questions.published ?? 0} published
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">{metrics?.questions.inReview ?? 0} in review</span>
            <Link href="/admin/questions" className="text-slate-400 hover:text-amber-400 flex items-center gap-1">
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* PYQ Papers */}
        <Card className="p-4 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">20-Year PYQ Papers</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics?.pyqPapers.total ?? '--'}</span>
            <span className="text-[11px] text-purple-400 font-semibold">
              {metrics?.pyqPapers.published ?? 0} released
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <Link href="/admin/pyq" className="text-slate-400 hover:text-amber-400 flex items-center gap-1">
              <span>View Papers</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Mock Tests */}
        <Card className="p-4 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Mock Tests</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics?.tests.total ?? '--'}</span>
            <span className="text-[11px] text-amber-400 font-semibold">
              {metrics?.tests.published ?? 0} published
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <Link href="/admin/tests" className="text-slate-400 hover:text-amber-400 flex items-center gap-1">
              <span>Test Builder</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Secondary Metrics: Attempts, Reports & AI Moderation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Examination Attempts */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Exam Attempts</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{metrics?.attempts.total ?? 0}</span>
            <span className="text-xs text-slate-400">
              ({metrics?.attempts.completionRatePercent ?? 0}% completed)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {metrics?.attempts.submitted ?? 0} submitted successfully to scoring engine.
          </p>
        </Card>

        {/* Question Reports */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Candidate Reports</span>
            <AlertTriangle className={`h-4 w-4 ${(metrics?.reports.pending ?? 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{metrics?.reports.total ?? 0}</span>
            <Badge variant={(metrics?.reports.pending ?? 0) > 0 ? 'warning' : 'outline'} className="text-[10px] py-0">
              {metrics?.reports.pending ?? 0} pending
            </Badge>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">{metrics?.reports.resolved ?? 0} resolved</span>
            <Link href="/admin/reports" className="text-amber-400 hover:underline">
              Review Reports &rarr;
            </Link>
          </div>
        </Card>

        {/* AI-Generated Questions */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">AI Generated Drafts</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{metrics?.aiMetrics.totalAiQuestions ?? 0}</span>
            <span className="text-xs text-purple-400 font-semibold">Strict Draft Mode</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Requires manual approval</span>
            <Link href="/admin/ai" className="text-purple-400 hover:underline">
              AI Moderation &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Quick Access Control Hub */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Administrative Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/admin/questions/create">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-amber-500/40 hover:bg-slate-900/80 transition flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <PlusCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Create Question</h3>
                <p className="text-[11px] text-slate-400">LaTeX, MCQ options, keys</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/questions/import">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-amber-500/40 hover:bg-slate-900/80 transition flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <UploadCloud className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Bulk Ingestion</h3>
                <p className="text-[11px] text-slate-400">CSV & JSON pre-validation</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/subjects">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-amber-500/40 hover:bg-slate-900/80 transition flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Syllabus Taxonomy</h3>
                <p className="text-[11px] text-slate-400">Subjects & Chapters</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/audit-logs">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-amber-500/40 hover:bg-slate-900/80 transition flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Security Audit Trail</h3>
                <p className="text-[11px] text-slate-400">Staff actions & logs</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
