'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { CadetNav } from '../../components/cadet-nav';
import { Button, Card, Badge, MathRenderer } from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  AlertOctagon,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Tag,
  Shield,
  Layers,
  Bookmark,
  Play,
  Clock,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const AiExplanationDrawer = dynamic(
  () => import('../../components/ai/ai-explanation-drawer').then((m) => m.AiExplanationDrawer),
  { ssr: false },
);
import { MistakeStatus } from '@cdsprep/types';

interface MistakeItem {
  id: string;
  questionId: string;
  status: MistakeStatus;
  isCareless?: boolean | null;
  failedCount: number;
  lastMistakeAt: string;
  isBookmarked?: boolean;
  userSelectedOption?: {
    id: string;
    identifier: string;
    optionText: string;
    isCorrect: boolean;
  } | null;
  correctOption?: {
    id: string;
    identifier: string;
    optionText: string;
    isCorrect: boolean;
  } | null;
  question: {
    id: string;
    questionText: string;
    marks: number;
    negativeMarks: number;
    subject?: { name: string; slug: string };
    chapter?: { name: string; slug: string };
    topic?: { name: string; slug: string };
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
}

export default function MistakesPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <CadetNav />
        <MistakesContent />
      </div>
    </AuthGuard>
  );
}

function MistakesContent() {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'MASTERED'>('ACTIVE');
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [selectedAiQuestion, setSelectedAiQuestion] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    async function loadMistakes() {
      setLoading(true);
      try {
        const data = await apiClient.get<MistakeItem[]>(`/mistakes?status=${activeTab}`);
        setMistakes(data || []);

        const map: Record<string, boolean> = {};
        (data || []).forEach((m) => {
          if (m.isBookmarked) map[m.questionId] = true;
        });
        setBookmarkedMap(map);
      } catch (err) {
        console.error('Failed to load mistakes', err);
      } finally {
        setLoading(false);
      }
    }
    loadMistakes();
  }, [activeTab]);

  const handleToggleCareless = async (mistakeId: string, currentVal?: boolean | null) => {
    const newVal = !currentVal;
    try {
      await apiClient.patch(`/mistakes/${mistakeId}/status`, {
        status: activeTab,
        isCareless: newVal,
      });
      setMistakes((prev) =>
        prev.map((m) => (m.id === mistakeId ? { ...m, isCareless: newVal } : m))
      );
    } catch (err) {
      console.error('Failed to update tag', err);
    }
  };

  const handleMarkMastered = async (mistakeId: string) => {
    try {
      await apiClient.post(`/mistakes/${mistakeId}/master`, {});
      setMistakes((prev) => prev.filter((m) => m.id !== mistakeId));
    } catch (err) {
      console.error('Failed to mark mastered', err);
    }
  };

  const handleToggleBookmark = async (questionId: string) => {
    try {
      const isBookmarked = Boolean(bookmarkedMap[questionId]);
      setBookmarkedMap((prev) => ({ ...prev, [questionId]: !isBookmarked }));
      await apiClient.post('/bookmarks/toggle', { questionId });
    } catch {
      setBookmarkedMap((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
    }
  };

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-rose-950/30 p-6 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
              <AlertOctagon className="h-3.5 w-3.5" />
              <span>Automatic Mistake Notebook</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Active Weakness & Error Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Questions answered incorrectly during practice drills and mock examinations automatically record here. Analyze your wrong answer vs. correct solution and re-drill to 100% mastery.
            </p>
          </div>

          {activeTab === 'ACTIVE' && mistakes.length > 0 && (
            <Link href="/practice?mode=MISTAKES" className="self-start md:self-auto flex-shrink-0">
              <Button className="h-10 px-5 font-bold bg-rose-600 hover:bg-rose-500 text-white text-xs flex items-center gap-2 shadow-lg shadow-rose-950/40">
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Practice Mistakes ({mistakes.length})</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ACTIVE'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Active Errors ({activeTab === 'ACTIVE' ? mistakes.length : ''})
          </button>
          <button
            onClick={() => setActiveTab('MASTERED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'MASTERED'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Mastered Concepts
          </button>
        </div>
      </div>

      {/* Mistakes List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : mistakes.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {activeTab === 'ACTIVE' ? 'No Active Mistakes Pending!' : 'No Mastered Questions Yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'ACTIVE'
              ? 'Excellent work Cadet! Take a mock exam or complete practice drills to challenge yourself.'
              : 'Practice questions in your Active Errors tab and mark them as Mastered once understood.'}
          </p>
          <div className="pt-2">
            <Link href="/tests">
              <Button size="sm" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs">
                Take Mock Test
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {mistakes.map((m, idx) => {
            const isBookmarked = bookmarkedMap[m.questionId];
            return (
              <Card
                key={m.id}
                className="border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-950/80 border border-rose-800/40 text-xs font-bold text-rose-300">
                      #{idx + 1}
                    </span>
                    {m.question.subject && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {m.question.subject.name}
                      </span>
                    )}
                    {m.question.topic && (
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        • {m.question.topic.name}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      Failed {m.failedCount}x • Last {new Date(m.lastMistakeAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleCareless(m.id, m.isCareless)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold border transition ${
                        m.isCareless
                          ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Toggle careless vs conceptual mistake"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{m.isCareless ? 'Careless Error' : 'Conceptual Gap'}</span>
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedAiQuestion({
                          id: m.questionId,
                          text: m.question.questionText,
                        })
                      }
                      className="h-7 px-2 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30 flex items-center gap-1 font-semibold"
                      title="Open AI Pedagogical Tutor"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span className="hidden sm:inline">Ask AI Tutor</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleBookmark(m.questionId)}
                      className={`h-8 w-8 p-0 ${
                        isBookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Bookmark for revision"
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                    </Button>

                    {activeTab === 'ACTIVE' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkMastered(m.id)}
                        className="h-7 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Mark Mastered</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-sm sm:text-base font-medium text-slate-100">
                  <MathRenderer content={m.question.questionText} />
                </div>

                {/* Options with Student Choice vs Correct Choice */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {m.question.options.map((opt) => {
                    const isUserPick = m.userSelectedOption?.id === opt.id;
                    const isRightOption = opt.isCorrect;

                    let optStyle = 'border-slate-800 bg-slate-900/30 text-slate-400';
                    if (isRightOption) {
                      optStyle = 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 font-semibold ring-1 ring-emerald-500/30';
                    } else if (isUserPick) {
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
                          <span className="text-[11px] font-bold text-emerald-400 ml-auto flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Correct Solution
                          </span>
                        )}
                        {isUserPick && !isRightOption && (
                          <span className="text-[11px] font-bold text-rose-400 ml-auto flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Your Recorded Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step KaTeX Explanation */}
                {m.question.explanation && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Step-by-Step Solution & Concept</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed overflow-x-auto">
                      <MathRenderer content={m.question.explanation.explanation} />
                    </div>
                    {m.question.explanation.trickFormula && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2 text-xs text-amber-300 mt-2">
                        <strong className="text-amber-200 block mb-0.5">⚡ UPSC Speed Formula / Trick:</strong>
                        <MathRenderer content={m.question.explanation.trickFormula} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Pedagogical Tutor Drawer */}
      {selectedAiQuestion && (
        <AiExplanationDrawer
          isOpen={!!selectedAiQuestion}
          onClose={() => setSelectedAiQuestion(null)}
          questionId={selectedAiQuestion.id}
          questionText={selectedAiQuestion.text}
        />
      )}
    </main>
  );
}
