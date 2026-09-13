'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '../../../components/auth-guard';
import { CadetNav } from '../../../components/cadet-nav';
import { Button, Card, Badge, MathRenderer, Progress } from '@cdsprep/ui';
import { apiClient } from '../../../lib/api-client';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Bookmark,
  Share2,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Filter,
  Layers,
  BarChart2,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const AiExplanationDrawer = dynamic(
  () => import('../../../components/ai/ai-explanation-drawer').then((m) => m.AiExplanationDrawer),
  { ssr: false },
);

interface ResultData {
  id: string;
  bookmarkedQuestionIds?: string[];
  test: {
    id: string;
    title: string;
    targetAcademy: string;
    totalMarks: number;
    passingMarks: number | null;
    sections: Array<{
      id: string;
      name: string;
      testQuestions: Array<{
        orderIndex: number;
        question: {
          id: string;
          questionText: string;
          marks: number;
          negativeMarks: number;
          options: Array<{
            id: string;
            identifier: string;
            optionText: string;
            isCorrect: boolean;
          }>;
          explanation?: {
            explanation: string;
            keyConcept: string | null;
            trickFormula: string | null;
          } | null;
        };
      }>;
    }>;
  };
  result: {
    id: string;
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    grossMarks: number;
    negativeMarks: number;
    netScore: number;
    accuracyPercent: number;
    subjectBreakdown?: Array<{
      id: string;
      subjectName: string;
      totalQuestions: number;
      correctCount: number;
      incorrectCount: number;
      netScore: number;
      accuracyPercent: number;
    }>;
    topicBreakdown?: Array<{
      id: string;
      topicName: string;
      totalQuestions: number;
      correctCount: number;
      incorrectCount: number;
      accuracyPercent: number;
    }>;
  } | null;
  answers: Array<{
    questionId: string;
    selectedOptionId: string | null;
    timeSpentSeconds?: number;
  }>;
}

export default function ResultPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <CadetNav />
        <ResultContent />
      </div>
    </AuthGuard>
  );
}

