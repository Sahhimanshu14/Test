'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import {
  Button,
  Card,
  Badge,
  MathRenderer,
  QuestionCard,
  OptionCard,
} from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  PracticeMode,
  DifficultyLevel,
} from '@cdsprep/types';
import {
  Sparkles,
  BookOpen,
  Layers,
  Flag,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Shuffle,
  ShieldCheck,
  Target,
  Sliders,
  History,
  PlayCircle,
  FileQuestion,
} from 'lucide-react';

interface QuestionOption {
  id: string;
  identifier: string;
  optionText: string;
  isCorrect?: boolean;
}

interface QuestionExplanation {
  id?: string;
  explanation: string;
  keyConcept?: string | null;
  trickFormula?: string | null;
}

interface PracticeQuestion {
  id: string;
  questionType: string;
  questionText: string;
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  subject?: { id: string; name: string; slug: string };
  chapter?: { id: string; name: string; slug: string };
  topic?: { id: string; name: string; slug: string };
  options: QuestionOption[];
  explanation?: QuestionExplanation | null;
}

interface PracticeAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  timeSpentSeconds: number;
  isMarkedForReview: boolean;
  orderIndex: number;
  question: PracticeQuestion;
}

interface PracticeSession {
  id: string;
  mode: PracticeMode;
  questionCount: number;
  randomize: boolean;
  timeLimitMinutes?: number | null;
  enableNegativeMarking: boolean;
  isCompleted: boolean;
  score: number;
  negativeMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  totalTimeSpentSeconds: number;
  startedAt: string;
  completedAt?: string | null;
}

interface TopicItem {
  id: string;
  name: string;
  slug: string;
}

interface ChapterItem {
  id: string;
  name: string;
  slug: string;
  topics?: TopicItem[];
}

interface SubjectItem {
  id: string;
  name: string;
  slug: string;
  chapters?: ChapterItem[];
}

interface PastSessionItem {
  id: string;
  mode: PracticeMode;
  isCompleted: boolean;
  score: number;
  correctCount: number;
  incorrectCount: number;
  questionCount: number;
  startedAt: string;
}

export default function PracticePage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <PracticeEngine />
      </StudentLayout>
    </AuthGuard>
  );
}

