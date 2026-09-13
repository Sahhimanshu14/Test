'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  CheckSquare,
  PlusCircle,
  Clock,
  Award,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sliders,
  ChevronRight,
  Layers,
  FileCheck,
} from 'lucide-react';
import { RoleType, TestType, AcademyTarget } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface TestItem {
  id: string;
  title: string;
  slug: string;
  testType: TestType;
  targetAcademy: AcademyTarget;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  isPublished: boolean;
  sectionsCount?: number;
  questionsCount?: number;
  instructions?: string;
}

export default function AdminTestsPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <TestBuilderContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function TestBuilderContent() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // New Test Form
  const [title, setTitle] = useState('CDS Full Mock Exam - IMA Flight Alpha');
  const [slug, setSlug] = useState('cds-full-mock-ima-flight-alpha');
  const [testType, setTestType] = useState<TestType>(TestType.FULL_MOCK);
  const [targetAcademy, setTargetAcademy] = useState<AcademyTarget>(AcademyTarget.IMA);
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [totalMarks, setTotalMarks] = useState('100');
  const [negativeMarks, setNegativeMarks] = useState('0.33');
  const [instructions, setInstructions] = useState('Official Combined Defence Services Examination format: Negative marking of 0.33 marks per incorrect answer applies. Candidates are advised to avoid unverified guesses.');
  const [submitting, setSubmitting] = useState(false);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: TestItem[] }>('/tests');
      setTests(res.items || []);
    } catch {
      // Mock fallback data if offline
      setTests([
        {
          id: 'test-mock-01',
          title: 'CDS Full Mock Exam 1 (IMA / INA / AFA)',
          slug: 'cds-full-mock-01',
          testType: TestType.FULL_MOCK,
          targetAcademy: AcademyTarget.IMA,
          durationMinutes: 120,
          totalMarks: 100,
          negativeMarks: 0.33,
          isPublished: true,
          sectionsCount: 3,
          questionsCount: 100,
          instructions: 'Standard 120-minute examination instructions with 0.33 negative marking.',
        },
        {
          id: 'test-mock-02',
          title: 'CDS Elementary Mathematics Sprint 4',
          slug: 'cds-elementary-math-sprint-4',
          testType: TestType.SUBJECT_TEST,
          targetAcademy: AcademyTarget.IMA,
          durationMinutes: 60,
          totalMarks: 50,
          negativeMarks: 0.33,
          isPublished: false,
          sectionsCount: 2,
          questionsCount: 50,
          instructions: 'Timed speed mathematics drill.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/tests', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          testType,
          targetAcademy,
          durationMinutes: parseInt(durationMinutes, 10),
          totalMarks: parseFloat(totalMarks),
          negativeMarks: parseFloat(negativeMarks),
          instructions,
        }),
      });

      alert('Mock test configured successfully.');
      setShowCreateModal(false);
      fetchTests();
    } catch (err: any) {
      alert(err.message || 'Failed to create test configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateAndPublish = async (testId: string) => {
    setPublishingId(testId);
    try {
      const res = await apiRequest<{ success: boolean; totalQuestions: number }>(
        `/admin/tests/${testId}/publish`,
        { method: 'POST' },
      );
      alert(`Validation passed! Test successfully published to cadet portal (${res.totalQuestions} questions verified).`);
      fetchTests();
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        alert(`Validation Failed:\n- ${err.errors.join('\n- ')}`);
      } else {
        alert(err.message || 'Failed to publish test: Pre-publish validation failed');
      }
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-amber-400" />
            <span>Mock Test Engine & Builder</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build multi-section CDS mock examinations, configure timer thresholds, and run pre-publication verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTests}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Test Architecture</span>
          </Button>
        </div>
      </div>

      {/* Tests Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
            <span>Loading examination models...</span>
          </div>
        ) : tests.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-slate-500">
            No mock tests configured yet. Click New Test Architecture to create one.
          </div>
        ) : (
          tests.map((t) => (
            <Card key={t.id} className="p-5 border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.title}</h3>
                    <span className="text-[11px] font-mono text-slate-500">slug: {t.slug}</span>
                  </div>
                  {t.isPublished ? (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                      LIVE IN ARENA
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      DRAFT
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Duration</span>
                    <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      {t.durationMinutes}m
                    </span>
                  </div>
                  <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Marks</span>
                    <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                      <Award className="h-3 w-3 text-emerald-400" />
                      {t.totalMarks}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Neg. Ratio</span>
                    <span className="text-xs font-bold text-rose-400">-{t.negativeMarks}</span>
                  </div>
                </div>

                {t.instructions && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic pt-1">
                    &ldquo;{t.instructions}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Target: {t.targetAcademy}
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/tests/${t.slug}`} target="_blank">
                    <Button variant="ghost" size="sm" className="text-xs text-slate-300">
                      Cadet Preview
                    </Button>
                  </Link>
                  {!t.isPublished && (
                    <Button
                      size="sm"
                      disabled={publishingId === t.id}
                      onClick={() => handleValidateAndPublish(t.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      {publishingId === t.id ? 'Validating...' : 'Validate & Publish'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Test Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Configure Examination Structure</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Test Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">URL Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Test Type</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value as TestType)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value={TestType.FULL_MOCK}>FULL_MOCK</option>
                    <option value={TestType.SUBJECT_TEST}>SUBJECT_TEST</option>
                    <option value={TestType.CHAPTER_TEST}>CHAPTER_TEST</option>
                    <option value={TestType.TOPIC_TEST}>TOPIC_TEST</option>
                    <option value={TestType.CUSTOM_TEST}>CUSTOM_TEST</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Academy</label>
                  <select
                    value={targetAcademy}
                    onChange={(e) => setTargetAcademy(e.target.value as AcademyTarget)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value={AcademyTarget.IMA}>IMA</option>
                    <option value={AcademyTarget.INA}>INA</option>
                    <option value={AcademyTarget.AFA}>AFA</option>
                    <option value={AcademyTarget.OTA}>OTA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Neg. Marks</label>
                  <input
                    type="number"
                    step="0.01"
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Candidate Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {submitting ? 'Creating...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
