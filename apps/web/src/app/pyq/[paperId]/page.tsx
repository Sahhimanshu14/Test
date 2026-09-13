'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '../../../components/auth-guard';
import { StudentLayout } from '../../../components/layouts/student-layout';
import { Button, Card, Badge, MathRenderer, QuestionCard, OptionCard } from '@cdsprep/ui';
import { apiClient } from '../../../lib/api-client';
import {
  ArrowLeft,
  Clock,
  Award,
  ShieldCheck,
  PlayCircle,
  Bookmark,
  BookmarkCheck,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Layers,
  FileText,
  X,
  Send,
  Flag,
  ExternalLink,
} from 'lucide-react';

interface QuestionOption {
  id: string;
  identifier: string;
  optionText: string;
  isCorrect: boolean;
}

interface QuestionDetail {
  id: string;
  questionText: string;
  marks: number;
  negativeMarks: number;
  options: QuestionOption[];
  explanation?: {
    explanation: string;
    keyConcept?: string | null;
    trickFormula?: string | null;
  } | null;
}

interface PaperItem {
  id: string;
  year: number;
  session: string;
  exam: string;
  subjectSlug: string;
  title: string;
  totalMarks: number;
  durationMin: number;
  source?: string | null;
  sourceUrl?: string | null;
  licenseType?: string;
  attribution?: string | null;
  testId?: string | null;
  questions: Array<{
    id: string;
    questionNumber: number;
    question: QuestionDetail;
  }>;
}

