'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import {
  Button,
  Card,
  Badge,
  TestCard,
} from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  Shield,
  Clock,
  Award,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

interface TestItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number | null;
  isFullMock: boolean;
  targetAcademy: string;
  subject?: { name: string; slug: string } | null;
  sections: Array<{ id: string; name: string; durationMinutes: number | null }>;
  _count?: { attempts: number };
}

export default function TestsPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <TestsContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function TestsContent() {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'FULL' | 'SECTIONAL'>('ALL');

  useEffect(() => {
    async function loadTests() {
      try {
        const data = await apiClient.get<TestItem[]>('/tests');
        setTests(data || []);
      } catch (err) {
        console.error('Failed to load tests', err);
      } finally {
        setLoading(false);
      }
    }
    loadTests();
  }, []);

  const filteredTests = tests.filter((t) => {
    if (filter === 'FULL') return t.isFullMock;
    if (filter === 'SECTIONAL') return !t.isFullMock;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Shield className="h-3.5 w-3.5" />
              <span>Strict Server-Authoritative Test Environment</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              CDS Examination Simulations
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Authentic UPSC CDS simulations with 6-state palettes, accurate negative marking (-0.33 per mark), KaTeX mathematics typesetting, and real-time rank predictions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Tests
            </button>
            <button
              onClick={() => setFilter('FULL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'FULL'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Mocks
            </button>
            <button
              onClick={() => setFilter('SECTIONAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'SECTIONAL'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sectional
            </button>
          </div>
        </div>
      </div>

      {/* Test Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Mock Tests Available</h3>
          <p className="text-xs text-slate-400 mt-1">Check back shortly or explore practice questions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <TestCard
              key={test.id}
              id={test.id}
              title={test.title}
              description={test.description}
              durationMinutes={test.durationMinutes}
              totalMarks={test.totalMarks}
              passingMarks={test.passingMarks}
              isFullMock={test.isFullMock}
              targetAcademy={test.targetAcademy}
              sections={Array.isArray(test.sections) ? test.sections : []}
              onStart={() => router.push(`/test/${test.id}/instructions`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