function ResultContent() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INCORRECT' | 'CORRECT' | 'SKIPPED'>('ALL');
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [selectedAiQuestion, setSelectedAiQuestion] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    async function loadResult() {
      try {
        const res = await apiClient.get<ResultData>(`/results/attempt/${attemptId}`);
        setData(res);

        if (res.bookmarkedQuestionIds && Array.isArray(res.bookmarkedQuestionIds)) {
          const map: Record<string, boolean> = {};
          res.bookmarkedQuestionIds.forEach((qid) => {
            map[qid] = true;
          });
          setBookmarkedMap(map);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to retrieve test results');
      } finally {
        setLoading(false);
      }
    }
    if (attemptId) {
      loadResult();
    }
  }, [attemptId]);

  const handleToggleBookmark = async (questionId: string) => {
    try {
      const isCurrentlyBookmarked = Boolean(bookmarkedMap[questionId]);
      setBookmarkedMap((prev) => ({ ...prev, [questionId]: !isCurrentlyBookmarked }));

      await apiClient.post<{ isBookmarked: boolean }>(`/bookmarks/toggle`, { questionId });
    } catch {
      // Revert optimistic update
      setBookmarkedMap((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !data || !data.result) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/80 p-6 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Scorecard Not Ready</h2>
          <p className="text-sm text-slate-400">
            {error || 'The test evaluation is still processing or was not submitted.'}
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full bg-emerald-500 text-slate-950 font-bold">
            Return to Cadet HQ
          </Button>
        </Card>
      </div>
    );
  }

  const result = data.result;
  const test = data.test;

  // Answer lookup map
  const answersMap = new Map<string, string | null>();
  data.answers.forEach((ans) => {
    answersMap.set(ans.questionId, ans.selectedOptionId);
  });

  // Flatten questions
  const allQuestions = test.sections.flatMap((sec) =>
    sec.testQuestions.map((tq) => ({
      ...tq.question,
      sectionName: sec.name,
      userSelectedOptionId: answersMap.get(tq.question.id) || null,
    }))
  );

  const filteredQuestions = allQuestions.filter((q) => {
    const correctOpt = q.options.find((o) => o.isCorrect);
    const isAttempted = Boolean(q.userSelectedOptionId);
    const isCorrect = isAttempted && correctOpt?.id === q.userSelectedOptionId;

    if (filter === 'CORRECT') return isCorrect;
    if (filter === 'INCORRECT') return isAttempted && !isCorrect;
    if (filter === 'SKIPPED') return !isAttempted;
    return true;
  });

  const isPassed = Number(result.netScore) >= Number(test.passingMarks || 60);

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Scorecard Hero Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Award className="h-3.5 w-3.5" />
              <span>Official UPSC Performance Evaluation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{test.title}</h1>
            <p className="text-xs text-slate-400">
              Academy Target: <strong className="text-slate-200">{test.targetAcademy}</strong> •
              Evaluation Timestamp: {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {result.incorrectCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('INCORRECT')}
                className="h-9 border-rose-800/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
                <span>Retry Incorrect ({result.incorrectCount})</span>
              </Button>
            )}

            <Link href="/mistakes">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold"
              >
                Mistake Notebook
              </Button>
            </Link>

            <Link href="/tests">
              <Button
                size="sm"
                className="h-9 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs flex items-center gap-1.5"
              >
                <span>Take Another Test</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Net UPSC Score
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {Number(result.netScore).toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-bold">/ {test.totalMarks}</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              {isPassed ? 'Qualified Benchmark' : 'Needs Reinforcement'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Accuracy Rate
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-teal-300">
                {Number(result.accuracyPercent).toFixed(1)}%
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              {result.correctCount} of {result.attemptedCount} attempted
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Gross vs Negative
            </span>
            <div className="flex items-baseline gap-1 mt-1 text-sm font-bold">
              <span className="text-emerald-400">+{Number(result.grossMarks).toFixed(2)}</span>
              <span className="text-slate-500">/</span>
              <span className="text-rose-400">-{Number(result.negativeMarks).toFixed(2)}</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              Penalty: -0.33 per incorrect
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Questions Solved
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {result.attemptedCount}
              </span>
              <span className="text-xs text-slate-500 font-bold">/ {result.totalQuestions}</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              {result.skippedCount} Skipped
            </span>
          </div>
        </div>
      </div>

      {/* Section / Subject Breakdown Cards */}
      {result.subjectBreakdown && result.subjectBreakdown.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Subject-Level Performance Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.subjectBreakdown.map((sb) => (
              <Card key={sb.id} className="p-4 border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{sb.subjectName}</span>
                  <Badge variant={sb.accuracyPercent >= 70 ? 'success' : 'default'} className="text-[10px]">
                    {Number(sb.accuracyPercent).toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Score: <strong className="text-emerald-400">+{Number(sb.netScore).toFixed(1)}</strong></span>
                  <span>Correct: <strong className="text-slate-200">{sb.correctCount}/{sb.totalQuestions}</strong></span>
                  <span>Wrong: <strong className="text-rose-400">{sb.incorrectCount}</strong></span>
                </div>

                <Progress value={Number(sb.accuracyPercent)} indicatorClassName={sb.accuracyPercent >= 70 ? 'bg-emerald-500' : 'bg-amber-500'} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Solutions & Analysis Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Detailed Solutions & Mathematical Proofs
            </h2>
            <p className="text-xs text-slate-400">
              Review every derivation, trick formula, and UPSC key concept.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'ALL' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({allQuestions.length})
            </button>
            <button
              onClick={() => setFilter('CORRECT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'CORRECT' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Correct ({result.correctCount})
            </button>
            <button
              onClick={() => setFilter('INCORRECT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'INCORRECT' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Incorrect ({result.incorrectCount})
            </button>
            <button
              onClick={() => setFilter('SKIPPED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'SKIPPED' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Skipped ({result.skippedCount})
            </button>
          </div>
        </div>

        {/* Question Review Cards */}
        <div className="space-y-6">
          {filteredQuestions.map((q, idx) => {
            const correctOpt = q.options.find((o) => o.isCorrect);
            const userSelectedOpt = q.options.find((o) => o.id === q.userSelectedOptionId);
            const isCorrect = userSelectedOpt && userSelectedOpt.id === correctOpt?.id;
            const isAttempted = Boolean(userSelectedOpt);
            const isBookmarked = bookmarkedMap[q.id];

            return (
              <Card
                key={q.id}
                className="border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4 overflow-hidden"
              >
                {/* Card Top Meta */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-200">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {q.sectionName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct (+{q.marks})
                      </span>
                    ) : isAttempted ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 text-xs font-bold text-rose-400">
                        <XCircle className="h-3.5 w-3.5" /> Incorrect (-{q.negativeMarks})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-800/60 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400">
                        Skipped (0.0)
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAiQuestion({ id: q.id, text: q.questionText })}
                      className="h-8 px-2.5 text-xs font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30 flex items-center gap-1.5"
                      title="Open AI Pedagogical Tutor"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Ask AI Tutor</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleBookmark(q.id)}
                      className={`h-8 w-8 p-0 ${
                        isBookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                      }`}
                      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-sm sm:text-base font-medium text-slate-100">
                  <MathRenderer content={q.questionText} />
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isUserChoice = opt.id === q.userSelectedOptionId;
                    const isRightOption = opt.isCorrect;

                    let optStyle = 'border-slate-800 bg-slate-900/30 text-slate-400';
                    if (isRightOption) {
                      optStyle = 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 font-semibold ring-1 ring-emerald-500/30';
                    } else if (isUserChoice && !isRightOption) {
                      optStyle = 'border-rose-500/60 bg-rose-950/30 text-rose-300 font-semibold ring-1 ring-rose-500/30';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-xs sm:text-sm ${optStyle}`}
                      >
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-bold text-slate-200">
                          {opt.identifier}
                        </span>
                        <div className="flex-1 overflow-x-auto">
                          <MathRenderer content={opt.optionText} />
                        </div>
                        {isRightOption && (
                          <span className="text-[11px] font-bold text-emerald-400 ml-auto">
                            Official Answer
                          </span>
                        )}
                        {isUserChoice && !isRightOption && (
                          <span className="text-[11px] font-bold text-rose-400 ml-auto">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Official Step-by-Step Explanation with KaTeX */}
                {q.explanation && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-3 mt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <Sparkles className="h-4 w-4" />
                      <span>Step-by-Step Solution & Concept</span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed overflow-x-auto">
                      <MathRenderer content={q.explanation.explanation} />
                    </div>

                    {q.explanation.trickFormula && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs text-amber-300">
                        <strong className="text-amber-200 block mb-1">⚡ UPSC Speed Technique / Trick:</strong>
                        <MathRenderer content={q.explanation.trickFormula} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* AI Pedagogical Tutor Drawer */}
        {selectedAiQuestion && (
          <AiExplanationDrawer
            isOpen={!!selectedAiQuestion}
            onClose={() => setSelectedAiQuestion(null)}
            questionId={selectedAiQuestion.id}
            questionText={selectedAiQuestion.text}
          />
        )}
      </div>
    </main>
  );
}