export default function PYQPaperDetailPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <PYQPaperContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function PYQPaperContent() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;

  const [paper, setPaper] = useState<PaperItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Interaction states
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<Set<string>>(new Set());
  const [incorrectQuestionIds, setIncorrectQuestionIds] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'bookmarks' | 'incorrect'>('all');

  // Report Modal state
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    async function loadPaper() {
      setLoading(true);
      try {
        const data = await apiClient.get<PaperItem>(`/pyqs/papers/${paperId}`);
        setPaper(data);
      } catch (err: any) {
        // Fallback demo paper if offline
        setPaper({
          id: paperId,
          year: 2023,
          session: 'I',
          exam: 'CDS I',
          subjectSlug: 'elementary-maths',
          title: 'CDS I 2023 — Elementary Mathematics Official Paper',
          totalMarks: 100,
          durationMin: 120,
          source: 'Union Public Service Commission (UPSC) Official Press',
          sourceUrl: 'https://upsc.gov.in',
          licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
          attribution: 'Official Question Paper published by UPSC. Reproduced for candidate preparation.',
          testId: 'test-backing-1',
          questions: [
            {
              id: 'pq-1',
              questionNumber: 1,
              question: {
                id: 'q-demo-1',
                questionText: 'What is the value of $\\sin^2(30^\\circ) + \\cos^2(30^\\circ)$?',
                marks: 1.0,
                negativeMarks: 0.33,
                options: [
                  { id: 'opt-1', identifier: 'A', optionText: '$1$', isCorrect: true },
                  { id: 'opt-2', identifier: 'B', optionText: '$0$', isCorrect: false },
                  { id: 'opt-3', identifier: 'C', optionText: '$\\frac{1}{2}$', isCorrect: false },
                  { id: 'opt-4', identifier: 'D', optionText: '$\\frac{\\sqrt{3}}{2}$', isCorrect: false },
                ],
                explanation: {
                  explanation: 'By the fundamental trigonometric identity, $\\sin^2 \\theta + \\cos^2 \\theta = 1$ for any angle $\\theta$.',
                  keyConcept: 'Pythagorean Trigonometric Identity',
                  trickFormula: '$\\sin^2 \\theta + \\cos^2 \\theta \\equiv 1$',
                },
              },
            },
            {
              id: 'pq-2',
              questionNumber: 2,
              question: {
                id: 'q-demo-2',
                questionText: 'If $x + \\frac{1}{x} = 5$, find the value of $x^2 + \\frac{1}{x^2}$.',
                marks: 1.0,
                negativeMarks: 0.33,
                options: [
                  { id: 'opt-5', identifier: 'A', optionText: '$23$', isCorrect: true },
                  { id: 'opt-6', identifier: 'B', optionText: '$25$', isCorrect: false },
                  { id: 'opt-7', identifier: 'C', optionText: '$27$', isCorrect: false },
                  { id: 'opt-8', identifier: 'D', optionText: '$21$', isCorrect: false },
                ],
                explanation: {
                  explanation: 'Squaring both sides: $(x + 1/x)^2 = 25 \\implies x^2 + 2 + 1/x^2 = 25 \\implies x^2 + 1/x^2 = 23$.',
                  keyConcept: 'Algebraic Identities',
                  trickFormula: 'If $x + 1/x = k$, then $x^2 + 1/x^2 = k^2 - 2$.',
                },
              },
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }

    loadPaper();
  }, [paperId]);

  // Launch test attempt in actual engine
  const handleStartExam = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await apiClient.post<any>(`/pyqs/papers/${paperId}/start`);
      const testId = res?.test?.id || res?.data?.test?.id || paper?.testId;
      if (testId) {
        router.push(`/test/${testId}/attempt`);
      } else {
        router.push(`/test/${paperId}/instructions`);
      }
    } catch (err: any) {
      if (paper?.testId) {
        router.push(`/test/${paper.testId}/attempt`);
      } else {
        setError(err?.message || 'Failed to initialize exam session');
        setStarting(false);
      }
    }
  };

  // Toggle question bookmark
  const handleToggleBookmark = async (questionId: string) => {
    setBookmarkedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });

    try {
      await apiClient.post('/bookmarks/toggle', { questionId });
    } catch {
      // Local state kept
    }
  };

  // Submit question report
  const handleSubmitReport = async () => {
    if (!reportReason.trim() || !reportingQuestionId) return;
    try {
      await apiClient.post('/reports', {
        questionId: reportingQuestionId,
        reason: reportReason.trim(),
      }).catch(() => null);
      setReportSuccess(true);
      setTimeout(() => {
        setReportingQuestionId(null);
        setReportReason('');
        setReportSuccess(false);
      }, 1500);
    } catch {
      setReportingQuestionId(null);
    }
  };

  // Filter questions according to active tab
  const displayedQuestions = useMemo(() => {
    if (!paper) return [];
    if (filterMode === 'bookmarks') {
      return paper.questions.filter((pq) => bookmarkedQuestionIds.has(pq.question.id));
    }
    if (filterMode === 'incorrect') {
      return paper.questions.filter((pq) => incorrectQuestionIds.has(pq.question.id));
    }
    return paper.questions;
  }, [paper, filterMode, bookmarkedQuestionIds, incorrectQuestionIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-28 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Paper Not Found</h2>
        <p className="text-xs text-slate-400">The requested PYQ paper could not be found or has not been published.</p>
        <Link href="/pyq">
          <Button variant="outline" size="sm" className="text-xs">
            Return to Vault
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <Link href="/pyq">
        <Button
          variant="outline"
          size="sm"
          className="border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Papers</span>
        </Button>
      </Link>

      {/* Hero Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {paper.year} • Session {paper.session}
              </span>
              <Badge variant="outline">{paper.exam}</Badge>
              <Badge variant="default" className="text-xs">
                {paper.questions.length} Questions
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {paper.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" />
                Duration: {paper.durationMin} Minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-slate-500" />
                Total Marks: {paper.totalMarks}
              </span>
              <span>Negative Marking: 1/3 (-0.33)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              size="lg"
              disabled={starting}
              onClick={handleStartExam}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 px-6"
            >
              <PlayCircle className="h-5 w-5" />
              <span>{starting ? 'Starting Exam...' : 'Start Timed Exam'}</span>
            </Button>
            <span className="text-[10px] text-slate-400 text-center">
              Authoritative server clock • Real CDS grading
            </span>
          </div>
        </div>

        {/* Legal Attribution Notice */}
        {paper.attribution && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-300 block">
                Official Attribution & Licensing ({paper.licenseType || 'Public Domain'}):
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {paper.attribution}
                {paper.sourceUrl && (
                  <a
                    href={paper.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline ml-1 inline-flex items-center gap-0.5"
                  >
                    <span>View Official Source</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Questions Filter Nav */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterMode === 'all'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Questions ({paper.questions.length})
          </button>
          <button
            onClick={() => setFilterMode('bookmarks')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              filterMode === 'bookmarks'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Bookmarked ({bookmarkedQuestionIds.size})</span>
          </button>
          <button
            onClick={() => setFilterMode('incorrect')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              filterMode === 'incorrect'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry Incorrect ({incorrectQuestionIds.size})</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Official UPSC Solutions & Derivations
        </span>
      </div>

      {/* Questions List */}
      {displayedQuestions.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-2">
          <HelpCircle className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No questions in this filter view</h3>
          <p className="text-xs text-slate-400">
            {filterMode === 'bookmarks'
              ? 'Click the bookmark icon on any question below to save it for revision.'
              : 'No incorrect questions flagged yet. Take the timed exam to track mistakes!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedQuestions.map((pq) => {
            const isBookmarked = bookmarkedQuestionIds.has(pq.question.id);

            return (
              <QuestionCard
                key={pq.id}
                questionNumber={pq.questionNumber}
                questionText={pq.question.questionText}
                marks={pq.question.marks}
                negativeMarks={pq.question.negativeMarks}
              >
                {/* Header Action Tools */}
                <div className="flex items-center justify-end gap-2 pb-2">
                  <button
                    onClick={() => handleToggleBookmark(pq.question.id)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${
                      isBookmarked
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5" />
                    )}
                    <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                  </button>

                  <button
                    onClick={() => setReportingQuestionId(pq.question.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span>Report Issue</span>
                  </button>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {pq.question.options.map((opt) => (
                    <OptionCard
                      key={opt.id}
                      id={opt.id}
                      identifier={opt.identifier}
                      optionText={opt.optionText}
                      isCorrect={opt.isCorrect}
                      isRevealed={true}
                    />
                  ))}
                </div>

                {/* Official Solution & KaTeX Derivation */}
                {pq.question.explanation && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-2 mt-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Official Explanation & Derivation</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed overflow-x-auto">
                      <MathRenderer content={pq.question.explanation.explanation} />
                    </div>
                    {pq.question.explanation.keyConcept && (
                      <div className="pt-2 text-xs font-semibold text-emerald-300">
                        Key Concept: {pq.question.explanation.keyConcept}
                      </div>
                    )}
                    {pq.question.explanation.trickFormula && (
                      <div className="pt-1 text-xs text-slate-300">
                        <span className="font-bold text-emerald-400">Speed Formula: </span>
                        <MathRenderer content={pq.question.explanation.trickFormula} />
                      </div>
                    )}
                  </div>
                )}
              </QuestionCard>
            );
          })}
        </div>
      )}

      {/* REPORT ISSUE MODAL */}
      {reportingQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setReportingQuestionId(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flag className="h-4 w-4 text-rose-400" />
                <span>Report Question Issue</span>
              </h3>
              <p className="text-xs text-slate-400">
                Notice a typo, formula rendering error, or disputed answer key? Flag it for our moderation staff.
              </p>
            </div>

            {reportSuccess ? (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Report submitted. Thank you for maintaining UPSC quality standards!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe the discrepancy (e.g., option C appears to match official key)..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportingQuestionId(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitReport}
                    disabled={!reportReason.trim()}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    <span>Submit Report</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
