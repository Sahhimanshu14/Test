'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Button,
  Badge,
  Card,
  MathRenderer,
  useToast,
} from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  Sparkles,
  BookOpen,
  Calculator,
  CheckCircle2,
  HelpCircle,
  Layers,
  X,
  Send,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export type ExplanationMode =
  | 'explain'
  | 'simple'
  | 'detailed'
  | 'why_correct'
  | 'why_wrong'
  | 'similar_question';

interface AiExplanationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionText: string;
  options?: Array<{ identifier: string; optionText: string; isCorrect?: boolean }>;
}

export function AiExplanationDrawer({
  isOpen,
  onClose,
  questionId,
  questionText,
  options,
}: AiExplanationDrawerProps) {
  const { addToast } = useToast();
  const [activeMode, setActiveMode] = useState<ExplanationMode>('explain');
  const [loading, setLoading] = useState(false);
  const [explanationData, setExplanationData] = useState<any | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [isMathValid, setIsMathValid] = useState(true);

  const MODES: Array<{
    id: ExplanationMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
  }> = [
    { id: 'explain', label: 'Explain This', icon: BookOpen, desc: 'Balanced conceptual overview' },
    { id: 'simple', label: 'Explain Simply', icon: Sparkles, desc: 'Plain-English intuitive concept' },
    { id: 'detailed', label: 'Detailed Solution', icon: Calculator, desc: 'Rigorous step-by-step KaTeX derivation' },
    { id: 'why_correct', label: 'Why Correct?', icon: CheckCircle2, desc: 'Direct justification of the key' },
    { id: 'why_wrong', label: 'Why Others Wrong?', icon: HelpCircle, desc: 'Distractor elimination breakdown' },
    { id: 'similar_question', label: 'Similar Practice', icon: Layers, desc: 'Generate twin practice problem' },
  ];

  const fetchExplanation = useCallback(
    async (mode: ExplanationMode, query?: string) => {
      if (!questionId) return;
      setLoading(true);
      setActiveMode(mode);

      try {
        const res: any = await apiClient.post('/ai/explain', {
          questionId,
          mode,
          query: query?.trim() || undefined,
        });

        setExplanationData(res.data);
        setIsMathValid(res.isMathValid ?? true);
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'AI Tutor Unavailable',
          description: err.message || 'Could not fetch explanation from AI service.',
        });
      } finally {
        setLoading(false);
      }
    },
    [questionId, addToast]
  );

  useEffect(() => {
    if (isOpen && questionId) {
      setExplanationData(null);
      setCustomQuery('');
      fetchExplanation('explain');
    }
  }, [isOpen, questionId, fetchExplanation]);

  const handleCustomQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    fetchExplanation(activeMode, customQuery);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-slate-950 border-l border-slate-800 text-slate-100">
        {/* Drawer Header */}
        <DrawerHeader className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DrawerTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  CDSPrep AI Study Tutor
                  <Badge variant="outline" className="text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-400">
                    Active Assistance
                  </Badge>
                </DrawerTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contextual pedagogical explanation • Official UPSC curriculum aligned
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close AI tutor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-4 pb-1 no-scrollbar">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => fetchExplanation(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                  title={m.desc}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </DrawerHeader>

        {/* Question Context Reference */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900/40 border-b border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
          <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="line-clamp-2">
            <span className="font-semibold text-white">Target Question: </span>
            <MathRenderer content={questionText} className="inline text-slate-300" />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">
                Synthesizing step-by-step conceptual walkthrough...
              </p>
            </div>
          ) : explanationData ? (
            <div className="space-y-6">
              {/* Key Concept Badge */}
              {explanationData.keyConcept && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Core Concept:</span>
                  <Badge variant="secondary" className="text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-800/40">
                    {explanationData.keyConcept}
                  </Badge>
                </div>
              )}

              {/* Main Explanation text */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                  Conceptual Breakdown
                </h4>
                <div className="text-sm text-slate-200 leading-relaxed">
                  <MathRenderer content={explanationData.explanation} />
                </div>
              </div>

              {/* Formula or Governing Rule */}
              {explanationData.formulaOrRule && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1.5">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="h-3.5 w-3.5" /> Governing Formula / Rule
                  </span>
                  <div className="text-sm font-mono text-amber-200">
                    <MathRenderer content={explanationData.formulaOrRule} />
                  </div>
                </div>
              )}

              {/* Step-by-Step Procedure */}
              {explanationData.stepByStep?.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Methodical Resolution Steps
                  </h4>
                  <div className="space-y-2">
                    {explanationData.stepByStep.map((step: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs text-slate-300"
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-emerald-400">
                          {idx + 1}
                        </span>
                        <div className="pt-0.5 leading-relaxed">
                          <MathRenderer content={step} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why Options Wrong (Distractor Elimination) */}
              {explanationData.whyOptionsWrong?.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    Distractor Elimination Analysis
                  </h4>
                  <div className="space-y-2">
                    {explanationData.whyOptionsWrong.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-rose-500/20 bg-rose-950/10 text-xs space-y-1"
                      >
                        <span className="font-black text-rose-400">Option [{item.option}]:</span>
                        <p className="text-slate-300">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Practice Question Card */}
              {explanationData.similarQuestion && (
                <Card className="p-4 sm:p-5 border-emerald-500/30 bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" /> Twin Practice Drill
                    </span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300">
                      AI Generated
                    </Badge>
                  </div>

                  <div className="text-xs sm:text-sm font-semibold text-white">
                    <MathRenderer content={explanationData.similarQuestion.questionText} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {explanationData.similarQuestion.options.map((opt: string, idx: number) => {
                      const idf = String.fromCharCode(65 + idx);
                      const isCorrect = idf === explanationData.similarQuestion.correctAnswer;
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                            isCorrect
                              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300'
                          }`}
                        >
                          <span>[{idf}] {opt}</span>
                          {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-emerald-500/20 pt-2 text-xs text-slate-300">
                    <strong className="text-emerald-400">Explanation: </strong>
                    <MathRenderer content={explanationData.similarQuestion.explanation} />
                  </div>
                </Card>
              )}

              {/* Safety / Reliability Notice */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <Info className="h-3 w-3 text-slate-400" /> CDSPrep Educational Integrity Note
                </p>
                <p>
                  AI explanations provide pedagogical guidance. Authoritative scoring, answer keys, and exam evaluations are governed strictly by deterministic UPSC verification.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select an explanation mode above to initiate AI assistance.
            </div>
          )}
        </div>

        {/* Custom Follow-Up Query Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <form onSubmit={handleCustomQuerySubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask a specific question about this problem..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !customQuery.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-3.5"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