function PracticeEngine() {
  // Session State
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mode Selection & Configuration
  const [selectedMode, setSelectedMode] = useState<PracticeMode>(PracticeMode.ALL_QUESTIONS);
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [randomize, setRandomize] = useState<boolean>(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [enableNegativeMarking, setEnableNegativeMarking] = useState<boolean>(false);

  // Available Filter Options
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [history, setHistory] = useState<PastSessionItem[]>([]);

  // Memoized drill-down hierarchy
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId],
  );

  const availableChapters = useMemo(
    () => selectedSubject?.chapters || [],
    [selectedSubject],
  );

  const selectedChapter = useMemo(
    () => availableChapters.find((c) => c.id === selectedChapterId),
    [availableChapters, selectedChapterId],
  );

  const availableTopics = useMemo(
    () => selectedChapter?.topics || [],
    [selectedChapter],
  );

  // Current Question Interactivity
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, { isCorrect: boolean; correctOptionId?: string; explanation?: QuestionExplanation | null }>>({});
  const [evaluatingAnswer, setEvaluatingAnswer] = useState<boolean>(false);

  // Reporting Dialog
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('INCORRECT_ANSWER_KEY');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Palette drawer
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);

  // Completion Scorecard State
  const [completionMetrics, setCompletionMetrics] = useState<any | null>(null);

  // Elapsed Session Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const subRes = await apiClient.get<SubjectItem[]>('/subjects');
        setSubjects(subRes || []);

        const histRes = await apiClient.get<{ items: PastSessionItem[] }>('/practice/history?limit=5');
        setHistory(histRes?.items || []);
      } catch (err) {
        console.error('Failed to load practice metadata', err);
      }
    }
    loadMetadata();
  }, []);

  // Timer interval for active session
  useEffect(() => {
    if (!activeSession || activeSession.isCompleted) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const currentAnswer = answers[currentIndex];
  const currentQuestion = currentAnswer?.question;

  // Launch Practice Session
  const handleStartSession = async (modeToStart: PracticeMode) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        mode: modeToStart,
        questionCount,
        randomize,
        enableNegativeMarking,
      };

      if (selectedSubjectId) payload.subjectId = selectedSubjectId;
      if (selectedChapterId) payload.chapterId = selectedChapterId;
      if (selectedTopicId) payload.topicId = selectedTopicId;
      if (selectedDifficulty) payload.difficulty = selectedDifficulty;
      if (timeLimitMinutes) payload.timeLimitMinutes = timeLimitMinutes;

      // Ensure required IDs are populated for hierarchical drill-downs
      if (modeToStart === PracticeMode.SUBJECT && !payload.subjectId && subjects[0]?.id) {
        payload.subjectId = subjects[0].id;
      }
      if (modeToStart === PracticeMode.CHAPTER && !payload.chapterId) {
        if (availableChapters[0]?.id) {
          payload.chapterId = availableChapters[0].id;
        } else if (subjects[0]?.chapters?.[0]?.id) {
          payload.subjectId = subjects[0].id;
          payload.chapterId = subjects[0].chapters[0].id;
        }
      }
      if (modeToStart === PracticeMode.TOPIC && !payload.topicId) {
        if (availableTopics[0]?.id) {
          payload.topicId = availableTopics[0].id;
        } else if (subjects[0]?.chapters?.[0]?.topics?.[0]?.id) {
          payload.subjectId = subjects[0].id;
          payload.chapterId = subjects[0].chapters[0].id;
          payload.topicId = subjects[0].chapters[0].topics[0].id;
        }
      }

      const res = await apiClient.post<{ session: PracticeSession; answers: PracticeAnswer[] }>(
        '/practice/sessions',
        payload,
      );

      setActiveSession(res.session);
      setAnswers(res.answers);
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setConfigOpen(false);
      setCompletionMetrics(null);
      setRevealedSolutions({});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start practice drill');
    } finally {
      setLoading(false);
    }
  };

  // Submit / Select Option
  const handleSelectOption = async (optionId: string) => {
    if (!activeSession || !currentAnswer || !currentQuestion || activeSession.isCompleted) return;

    // Optimistic local update
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = {
      ...currentAnswer,
      selectedOptionId: optionId,
    };
    setAnswers(updatedAnswers);

    try {
      const evalRes = await apiClient.post<any>(
        `/practice/sessions/${activeSession.id}/answer`,
        {
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
          timeSpentSeconds: 5,
          isMarkedForReview: currentAnswer.isMarkedForReview,
        },
      );

      // Save revealed solution for instant learning
      setRevealedSolutions((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          isCorrect: evalRes.isCorrect,
          correctOptionId: evalRes.correctOptionId,
          explanation: evalRes.explanation,
        },
      }));
    } catch (err) {
      console.error('Failed to submit answer', err);
    }
  };

  // Clear current response
  const handleClearAnswer = async () => {
    if (!activeSession || !currentAnswer || !currentQuestion || activeSession.isCompleted) return;

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = {
      ...currentAnswer,
      selectedOptionId: null,
      isCorrect: null,
    };
    setAnswers(updatedAnswers);

    // Remove from revealed
    setRevealedSolutions((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });

    try {
      await apiClient.post(`/practice/sessions/${activeSession.id}/answer`, {
        questionId: currentQuestion.id,
        selectedOptionId: null,
        isMarkedForReview: currentAnswer.isMarkedForReview,
      });
    } catch (err) {
      console.error('Failed to clear answer', err);
    }
  };

  // Toggle Mark for Review
  const handleToggleReview = async () => {
    if (!activeSession || !currentAnswer || !currentQuestion) return;

    const newReview = !currentAnswer.isMarkedForReview;
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = {
      ...currentAnswer,
      isMarkedForReview: newReview,
    };
    setAnswers(updatedAnswers);

    try {
      await apiClient.post(`/practice/sessions/${activeSession.id}/answer`, {
        questionId: currentQuestion.id,
        selectedOptionId: currentAnswer.selectedOptionId,
        isMarkedForReview: newReview,
      });
    } catch (err) {
      console.error('Failed to update review state', err);
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = async () => {
    if (!currentQuestion) return;
    const isCurrently = Boolean(bookmarkedMap[currentQuestion.id]);

    setBookmarkedMap((prev) => ({
      ...prev,
      [currentQuestion.id]: !isCurrently,
    }));

    try {
      await apiClient.post('/bookmarks/toggle', {
        questionId: currentQuestion.id,
      });
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  // Submit Question Report
  const handleSubmitReport = async () => {
    if (!currentQuestion) return;
    try {
      await apiClient.post(`/practice/questions/${currentQuestion.id}/report`, {
        reason: reportReason,
        details: reportDetails,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 1500);
    } catch (err) {
      console.error('Failed to submit question report', err);
    }
  };

  // Finalize & Complete Session
  const handleCompleteSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await apiClient.post<any>(
        `/practice/sessions/${activeSession.id}/complete`,
        {},
      );
      setActiveSession(res.session);
      setAnswers(res.answers);
      setCompletionMetrics(res.metrics);
    } catch (err) {
      console.error('Failed to complete practice session', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // RENDER: Active Drill View
  // ----------------------------------------------------
  if (activeSession && currentQuestion) {
    const solution = revealedSolutions[currentQuestion.id] || (activeSession.isCompleted ? {
      isCorrect: currentAnswer.isCorrect ?? false,
      correctOptionId: currentQuestion.options.find(o => o.isCorrect)?.id,
      explanation: currentQuestion.explanation,
    } : null);

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Top Navigation & Status Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md sticky top-16 z-20 shadow-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to exit this drill? Your progress is saved.')) {
                  setActiveSession(null);
                }
              }}
              className="text-slate-400 hover:text-slate-100"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Exit Drill
            </Button>
            <Badge variant="secondary" className="bg-emerald-950/60 text-emerald-400 border-emerald-800/60">
              {activeSession.mode.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm font-semibold text-slate-300">
              Question {currentIndex + 1} of {answers.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-sm font-mono text-amber-400">
              <Clock className="w-4 h-4 text-amber-400/80" />
              {formatTimer(elapsedSeconds)}
            </div>

            {/* Quick Jump Palette Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaletteOpen(!paletteOpen)}
              className="relative"
            >
              <Layers className="w-4 h-4 mr-1.5 text-sky-400" />
              Palette
            </Button>

            {/* Complete Session Button */}
            {!activeSession.isCompleted ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleCompleteSession}
                className="bg-emerald-600 hover:bg-emerald-500 font-semibold"
              >
                Finish Drill
              </Button>
            ) : (
              <Badge variant="outline" className="text-emerald-400 border-emerald-700">
                Completed
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / answers.length) * 100}%` }}
          />
        </div>

        {/* Question Palette Drawer (Collapsible) */}
        {paletteOpen && (
          <Card className="p-4 bg-slate-900 border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Question Palette Overview
              </h4>
              <button
                onClick={() => setPaletteOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {answers.map((ans, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = ans.selectedOptionId !== null;
                const isMarked = ans.isMarkedForReview;

                let bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
                if (isCurrent) bgClass = 'ring-2 ring-emerald-400 bg-emerald-950 text-emerald-200 border-emerald-500 font-bold';
                else if (isAnswered && isMarked) bgClass = 'bg-amber-900/60 text-amber-200 border-amber-600';
                else if (isAnswered) bgClass = 'bg-emerald-900/50 text-emerald-200 border-emerald-700';
                else if (isMarked) bgClass = 'bg-amber-950 text-amber-300 border-amber-700';

                return (
                  <button
                    key={ans.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setPaletteOpen(false);
                    }}
                    className={`h-9 rounded-lg text-xs font-medium border flex items-center justify-center transition-all ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Main Question Card */}
        <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6">
          {/* Context Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {currentQuestion.subject && (
                <Badge variant="outline" className="border-slate-700 text-slate-300">
                  {currentQuestion.subject.name}
                </Badge>
              )}
              {currentQuestion.topic && (
                <Badge variant="outline" className="border-slate-800 text-slate-400">
                  {currentQuestion.topic.name}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  currentQuestion.difficulty === DifficultyLevel.HARD
                    ? 'border-rose-800 text-rose-400'
                    : currentQuestion.difficulty === DifficultyLevel.MEDIUM
                    ? 'border-amber-800 text-amber-400'
                    : 'border-emerald-800 text-emerald-400'
                }
              >
                {currentQuestion.difficulty}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                +{currentQuestion.marks} marks / -{activeSession.enableNegativeMarking ? currentQuestion.negativeMarks : '0.00'}
              </span>
            </div>
          </div>

          {/* Question Text with KaTeX */}
          <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
            <MathRenderer content={currentQuestion.questionText} />
          </div>

          {/* Options Grid */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = currentAnswer.selectedOptionId === opt.id;
              const isCorrectOption = solution?.correctOptionId === opt.id || (solution && opt.isCorrect);
              const isWrongSelection = solution && isSelected && !solution.isCorrect;

              let cardStyle = 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-200';
              if (solution) {
                if (isCorrectOption) {
                  cardStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow-emerald-950/50';
                } else if (isWrongSelection) {
                  cardStyle = 'border-rose-500 bg-rose-950/40 text-rose-200 shadow-rose-950/50';
                }
              } else if (isSelected) {
                cardStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-100 ring-1 ring-emerald-500/50';
              }

              return (
                <div
                  key={opt.id}
                  onClick={() => !activeSession.isCompleted && handleSelectOption(opt.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${cardStyle}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 ${
                      solution && isCorrectOption
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : solution && isWrongSelection
                        ? 'bg-rose-500 text-white font-bold'
                        : isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {opt.identifier}
                  </div>
                  <div className="text-sm sm:text-base flex-1">
                    <MathRenderer content={opt.optionText} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactivity Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              {currentAnswer.selectedOptionId && !activeSession.isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAnswer}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear Selection
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleReview}
                className={`text-xs ${
                  currentAnswer.isMarkedForReview
                    ? 'text-amber-400 border-amber-800 bg-amber-950/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flag className="w-3.5 h-3.5 mr-1" />
                {currentAnswer.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleBookmark}
                className={`text-xs ${
                  bookmarkedMap[currentQuestion.id]
                    ? 'text-amber-400 border-amber-800 bg-amber-950/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {bookmarkedMap[currentQuestion.id] ? (
                  <BookmarkCheck className="w-3.5 h-3.5 mr-1 text-amber-400" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 mr-1" />
                )}
                Bookmark
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportModalOpen(true)}
                className="text-xs text-slate-400 hover:text-rose-400 hover:border-rose-900"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Revealed Solution & Pedagogical Explanation */}
        {solution && (
          <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {solution.isCorrect ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Correct Answer (+{currentQuestion.marks} marks)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    Incorrect Answer ({activeSession.enableNegativeMarking ? `-${currentQuestion.negativeMarks}` : '0.00'})
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                Authoritative UPSC Solution
              </Badge>
            </div>

            {solution.explanation && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-300">
                  <MathRenderer content={solution.explanation.explanation} />
                </div>

                {solution.explanation.keyConcept && (
                  <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-lg text-xs text-sky-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-sky-300">Key Concept: </span>
                      {solution.explanation.keyConcept}
                    </div>
                  </div>
                )}

                {solution.explanation.trickFormula && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">Quick Shortcut: </span>
                      <MathRenderer content={solution.explanation.trickFormula} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="text-slate-300"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" />
            Previous
          </Button>

          <div className="text-xs text-slate-400">
            {currentIndex + 1} of {answers.length}
          </div>

          <Button
            variant="default"
            onClick={() => {
              if (currentIndex < answers.length - 1) {
                setCurrentIndex((prev) => prev + 1);
              } else {
                handleCompleteSession();
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {currentIndex < answers.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </>
            ) : (
              <>
                Finish Drill
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>

        {/* Completion Modal / Scorecard */}
        {completionMetrics && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="max-w-lg w-full p-6 sm:p-8 bg-slate-900 border-slate-800 text-center space-y-6 shadow-2xl">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-100">Practice Drill Completed!</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Authoritative score and performance evaluated by server.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xl font-bold text-emerald-400">{completionMetrics.netScore}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Net Score</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xl font-bold text-sky-400">{Math.round(completionMetrics.accuracyPercent)}%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Accuracy</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xl font-bold text-emerald-400">{completionMetrics.correctCount}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Correct</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xl font-bold text-rose-400">{completionMetrics.incorrectCount}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Incorrect</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCompletionMetrics(null)}
                  className="flex-1"
                >
                  Review Answers
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setActiveSession(null);
                    setCompletionMetrics(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  New Drill
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Question Reporting Modal */}
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-100 font-semibold">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Report Question Issue
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-300">
                    Report submitted successfully!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Issue Category
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="INCORRECT_ANSWER_KEY">Incorrect Answer Key</option>
                      <option value="QUESTION_AMBIGUOUS">Ambiguous Question Statement</option>
                      <option value="TYPO_FORMATTING">Formatting or LaTeX Error</option>
                      <option value="EXPLANATION_DISPUTE">Explanation Inaccurate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Description / Dispute Details
                    </label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Explain what seems incorrect or provide the correct derivation..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReportModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSubmitReport}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      Submit Report
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Mode Selection & Configuration Hub
  // ----------------------------------------------------
  const practiceModes = [
    {
      mode: PracticeMode.ALL_QUESTIONS,
      title: 'All Questions',
      desc: 'Broad, mixed question drills from the verified question bank.',
      icon: BookOpen,
      badge: 'Comprehensive',
      accent: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20',
    },
    {
      mode: PracticeMode.SUBJECT,
      title: 'Subject Focus',
      desc: 'Target English, General Knowledge, or Elementary Mathematics.',
      icon: Target,
      badge: 'Syllabus',
      accent: 'text-sky-400 border-sky-500/20 bg-sky-950/20',
    },
    {
      mode: PracticeMode.CHAPTER,
      title: 'Chapter Drills',
      desc: 'Drill deep into individual syllabus chapters for deep comprehension.',
      icon: Layers,
      badge: 'Structured',
      accent: 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20',
    },
    {
      mode: PracticeMode.TOPIC,
      title: 'Topic Mastery',
      desc: 'Micro-practice targeting specific conceptual topics.',
      icon: Sparkles,
      badge: 'Laser Focus',
      accent: 'text-purple-400 border-purple-500/20 bg-purple-950/20',
    },
    {
      mode: PracticeMode.DIFFICULTY,
      title: 'Difficulty Calibrated',
      desc: 'Filter strictly by Easy, Medium, or Hard questions.',
      icon: Sliders,
      badge: 'Targeted',
      accent: 'text-amber-400 border-amber-500/20 bg-amber-950/20',
    },
    {
      mode: PracticeMode.PYQ,
      title: 'Previous Year Questions',
      desc: 'Solve authentic questions from past UPSC CDS examinations.',
      icon: ShieldCheck,
      badge: 'Official UPSC',
      accent: 'text-teal-400 border-teal-500/20 bg-teal-950/20',
    },
    {
      mode: PracticeMode.BOOKMARKS,
      title: 'Bookmarks Revision',
      desc: 'Revisit high-yield questions you bookmarked for later review.',
      icon: BookmarkCheck,
      badge: 'Personalized',
      accent: 'text-blue-400 border-blue-500/20 bg-blue-950/20',
    },
    {
      mode: PracticeMode.MISTAKES,
      title: 'Mistake Drill',
      desc: 'Practice questions from your mistake notebook to achieve 100% mastery.',
      icon: RotateCcw,
      badge: 'High Yield',
      accent: 'text-rose-400 border-rose-500/20 bg-rose-950/20',
    },
    {
      mode: PracticeMode.CUSTOM,
      title: 'Custom Session',
      desc: 'Configure custom question count, timer, and negative marking rules.',
      icon: Sliders,
      badge: 'Configurable',
      accent: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-900/40 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge variant="outline" className="bg-emerald-950/80 text-emerald-400 border-emerald-800">
            Cadet Practice Engine
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-100">
            Active Question Practice & Mastery
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Select a practice mode to start an authoritative drill session. The server validates all answers, tracks your mistake notebook, and gives you instant step-by-step solutions.
          </p>
        </div>
      </div>

      {errorMsg && (
        <Card className="p-4 bg-rose-950/40 border-rose-800/80 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </Card>
      )}

      {/* Modes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Choose Practice Mode
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {practiceModes.map((item) => {
            const IconComp = item.icon;
            return (
              <Card
                key={item.mode}
                onClick={() => {
                  setSelectedMode(item.mode);
                  setConfigOpen(true);
                }}
                className="p-5 bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${item.accent}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                      {item.badge}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  Start Drill <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Configuration Modal */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Configure Practice Session
              </div>
              <button onClick={() => setConfigOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Question Count Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 30].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        questionCount === count
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {count} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              {(selectedMode === PracticeMode.SUBJECT ||
                selectedMode === PracticeMode.CHAPTER ||
                selectedMode === PracticeMode.TOPIC ||
                selectedMode === PracticeMode.CUSTOM) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setSelectedChapterId('');
                      setSelectedTopicId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Chapter Selection (for Chapter Drills, Topic Mastery, or Custom) */}
              {(selectedMode === PracticeMode.CHAPTER ||
                selectedMode === PracticeMode.TOPIC ||
                selectedMode === PracticeMode.CUSTOM) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Chapter
                  </label>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => {
                      setSelectedChapterId(e.target.value);
                      setSelectedTopicId('');
                    }}
                    disabled={!selectedSubjectId && availableChapters.length === 0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="">-- Choose Chapter --</option>
                    {availableChapters.map((chap) => (
                      <option key={chap.id} value={chap.id}>
                        {chap.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Topic Selection (for Topic Mastery or Custom) */}
              {(selectedMode === PracticeMode.TOPIC ||
                selectedMode === PracticeMode.CUSTOM) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Topic
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    disabled={!selectedChapterId && availableTopics.length === 0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="">-- Choose Topic --</option>
                    {availableTopics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Difficulty Selection */}
              {(selectedMode === PracticeMode.DIFFICULTY || selectedMode === PracticeMode.CUSTOM) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Difficulties</option>
                    <option value={DifficultyLevel.EASY}>Easy</option>
                    <option value={DifficultyLevel.MEDIUM}>Medium</option>
                    <option value={DifficultyLevel.HARD}>Hard</option>
                  </select>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Randomize Order</div>
                    <div className="text-[11px] text-slate-500">Shuffle question sequence</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomize}
                    onChange={(e) => setRandomize(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Negative Marking</div>
                    <div className="text-[11px] text-slate-500">Apply standard UPSC penalty on wrong answers</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableNegativeMarking}
                    onChange={(e) => setEnableNegativeMarking(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setConfigOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => handleStartSession(selectedMode)}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                {loading ? 'Launching...' : 'Begin Drill'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Past Drills History */}
      {history.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Recent Practice Sessions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((item) => (
              <Card key={item.id} className="p-4 bg-slate-900/60 border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    {item.mode.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-slate-500">
                    {new Date(item.startedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">{item.questionCount} Questions</span>
                  <span className="font-semibold text-emerald-400">Score: {item.score}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
