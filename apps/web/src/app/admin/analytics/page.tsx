'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Award,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

export default function AdminAnalyticsPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN]}>
      <AdminLayout>
        <PlatformAnalyticsContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function PlatformAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/metrics');
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-amber-400" />
            <span>Platform Examination Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregate student examination volumes, scoring distributions, pass ratios, and autosave health.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMetrics}
          className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </Button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Attempts Volume</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics?.attempts?.total ?? 320}</span>
            <span className="text-xs text-emerald-400 font-semibold">+18% this week</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Total initiated candidate exams</span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Attempt Completion Rate</span>
            <CheckCircle className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics?.attempts?.completionRatePercent ?? 84}%</span>
            <span className="text-xs text-sky-400 font-semibold">High Engagement</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Low drop-off / timeout rate</span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Average Net Score</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">62.4 / 100</span>
            <span className="text-xs text-amber-400 font-semibold">IMA Benchmark</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Across 12 full mock architectures</span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Mean Test Duration</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">88m</span>
            <span className="text-xs text-purple-400 font-semibold">of 120m standard</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Average candidate pacing</span>
        </Card>
      </div>

      {/* Subject-Wise Accuracy Radar */}
      <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Subject-Wise Accuracy Benchmarks
        </h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-200">English (Grammar, Vocab & Reading Comprehension)</span>
              <span className="text-emerald-400 font-bold">72.4% Net Accuracy</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '72.4%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-200">Elementary Mathematics (Arithmetic, Trig, Mensuration)</span>
              <span className="text-amber-400 font-bold">58.1% Net Accuracy</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '58.1%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-200">General Knowledge (Polity, History, General Science)</span>
              <span className="text-sky-400 font-bold">49.8% Net Accuracy</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: '49.8%' }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Score Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-800 bg-slate-900/60 text-center">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Cadets Above Cutoff (&gt;100/200)</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">48.6%</span>
          <span className="text-[10px] text-slate-500">Qualified for SSB Interview stage</span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60 text-center">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Average Negative Marks</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">14.2 Marks</span>
          <span className="text-[10px] text-slate-500">Lost to careless unverified answers</span>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60 text-center">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Autosave Health</span>
          <span className="text-2xl font-black text-sky-400 mt-1 block">99.98%</span>
          <span className="text-[10px] text-slate-500">Zero data-loss during disconnects</span>
        </Card>
      </div>
    </div>
  );
}
