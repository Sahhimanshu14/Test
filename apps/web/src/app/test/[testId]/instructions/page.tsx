'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../../../components/auth-guard';
import { CadetNav } from '../../../../components/cadet-nav';
import { Button, Card, Badge } from '@cdsprep/ui';
import { apiClient } from '../../../../lib/api-client';
import {
  Shield,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

interface TestDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number | null;
  targetAcademy: string;
  sections: Array<{ id: string; name: string; durationMinutes: number | null }>;
}

export default function TestInstructionsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <CadetNav />
        <InstructionsContent />
      </div>
    </AuthGuard>
  );
}

function InstructionsContent() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTest() {
      try {
        const data = await apiClient.get<TestDetail>(`/tests/${testId}`);
        setTest(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load test details');
      } finally {
        setLoading(false);
      }
    }
    if (testId) {
      loadTest();
    }
  }, [testId]);

  const handleStartExam = async () => {
    if (!agreed || !test) return;
    setStarting(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        attempt: { id: string };
        isResumed: boolean;
      }>('/attempts/start', { testId: test.id });

      const attemptId = response.attempt?.id || (response as any).id;
      router.push(`/test/${test.id}/attempt/${attemptId}`);
    } catch (err: any) {
      setError(err.message || 'Could not start examination attempt');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/80 p-6 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Notice</h2>
          <p className="text-sm text-slate-400">{error || 'Test not found'}</p>
          <Button onClick={() => router.push('/tests')} className="w-full bg-emerald-500 text-slate-950 font-bold">
            Return to Mock Catalog
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Test Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge variant="default" className="text-xs font-bold uppercase">
            Official UPSC Simulation
          </Badge>
          <span className="text-xs font-semibold text-emerald-400">
            Cadet Target: {test.targetAcademy}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white">{test.title}</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          {test.description || 'Calibrated to UPSC Combined Defence Services standards with sectional time enforcement.'}
        </p>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-center">
          <div className="rounded-lg bg-slate-950/60 p-2.5">
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-emerald-400" /> Duration
            </span>
            <span className="text-sm font-bold text-slate-200">{test.durationMinutes} Minutes</span>
          </div>
          <div className="rounded-lg bg-slate-950/60 p-2.5">
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-emerald-400" /> Total Marks
            </span>
            <span className="text-sm font-bold text-slate-200">{test.totalMarks} Marks</span>
          </div>
          <div className="rounded-lg bg-slate-950/60 p-2.5">
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-400" /> Negative Marking
            </span>
            <span className="text-sm font-bold text-rose-300">-0.33 per mark</span>
          </div>
        </div>
      </div>

      {/* UPSC Instructions Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Info className="h-4 w-4 text-emerald-400" />
          General Instructions for UPSC CDS Examination
        </h3>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            1. The clock will be synchronized with the central server. The countdown timer at the top-right corner will display remaining examination time.
          </p>
          <p>
            2. When the timer reaches zero, the examination will <strong>automatically finalize and submit</strong> your answers, regardless of manual submission.
          </p>
          <p>
            3. <strong>Question Palette Symbols:</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-3 py-1">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-slate-800 border border-slate-700 flex-shrink-0"></span>
              <span className="text-xs text-slate-400">You have not visited the question yet.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-rose-600 flex-shrink-0"></span>
              <span className="text-xs text-slate-400">You have visited but not answered.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-emerald-600 flex-shrink-0"></span>
              <span className="text-xs text-slate-400">You have answered the question.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-purple-600 flex-shrink-0"></span>
              <span className="text-xs text-slate-400">Marked for review without answering.</span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <span className="h-4 w-4 rounded bg-purple-700 border border-emerald-400 flex-shrink-0"></span>
              <span className="text-xs text-slate-400">
                Answered & marked for review (will be evaluated for scoring).
              </span>
            </div>
          </div>
          <p>
            4. <strong>Autosave:</strong> Every answer selection is saved immediately to the server. You can navigate between questions freely using the Question Palette.
          </p>
          <p>
            5. <strong>Integrity Policy:</strong> Do not navigate away from the examination window or switch application tabs. Window blurs are audited.
          </p>
        </div>

        {/* Candidate Declaration */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
            />
            <span className="text-xs sm:text-sm text-slate-300 font-medium">
              I have read and understood all instructions above. I declare that I will adhere to the UPSC examination code of conduct and integrity standards.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push('/tests')}
              className="border-slate-800 text-slate-400 hover:bg-slate-900"
            >
              Cancel
            </Button>
            <Button
              disabled={!agreed || starting}
              onClick={handleStartExam}
              className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 h-11"
            >
              {starting ? (
                <span>Initializing Exam...</span>
              ) : (
                <>
                  <span>Begin Examination</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
