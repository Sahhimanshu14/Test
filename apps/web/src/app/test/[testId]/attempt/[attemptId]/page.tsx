'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../../../../components/auth-guard';
import {
  Button,
  Card,
  Badge,
  MathRenderer,
  QuestionPalette,
  ExamTimer,
} from '@cdsprep/ui';
import { apiClient } from '../../../../../lib/api-client';
import { QuestionPaletteState } from '@cdsprep/types';
import {
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Flag,
  Sparkles,
} from 'lucide-react';

interface QuestionOption {
  id: string;
  identifier: string;
  optionText: string;
}

interface ExamQuestion {
  id: string;
  questionText: string;
  marks: number;
  negativeMarks: number;
  options: QuestionOption[];
  sectionName?: string;
}

interface AttemptData {
  attempt: {
    id: string;
    status: string;
    expiresAt: string;
    startedAt: string;
    answers?: Array<{
      questionId: string;
      selectedOptionId: string | null;
      timeSpentSeconds: number;
    }>;
    questionStates?: Array<{
      questionId: string;
      state: QuestionPaletteState;
    }>;
  };
  test: {
    id: string;
    title: string;
    targetAcademy: string;
    durationMinutes: number;
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
          options: QuestionOption[];
        };
      }>;
    }>;
  };
}

export default function ExamAttemptPage() {
  return (
    <AuthGuard>
      <ExamAttemptContent />
    </AuthGuard>
  );
}

function ExamAttemptContent() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;
  const attemptId = params.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Candidate answers and palette state maps
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [paletteStates, setPaletteStates] = useState<Record<number, QuestionPaletteState>>({});
  const [antiCheatViolations, setAntiCheatViolations] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Time spent per question
  const questionStartTimeRef = useRef<number>(Date.now());

  // Load Attempt Session
  useEffect(() => {
    async function loadAttempt() {
      try {
        const response = await apiClient.post<AttemptData>('/attempts/start', {
          testId,
        });

        if (!response || !response.attempt) {
          throw new Error('Could not establish examination session');
        }

        const att = response.attempt;
        const tst = response.test;

        setTestTitle(tst.title);
        setExpiresAt(att.expiresAt);

        // Flatten questions from sections
        const flatQuestions: ExamQuestion[] = [];
        const sectionsList = Array.isArray(tst?.sections) ? tst.sections : [];
        sectionsList.forEach((sec) => {
          const tqList = Array.isArray(sec?.testQuestions) ? sec.testQuestions : [];
          tqList.forEach((tq) => {
            if (tq?.question) {
              flatQuestions.push({
                ...tq.question,
                sectionName: sec?.name || 'Section 1',
              });
            }
          });
        });

        setQuestions(flatQuestions);

        // Populate existing answers if resuming
        const initialAnswers: Record<string, string> = {};
        if (att.answers && att.answers.length > 0) {
          att.answers.forEach((ans) => {
            if (ans.selectedOptionId) {
              initialAnswers[ans.questionId] = ans.selectedOptionId;
            }
          });
          setSelectedOptions(initialAnswers);
        }

        // Populate initial palette states
        const initialStates: Record<number, QuestionPaletteState> = {};
        flatQuestions.forEach((q, idx) => {
          const matchingState = att.questionStates?.find((qs) => qs.questionId === q.id);
          if (matchingState) {
            initialStates[idx] = matchingState.state;
          } else if (initialAnswers[q.id]) {
            initialStates[idx] = QuestionPaletteState.ANSWERED;
          } else if (idx === 0) {
            initialStates[idx] = QuestionPaletteState.NOT_ANSWERED;
          } else {
            initialStates[idx] = QuestionPaletteState.UNVISITED;
          }
        });
        setPaletteStates(initialStates);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize examination');
      } finally {
        setLoading(false);
      }
    }

    if (testId) {
      loadAttempt();
    }
  }, [testId]);

  // Anti-Cheat & Integrity Telemetry
  useEffect(() => {
    if (!attemptId) return;

    const logEvent = async (eventType: string, metadata?: any) => {
      setAntiCheatViolations((prev) => prev + 1);
      try {
        await apiClient.post(`/attempts/${attemptId}/integrity-event`, {
          eventType,
          timestamp: new Date().toISOString(),
          metadata,
        });
      } catch {
        // Non-blocking telemetry
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        logEvent('TAB_HIDDEN');
      }
    };

    const handleBlur = () => {
      logEvent('WINDOW_BLUR');
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        logEvent('FULLSCREEN_EXIT');
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      logEvent('COPY_ATTEMPT');
    };

    const handlePaste = (e: ClipboardEvent) => {
      logEvent('PASTE_ATTEMPT');
    };

    const handleContextMenu = (e: MouseEvent) => {
      logEvent('CONTEXT_MENU');
    };

    const handleOffline = () => {
      logEvent('CONNECTION_LOST');
    };

    const handleOnline = () => {
      logEvent('RECONNECTED');
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreen);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [attemptId]);

  const currentQuestion = questions[currentIndex];

  // Helper to autosave response to server
  const saveCurrentAnswerToServer = useCallback(
    async (
      questionId: string,
      optionId: string | null,
      newState: QuestionPaletteState
    ) => {
      const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
      questionStartTimeRef.current = Date.now();

      try {
        await apiClient.put(`/attempts/${attemptId}/autosave`, {
          questionId,
          selectedOptionId: optionId,
          timeSpentSeconds: timeSpent,
          paletteState: newState,
        });
      } catch (err) {
        console.error('Autosave failed', err);
      }
    },
    [attemptId]
  );

  // Navigate to Question
  const handleNavigateQuestion = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= questions.length || newIndex === currentIndex) return;

    // Mark current question as NOT_ANSWERED if visited and not answered
    const currentQ = questions[currentIndex];
    const hasAnswer = currentQ ? Boolean(selectedOptions[currentQ.id]) : false;
    const currentState = paletteStates[currentIndex];

    if (!hasAnswer && currentState === QuestionPaletteState.UNVISITED) {
      setPaletteStates((prev) => ({
        ...prev,
        [currentIndex]: QuestionPaletteState.NOT_ANSWERED,
      }));
    }

    // Mark next question as NOT_ANSWERED if currently UNVISITED
    if (paletteStates[newIndex] === QuestionPaletteState.UNVISITED) {
      setPaletteStates((prev) => ({
        ...prev,
        [newIndex]: QuestionPaletteState.NOT_ANSWERED,
      }));
    }

    setCurrentIndex(newIndex);
    questionStartTimeRef.current = Date.now();
  };

  // Option selection toggle
  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    setSelectedOptions((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // "Save & Next" action: Optimistic navigation with background persistence
  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    const selectedOpt = selectedOptions[currentQuestion.id] || null;
    const newState = selectedOpt
      ? QuestionPaletteState.ANSWERED
      : QuestionPaletteState.NOT_ANSWERED;

    setPaletteStates((prev) => ({
      ...prev,
      [currentIndex]: newState,
    }));

    // Asynchronous non-blocking autosave
    saveCurrentAnswerToServer(currentQuestion.id, selectedOpt, newState);

    if (currentIndex < questions.length - 1) {
      handleNavigateQuestion(currentIndex + 1);
    }
  };

  // "Mark for Review & Next" action: Optimistic navigation with background persistence
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;
    const selectedOpt = selectedOptions[currentQuestion.id] || null;
    const newState = selectedOpt
      ? QuestionPaletteState.ANSWERED_AND_MARKED_FOR_REVIEW
      : QuestionPaletteState.MARKED_FOR_REVIEW;

    setPaletteStates((prev) => ({
      ...prev,
      [currentIndex]: newState,
    }));

    // Asynchronous non-blocking autosave
    saveCurrentAnswerToServer(currentQuestion.id, selectedOpt, newState);

    if (currentIndex < questions.length - 1) {
      handleNavigateQuestion(currentIndex + 1);
    }
  };

  // "Clear Response" action
  const handleClearResponse = async () => {
    if (!currentQuestion) return;
    setSelectedOptions((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });

    const newState = QuestionPaletteState.NOT_ANSWERED;
    setPaletteStates((prev) => ({
      ...prev,
      [currentIndex]: newState,
    }));

    await saveCurrentAnswerToServer(currentQuestion.id, null, newState);
  };

  // Final Submit Examination
  const handleSubmitExam = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(`/attempts/${attemptId}/submit`, {
        timeSpentSeconds: 0,
        antiCheatEvents: antiCheatViolations > 0 ? [{ type: 'WINDOW_BLUR', count: antiCheatViolations }] : [],
      });
      router.push(`/result/${attemptId}`);
    } catch (err: any) {
      console.error('Submission failed', err);
      // If already submitted or evaluated, navigate anyway
      router.push(`/result/${attemptId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Establishing Secure Examination Session...
          </p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900 p-6 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Examination Session Error</h2>
          <p className="text-sm text-slate-400">{error || 'No questions found for this test'}</p>
          <Button onClick={() => router.push('/tests')} className="w-full bg-emerald-500 text-slate-950 font-bold">
            Return to Mock Catalog
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Distraction-Free Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500 text-slate-950 font-black">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{testTitle}</h2>
              <span className="text-[11px] text-slate-400">
                Section: {currentQuestion?.sectionName || 'General'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {antiCheatViolations > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-950/60 border border-amber-800/40 px-2 py-1 text-[11px] text-amber-300 font-semibold">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                Tab switches: {antiCheatViolations}
              </span>
            )}

            {expiresAt && (
              <ExamTimer expiresAt={expiresAt} onExpire={handleSubmitExam} />
            )}

            <Button
              onClick={() => setShowSubmitModal(true)}
              className="h-9 px-4 font-bold bg-rose-600 hover:bg-rose-500 text-white text-xs shadow-md shadow-rose-950/50"
            >
              Finish Exam
            </Button>
          </div>
        </div>
      </header>

      {/* Main Examination Viewport */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Question Pane */}
        <section className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          {/* Question Meta Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-500/30 text-xs font-black text-emerald-400">
                {currentIndex + 1}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-950/60 border border-emerald-800/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                +{currentQuestion?.marks || 1} Marks
              </span>
              <span className="rounded bg-rose-950/60 border border-rose-800/30 px-2 py-0.5 text-[11px] font-bold text-rose-400">
                -{currentQuestion?.negativeMarks || 0.33} Neg
              </span>
            </div>
          </div>

          {/* Question Text with KaTeX */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-6 min-h-[160px]">
            {currentQuestion && (
              <MathRenderer
                content={currentQuestion.questionText}
                className="text-sm sm:text-base text-slate-100 font-medium"
              />
            )}
          </div>

          {/* Question Options */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select one option:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion?.options.map((option) => {
                const isSelected = selectedOptions[currentQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500 shadow-md shadow-emerald-950/30'
                        : 'border-slate-800 bg-slate-900/30 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-black'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {option.identifier}
                    </span>
                    <div className="flex-1 overflow-x-auto text-sm">
                      <MathRenderer content={option.optionText} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button Controls */}
          <div className="mt-auto pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResponse}
                className="h-10 border-slate-800 text-slate-400 hover:bg-slate-900 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear Response</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkForReviewAndNext}
                className="h-10 border-purple-500/30 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <Flag className="h-3.5 w-3.5 text-purple-400" />
                <span>Mark for Review & Next</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => handleNavigateQuestion(currentIndex - 1)}
                className="h-10 border-slate-800 text-slate-300 hover:bg-slate-900 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndNext}
                className="h-10 px-5 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
              >
                <span>Save & Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Right Palette Pane */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/60 p-4 lg:p-6 flex flex-col justify-between">
          <QuestionPalette
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            questionStates={paletteStates}
            onSelectQuestion={handleNavigateQuestion}
          />

          <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-3">
            <Button
              onClick={() => setShowSubmitModal(true)}
              className="w-full font-bold bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border border-slate-700 h-10 text-xs flex items-center justify-center gap-2 transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Entire Examination</span>
            </Button>
          </div>
        </aside>
      </main>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Finalize & Submit Test?</h3>
              <p className="text-xs text-slate-400">
                Review your question status summary below before final server submission.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-slate-400">Answered</span>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  {Object.keys(selectedOptions).length}
                </p>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-slate-400">Unattempted</span>
                <p className="text-base font-bold text-slate-400 mt-0.5">
                  {questions.length - Object.keys(selectedOptions).length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Continue Test
              </Button>
              <Button
                disabled={submitting}
                onClick={handleSubmitExam}
                className="flex-1 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
