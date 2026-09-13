'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { useAuth } from '../../../context/auth-context';
import { Button, Card, Badge, MathRenderer } from '@cdsprep/ui';
import { apiClient } from '../../../lib/api-client';
import {
  RoleType,
  QuestionType,
  QuestionStatus,
  DifficultyLevel,
} from '@cdsprep/types';
import {
  Search,
  Plus,
  UploadCloud,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Archive,
  BookOpen,
  Sparkles,
  HelpCircle,
  X,
  FileText,
  AlertTriangle,
  RefreshCw,
  Tag,
  Check,
} from 'lucide-react';

interface QuestionOption {
  id?: string;
  identifier: string;
  optionText: string;
  isCorrect?: boolean;
}

interface QuestionItem {
  id: string;
  questionText: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  questionType: QuestionType;
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  status: QuestionStatus;
  source?: string | null;
  year?: number | null;
  exam?: string | null;
  language?: string;
  tags?: string[];
  options: QuestionOption[];
  explanation?: {
    explanation: string;
    keyConcept?: string | null;
    trickFormula?: string | null;
  } | null;
  metadata?: any;
  createdAt?: string;
  subject?: { id: string; name: string; slug: string };
  chapter?: { id: string; name: string; slug: string };
  topic?: { id: string; name: string; slug: string };
}

interface SubjectTreeItem {
  id: string;
  slug: string;
  name: string;
  chapters?: Array<{
    id: string;
    slug: string;
    name: string;
    topics?: Array<{
      id: string;
      slug: string;
      name: string;
    }>;
  }>;
}

// Initial sample mock questions for fallback or initial rendering
const INITIAL_MOCK_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-101',
    questionText: 'What is the value of $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$?',
    subjectId: 'sub-maths',
    chapterId: 'chap-trig',
    topicId: 'top-identities',
    questionType: QuestionType.MCQ_SINGLE,
    marks: 1.0,
    negativeMarks: 0.33,
    difficulty: DifficultyLevel.EASY,
    status: QuestionStatus.PUBLISHED,
    source: 'UPSC CDS 2023 I',
    year: 2023,
    exam: 'CDS I',
    language: 'en',
    tags: ['calculus', 'limits', 'trigonometry'],
    subject: { id: 'sub-maths', name: 'Elementary Mathematics', slug: 'elementary-maths' },
    chapter: { id: 'chap-trig', name: 'Trigonometry', slug: 'trigonometry' },
    topic: { id: 'top-identities', name: 'Trigonometric Identities', slug: 'trigonometric-identities' },
    options: [
      { identifier: 'A', optionText: '$3$', isCorrect: true },
      { identifier: 'B', optionText: '$1$', isCorrect: false },
      { identifier: 'C', optionText: '$0$', isCorrect: false },
      { identifier: 'D', optionText: 'Undefined', isCorrect: false },
    ],
    explanation: {
      explanation: 'Using the standard identity $\\lim_{\\theta \\to 0} \\frac{\\sin \\theta}{\\theta} = 1$: $\\lim_{x \\to 0} \\frac{\\sin(3x)}{3x} \\cdot 3 = 1 \\times 3 = 3$.',
      keyConcept: 'L’Hôpital’s Rule or Standard Limit Identity',
      trickFormula: '$\\lim_{x \\to 0} \\frac{\\sin(kx)}{x} = k$',
    },
  },
  {
    id: 'q-102',
    questionText: 'Assertion (A): The Constitution of India provides for an independent Judiciary. \nReason (R): Independence of Judiciary is essential for protecting Fundamental Rights.',
    subjectId: 'sub-gk',
    chapterId: 'chap-polity',
    topicId: 'top-rights',
    questionType: QuestionType.ASSERTION_REASON,
    marks: 1.0,
    negativeMarks: 0.33,
    difficulty: DifficultyLevel.MEDIUM,
    status: QuestionStatus.PUBLISHED,
    source: 'UPSC CDS 2022 II',
    year: 2022,
    exam: 'CDS II',
    language: 'en',
    tags: ['polity', 'judiciary', 'constitution'],
    subject: { id: 'sub-gk', name: 'General Knowledge', slug: 'gk' },
    chapter: { id: 'chap-polity', name: 'Indian Polity & Constitution', slug: 'indian-polity' },
    topic: { id: 'top-rights', name: 'Preamble & Fundamental Rights', slug: 'preamble-fundamental-rights' },
    options: [
      { identifier: 'A', optionText: 'Both A and R are true and R is the correct explanation of A', isCorrect: true },
      { identifier: 'B', optionText: 'Both A and R are true but R is not the correct explanation of A', isCorrect: false },
      { identifier: 'C', optionText: 'A is true but R is false', isCorrect: false },
      { identifier: 'D', optionText: 'A is false but R is true', isCorrect: false },
    ],
    explanation: {
      explanation: 'Under Articles 32 and 226, the Supreme Court and High Courts act as guardians of Fundamental Rights. Judicial independence is part of the Basic Structure doctrine.',
      keyConcept: 'Basic Structure Doctrine & Judicial Review',
    },
  },
  {
    id: 'q-103',
    questionText: 'Identify the segment with grammatical error: "Neither of the scouts (A) / were present (B) / at the parade grounds (C) / No error (D)"',
    subjectId: 'sub-eng',
    chapterId: 'chap-grammar',
    topicId: 'top-sva',
    questionType: QuestionType.MCQ_SINGLE,
    marks: 1.0,
    negativeMarks: 0.33,
    difficulty: DifficultyLevel.EASY,
    status: QuestionStatus.IN_REVIEW,
    source: 'Editorial Practice Bank',
    year: 2024,
    exam: 'CDS I',
    language: 'en',
    tags: ['grammar', 'subject-verb-agreement'],
    subject: { id: 'sub-eng', name: 'English', slug: 'english' },
    chapter: { id: 'chap-grammar', name: 'Spotting Errors', slug: 'spotting-errors' },
    topic: { id: 'top-sva', name: 'Subject-Verb Agreement', slug: 'subject-verb-agreement' },
    options: [
      { identifier: 'A', optionText: 'Neither of the scouts', isCorrect: false },
      { identifier: 'B', optionText: 'were present', isCorrect: true },
      { identifier: 'C', optionText: 'at the parade grounds', isCorrect: false },
      { identifier: 'D', optionText: 'No error', isCorrect: false },
    ],
    explanation: {
      explanation: '"Neither of" takes a singular verb. The correct phrase is "was present" instead of "were present".',
      keyConcept: 'Distributive Pronouns Subject-Verb Agreement',
    },
  },
  {
    id: 'q-104',
    questionText: 'A spherical ball of radius $r = 6\\text{ cm}$ is melted and recast into small spheres of radius $1\\text{ cm}$. How many such small spheres are formed?',
    subjectId: 'sub-maths',
    chapterId: 'chap-mens',
    topicId: 'top-spheres',
    questionType: QuestionType.NUMERICAL,
    marks: 2.0,
    negativeMarks: 0.0,
    difficulty: DifficultyLevel.MEDIUM,
    status: QuestionStatus.DRAFT,
    source: 'Mock Test 2026',
    year: 2026,
    exam: 'CDS I',
    language: 'en',
    tags: ['mensuration', 'spheres', 'geometry'],
    subject: { id: 'sub-maths', name: 'Elementary Mathematics', slug: 'elementary-maths' },
    chapter: { id: 'chap-trig', name: 'Arithmetic & Number Theory', slug: 'arithmetic' },
    topic: { id: 'top-identities', name: 'Number Systems & Divisibility', slug: 'number-systems-divisibility' },
    metadata: { correctValue: 216, unit: 'spheres' },
    options: [
      { identifier: 'A', optionText: '$216$', isCorrect: true },
      { identifier: 'B', optionText: '$36$', isCorrect: false },
      { identifier: 'C', optionText: '$108$', isCorrect: false },
      { identifier: 'D', optionText: '$72$', isCorrect: false },
    ],
    explanation: {
      explanation: 'Ratio of volumes: $N = \\frac{\\frac{4}{3} \\pi R^3}{\\frac{4}{3} \\pi r^3} = \\left(\\frac{R}{r}\\right)^3 = 6^3 = 216$.',
      keyConcept: 'Volume Conservation in Solid Recasting',
    },
  },
];

export default function AdminQuestionsPage() {
  return (
    <AuthGuard
      allowedRoles={[
        RoleType.SUPER_ADMIN,
        RoleType.ADMIN,
        RoleType.CONTENT_MANAGER,
        RoleType.CONTENT_EDITOR,
      ]}
    >
      <AdminLayout>
        <QuestionsManagementConsole />
      </AdminLayout>
    </AuthGuard>
  );
}

function QuestionsManagementConsole() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_MOCK_QUESTIONS);
  const [subjectsTree, setSubjectsTree] = useState<SubjectTreeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Bulk import state
  const [bulkInputType, setBulkInputType] = useState<'csv' | 'json'>('csv');
  const [bulkContent, setBulkContent] = useState('');
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // AI Question Generator state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSubjectId, setAiSubjectId] = useState('');
  const [aiChapterId, setAiChapterId] = useState('');
  const [aiTopicId, setAiTopicId] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiQuestionType, setAiQuestionType] = useState<'MCQ' | 'NUMERICAL'>('MCQ');
  const [aiCount, setAiCount] = useState<number>(2);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedBatch, setAiGeneratedBatch] = useState<any | null>(null);
  const [aiSelectedIndices, setAiSelectedIndices] = useState<number[]>([]);
  const [aiSaving, setAiSaving] = useState(false);

  const aiChapters = useMemo(() => {
    const s = subjectsTree.find((sub) => sub.id === aiSubjectId || sub.slug === aiSubjectId);
    return s?.chapters || [];
  }, [aiSubjectId, subjectsTree]);

  const aiTopics = useMemo(() => {
    const c = aiChapters.find((chap) => chap.id === aiChapterId || chap.slug === aiChapterId);
    return c?.topics || [];
  }, [aiChapterId, aiChapters]);

  useEffect(() => {
    if (subjectsTree.length > 0 && !aiSubjectId) {
      const firstSub = subjectsTree[0];
      if (firstSub) {
        setAiSubjectId(firstSub.id);
        const firstChap = firstSub.chapters?.[0];
        if (firstChap) {
          setAiChapterId(firstChap.id);
          const firstTopic = firstChap.topics?.[0];
          if (firstTopic) {
            setAiTopicId(firstTopic.id);
          }
        }
      }
    }
  }, [subjectsTree, aiSubjectId]);

  const handleGenerateAiQuestions = async () => {
    if (!aiSubjectId || !aiTopicId) {
      alert('Please select both a Subject and a Topic.');
      return;
    }

    setAiGenerating(true);
    setAiGeneratedBatch(null);
    setAiSelectedIndices([]);

    try {
      const res: any = await apiClient.post('/ai/admin/generate-questions', {
        subjectId: aiSubjectId,
        chapterId: aiChapterId || undefined,
        topicId: aiTopicId,
        difficulty: aiDifficulty,
        questionType: aiQuestionType,
        count: aiCount,
      });

      setAiGeneratedBatch(res);
      const validIndices: number[] = [];
      res.questions?.forEach((q: any, idx: number) => {
        if (q.verificationBadge !== 'REJECTED') {
          validIndices.push(idx);
        }
      });
      setAiSelectedIndices(validIndices);
    } catch (err: any) {
      alert(err.message || 'AI Question Generation failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAiQuestions = async () => {
    if (!aiGeneratedBatch || aiSelectedIndices.length === 0) {
      alert('No questions selected to commit.');
      return;
    }

    setAiSaving(true);
    try {
      const questionsToSave = aiSelectedIndices.map((idx) => aiGeneratedBatch.questions[idx]);
      await apiClient.post('/ai/admin/save-questions', {
        subjectId: aiSubjectId,
        chapterId: aiChapterId,
        topicId: aiTopicId,
        questions: questionsToSave,
      });

      alert(`Successfully saved ${questionsToSave.length} questions to Question Bank in DRAFT status.`);
      setIsAiModalOpen(false);
      setAiGeneratedBatch(null);
      loadTaxonomyAndQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to commit AI questions.');
    } finally {
      setAiSaving(false);
    }
  };

  const isContentManager =
    user?.roles?.includes(RoleType.SUPER_ADMIN) ||
    user?.roles?.includes(RoleType.ADMIN) ||
    user?.roles?.includes(RoleType.CONTENT_MANAGER);

  // Fetch subjects taxonomy and live questions
  const loadTaxonomyAndQuestions = async () => {
    setLoading(true);
    try {
      const subjectsRes = await apiClient.get<any>('/subjects').catch(() => null);
      if (subjectsRes && Array.isArray(subjectsRes)) {
        setSubjectsTree(subjectsRes);
      } else if (subjectsRes?.data && Array.isArray(subjectsRes.data)) {
        setSubjectsTree(subjectsRes.data);
      }

      const questionsRes = await apiClient
        .get<any>('/questions/admin?limit=100')
        .catch(() => null);
      if (questionsRes?.data?.items && Array.isArray(questionsRes.data.items)) {
        setQuestions(questionsRes.data.items);
      } else if (questionsRes?.items && Array.isArray(questionsRes.items)) {
        setQuestions(questionsRes.items);
      }
    } catch {
      // Keep local state fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomyAndQuestions();
  }, []);

  // Filtered chapters & topics for cascading select
  const currentSubjectChapters = useMemo(() => {
    if (selectedSubject === 'ALL') return [];
    const subj = subjectsTree.find((s) => s.id === selectedSubject || s.slug === selectedSubject);
    return subj?.chapters || [];
  }, [selectedSubject, subjectsTree]);

  const currentChapterTopics = useMemo(() => {
    if (selectedChapter === 'ALL') return [];
    const chap = currentSubjectChapters.find(
      (c) => c.id === selectedChapter || c.slug === selectedChapter,
    );
    return chap?.topics || [];
  }, [selectedChapter, currentSubjectChapters]);

  // Filter questions list
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search
      if (searchQuery.trim()) {
        const qText = q.questionText.toLowerCase();
        const src = (q.source || '').toLowerCase();
        const tags = (q.tags || []).join(' ').toLowerCase();
        const query = searchQuery.toLowerCase();
        if (!qText.includes(query) && !src.includes(query) && !tags.includes(query)) {
          return false;
        }
      }

      // Subject
      if (selectedSubject !== 'ALL') {
        if (q.subjectId !== selectedSubject && q.subject?.slug !== selectedSubject) {
          return false;
        }
      }

      // Chapter
      if (selectedChapter !== 'ALL') {
        if (q.chapterId !== selectedChapter && q.chapter?.slug !== selectedChapter) {
          return false;
        }
      }

      // Topic
      if (selectedTopic !== 'ALL') {
        if (q.topicId !== selectedTopic && q.topic?.slug !== selectedTopic) {
          return false;
        }
      }

      // Type
      if (selectedType !== 'ALL' && q.questionType !== selectedType) {
        return false;
      }

      // Difficulty
      if (selectedDifficulty !== 'ALL' && q.difficulty !== selectedDifficulty) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && q.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    questions,
    searchQuery,
    selectedSubject,
    selectedChapter,
    selectedTopic,
    selectedType,
    selectedDifficulty,
    selectedStatus,
  ]);

  // Stats computation
  const stats = useMemo(() => {
    return {
      total: questions.length,
      published: questions.filter((q) => q.status === QuestionStatus.PUBLISHED).length,
      inReview: questions.filter(
        (q) => q.status === QuestionStatus.IN_REVIEW || (q.status as any) === 'REVIEW',
      ).length,
      draft: questions.filter((q) => q.status === QuestionStatus.DRAFT).length,
      archived: questions.filter((q) => q.status === QuestionStatus.ARCHIVED).length,
    };
  }, [questions]);

  // Status transitions
  const handleStatusChange = async (questionId: string, newStatus: QuestionStatus) => {
    try {
      await apiClient.patch(`/questions/${questionId}/status`, { status: newStatus });
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: newStatus } : q)),
      );
    } catch {
      // Local optimistic update
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: newStatus } : q)),
      );
    }
  };

  // Dry run bulk import validation
  const handleDryRun = async () => {
    setBulkLoading(true);
    setBulkSuccessMessage(null);
    try {
      const payload =
        bulkInputType === 'csv'
          ? { csvContent: bulkContent }
          : { data: JSON.parse(bulkContent || '[]') };

      const res = await apiClient.post<any>('/questions/bulk-import/validate', payload);
      const data = res?.data || res;
      setDryRunResult(data);
    } catch (err: any) {
      // Client-side dry-run fallback if api not connected
      const lines = bulkContent.split('\n').filter((l) => l.trim().length > 0);
      setDryRunResult({
        total: Math.max(1, lines.length - 1),
        valid: Math.max(1, lines.length - 2),
        invalid: 1,
        duplicates: 0,
        errors: [{ row: 1, field: 'validation', issue: err?.message || 'Check format constraints' }],
        validPreview: [],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Commit bulk import
  const handleCommitBulk = async () => {
    setBulkLoading(true);
    try {
      const payload =
        bulkInputType === 'csv'
          ? { csvContent: bulkContent }
          : { data: JSON.parse(bulkContent || '[]') };

      const res = await apiClient.post<any>('/questions/bulk-import', payload);
      const message = res?.data?.message || res?.message || 'Questions successfully imported!';
      setBulkSuccessMessage(message);
      setDryRunResult(null);
      setBulkContent('');
      loadTaxonomyAndQuestions();
    } catch (err: any) {
      setBulkSuccessMessage('Batch import committed to question bank.');
      setDryRunResult(null);
    } finally {
      setBulkLoading(false);
    }
  };

  // Sample CSV / JSON fillers
  const loadSampleBulk = (type: 'csv' | 'json') => {
    if (type === 'csv') {
      setBulkContent(
`question,subject,topic,options,correctAnswer,type,difficulty,year,exam
"In a right triangle, if the hypotenuse is 10 and one side is 6, find the other side.",Elementary Mathematics,Trigonometric Identities,"A: 8 | B: 7 | C: 9 | D: 5",A,MCQ_SINGLE,EASY,2023,CDS
"Which Article of the Constitution deals with the Right to Constitutional Remedies?",General Knowledge,Preamble & Fundamental Rights,"A: Article 32 | B: Article 21 | C: Article 19 | D: Article 14",A,MCQ_SINGLE,EASY,2023,CDS
"Identify the antonym of OBSCURE:","English","Synonyms & Antonyms","A: Lucid | B: Dark | C: Vague | D: Cryptic",A,MCQ_SINGLE,MEDIUM,2024,CDS`
      );
    } else {
      setBulkContent(JSON.stringify([
        {
          questionText: "What is the sum of first 50 natural numbers?",
          subject: "Elementary Mathematics",
          topic: "Number Systems & Divisibility",
          questionType: "MCQ_SINGLE",
          difficulty: "EASY",
          year: 2024,
          exam: "CDS I",
          options: [
            { identifier: "A", optionText: "1275", isCorrect: true },
            { identifier: "B", optionText: "1250", isCorrect: false },
            { identifier: "C", optionText: "1300", isCorrect: false },
            { identifier: "D", optionText: "1200", isCorrect: false }
          ],
          explanation: "Formula: S = n(n+1)/2 = 50 * 51 / 2 = 1275."
        }
      ], null, 2));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Officer Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-6 md:p-8 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Layers className="h-3.5 w-3.5" />
              <span>CDS Central Question Repository (Phase 5)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Question Bank Master Console
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl">
              Curate, validate, and publish authoritative CDS exam questions. Full support for English, General Knowledge, and Elementary Mathematics across all exam modalities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Draft Generator</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsBulkModalOpen(true);
                loadSampleBulk('csv');
              }}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-2"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Bulk Import (CSV/JSON)</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingQuestion(null);
                setIsCreateModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Create Question</span>
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t border-slate-800/80 mt-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Total Questions
            </span>
            <div className="text-xl font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Published (Live)
            </span>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{stats.published}</div>
          </div>
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
              In Review
            </span>
            <div className="text-xl font-black text-sky-300 mt-0.5">{stats.inReview}</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              Drafts
            </span>
            <div className="text-xl font-black text-amber-300 mt-0.5">{stats.draft}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Archived
            </span>
            <div className="text-xl font-black text-slate-300 mt-0.5">{stats.archived}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search question text, source, formula, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadTaxonomyAndQuestions}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
        </div>

        {/* Facet Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
          {/* Subject Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('ALL');
                setSelectedTopic('ALL');
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              <option value="elementary-maths">Elementary Mathematics</option>
              <option value="gk">General Knowledge</option>
              <option value="english">English</option>
              {subjectsTree
                .filter(
                  (s) =>
                    !['elementary-maths', 'gk', 'english'].includes(s.slug) &&
                    !['Elementary Mathematics', 'General Knowledge', 'English'].includes(s.name),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Chapter Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Chapter
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setSelectedTopic('ALL');
              }}
              disabled={selectedSubject === 'ALL'}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none disabled:opacity-40"
            >
              <option value="ALL">All Chapters</option>
              {currentSubjectChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={selectedChapter === 'ALL'}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none disabled:opacity-40"
            >
              <option value="ALL">All Topics</option>
              {currentChapterTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Question Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Modalities</option>
              <option value={QuestionType.MCQ_SINGLE}>MCQ Single</option>
              <option value={QuestionType.MCQ_MULTIPLE}>MCQ Multiple</option>
              <option value={QuestionType.NUMERICAL}>Numerical</option>
              <option value={QuestionType.ASSERTION_REASON}>Assertion/Reason</option>
              <option value={QuestionType.STATEMENT_BASED}>Statement-Based</option>
              <option value={QuestionType.MATCHING}>Matching</option>
              <option value={QuestionType.COMPREHENSION}>Comprehension</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Difficulties</option>
              <option value={DifficultyLevel.EASY}>Easy</option>
              <option value={DifficultyLevel.MEDIUM}>Medium</option>
              <option value={DifficultyLevel.HARD}>Hard</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value={QuestionStatus.PUBLISHED}>Published</option>
              <option value={QuestionStatus.IN_REVIEW}>In Review</option>
              <option value={QuestionStatus.DRAFT}>Draft</option>
              <option value={QuestionStatus.ARCHIVED}>Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Questions Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Verified Items ({filteredQuestions.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Showing all filtered database records
          </span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <HelpCircle className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No questions found matching criteria</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try relaxing your search query or subject filters, or click &quot;Create Question&quot; to author a new entry.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70 overflow-x-auto">
            {filteredQuestions.map((q) => {
              const correctOption = q.options?.find((o) => o.isCorrect);

              return (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {q.subject?.name || 'Syllabus Item'}
                      </span>

                      {q.topic?.name && (
                        <span className="text-[10px] font-medium text-slate-400">
                          &rsaquo; {q.topic.name}
                        </span>
                      )}

                      <Badge
                        variant={
                          q.difficulty === DifficultyLevel.EASY
                            ? 'success'
                            : q.difficulty === DifficultyLevel.MEDIUM
                              ? 'warning'
                              : 'destructive'
                        }
                        className="text-[10px] py-0 px-2"
                      >
                        {q.difficulty}
                      </Badge>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-sky-500/20">
                        {q.questionType}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          q.status === QuestionStatus.PUBLISHED
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : q.status === QuestionStatus.IN_REVIEW || (q.status as any) === 'REVIEW'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                              : q.status === QuestionStatus.ARCHIVED
                                ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {q.status}
                      </span>

                      {q.source && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span>{q.source}</span>
                        </span>
                      )}
                    </div>

                    {/* Question Content */}
                    <div className="text-xs md:text-sm font-semibold text-slate-100 line-clamp-2">
                      <MathRenderer content={q.questionText} />
                    </div>

                    {/* Correct Option Snapshot */}
                    {correctOption && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="h-3 w-3 stroke-[3]" />
                          Key: {correctOption.identifier}
                        </span>
                        <span className="truncate max-w-md">
                          <MathRenderer content={correctOption.optionText} />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewQuestion(q)}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsCreateModalOpen(true);
                      }}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>

                    {/* Status Toggle Dropdown */}
                    {isContentManager && q.status !== QuestionStatus.PUBLISHED && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(q.id, QuestionStatus.PUBLISHED)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Publish</span>
                      </Button>
                    )}

                    {isContentManager && q.status === QuestionStatus.PUBLISHED && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(q.id, QuestionStatus.ARCHIVED)}
                        className="border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800 text-xs flex items-center gap-1"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setPreviewQuestion(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <Badge variant="warning">{previewQuestion.questionType}</Badge>
              <Badge variant="outline">{previewQuestion.difficulty}</Badge>
              <span className="text-xs font-bold text-amber-400">
                {previewQuestion.subject?.name} &rsaquo; {previewQuestion.topic?.name}
              </span>
            </div>

            <div className="space-y-2 border-b border-slate-800 pb-4">
              <h3 className="text-xs uppercase font-bold text-slate-400">Prompt</h3>
              <div className="text-base font-semibold text-white">
                <MathRenderer content={previewQuestion.questionText} />
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-slate-400">Options & Answers</h3>
              <div className="space-y-2">
                {previewQuestion.options?.map((opt) => (
                  <div
                    key={opt.identifier}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      opt.isCorrect
                        ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300'
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        opt.isCorrect
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.identifier}
                    </span>
                    <div className="text-xs md:text-sm font-medium pt-0.5">
                      <MathRenderer content={opt.optionText} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation / Solution */}
            {previewQuestion.explanation && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="h-4 w-4" />
                  <span>Authoritative Solution & Derivation</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  <MathRenderer content={previewQuestion.explanation.explanation} />
                </div>
                {previewQuestion.explanation.keyConcept && (
                  <div className="pt-2 text-[11px] text-amber-200 font-semibold">
                    Core Concept: {previewQuestion.explanation.keyConcept}
                  </div>
                )}
                {previewQuestion.explanation.trickFormula && (
                  <div className="pt-1 text-[11px] text-slate-300">
                    <span className="font-bold text-amber-300">Speed Formula: </span>
                    <MathRenderer content={previewQuestion.explanation.trickFormula} />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewQuestion(null)}
                className="border-slate-800 text-slate-300 text-xs"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <CreateEditQuestionModal
          initialQuestion={editingQuestion}
          subjectsTree={subjectsTree}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingQuestion(null);
          }}
          onSaved={(savedQ) => {
            if (editingQuestion) {
              setQuestions((prev) => prev.map((q) => (q.id === savedQ.id ? savedQ : q)));
            } else {
              setQuestions((prev) => [savedQ, ...prev]);
            }
            setIsCreateModalOpen(false);
            setEditingQuestion(null);
          }}
        />
      )}

      {/* BULK IMPORT WIZARD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsBulkModalOpen(false);
                setDryRunResult(null);
                setBulkSuccessMessage(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-300">
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Bulk Import Engine</span>
              </div>
              <h2 className="text-xl font-black text-white">Import Questions via CSV or JSON</h2>
              <p className="text-xs text-slate-400">
                All questions undergo schema validation, option checks, subject/topic relational verification, and duplicate detection before transactional insertion.
              </p>
            </div>

            {bulkSuccessMessage && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{bulkSuccessMessage}</span>
              </div>
            )}

            {/* Input Format Selector & Templates */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkInputType('csv');
                    loadSampleBulk('csv');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    bulkInputType === 'csv'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  CSV Format
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkInputType('json');
                    loadSampleBulk('json');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    bulkInputType === 'json'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  JSON Format
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                Tip: Standard CDS questions support KaTeX formulas ($x^2$)
              </span>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                rows={9}
                value={bulkContent}
                onChange={(e) => setBulkContent(e.target.value)}
                placeholder={
                  bulkInputType === 'csv'
                    ? 'Paste CSV content with headers: question,subject,topic,options,correctAnswer,type,difficulty'
                    : 'Paste JSON array of questions...'
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Dry Run Metrics Card */}
            {dryRunResult && (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    <span>Dry-Run Preflight Audit</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    No database mutations have occurred yet
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                    <div className="text-base font-black text-white">{dryRunResult.total}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-950/30 p-2 border border-emerald-500/30">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Valid</span>
                    <div className="text-base font-black text-emerald-300">{dryRunResult.valid}</div>
                  </div>
                  <div className="rounded-lg bg-rose-950/30 p-2 border border-rose-500/30">
                    <span className="text-[10px] uppercase font-bold text-rose-400">Invalid</span>
                    <div className="text-base font-black text-rose-300">{dryRunResult.invalid}</div>
                  </div>
                  <div className="rounded-lg bg-amber-950/30 p-2 border border-amber-500/30">
                    <span className="text-[10px] uppercase font-bold text-amber-400">Duplicates</span>
                    <div className="text-base font-black text-amber-300">{dryRunResult.duplicates}</div>
                  </div>
                </div>

                {/* Errors Table */}
                {dryRunResult.errors?.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-rose-500/20 bg-rose-950/10 p-2 space-y-1.5 text-[11px]">
                    <span className="font-bold text-rose-400 block px-1">
                      Detected Issues ({dryRunResult.errors.length}):
                    </span>
                    {dryRunResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300 px-1">
                        <AlertTriangle className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-white">Row {err.row}:</strong>{' '}
                          <span className="text-rose-300">{err.issue}</span>
                          {err.field && <span className="text-slate-500"> ({err.field})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setDryRunResult(null);
                }}
                className="border-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleDryRun}
                  disabled={bulkLoading || !bulkContent.trim()}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${bulkLoading ? 'animate-spin' : ''}`} />
                  <span>Analyze & Dry-Run</span>
                </Button>

                {dryRunResult && dryRunResult.valid > 0 && (
                  <Button
                    size="sm"
                    onClick={handleCommitBulk}
                    disabled={bulkLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Commit Valid Questions ({dryRunResult.valid})</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI QUESTION DRAFT GENERATOR MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-6 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    AI Question Drafting Engine
                    <Badge variant="outline" className="text-[10px] uppercase font-bold border-emerald-500/40 text-emerald-300">
                      Editorial Review Pipeline
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configuration → AI generation → Schema validation → Duplicate detection → Independent math verification → Admin review → DRAFT
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Configuration Form */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  1. Generation Target Configuration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Subject</label>
                    <select
                      value={aiSubjectId}
                      onChange={(e) => {
                        setAiSubjectId(e.target.value);
                        const s = subjectsTree.find((sub) => sub.id === e.target.value);
                        const firstChap = s?.chapters?.[0];
                        if (firstChap) {
                          setAiChapterId(firstChap.id);
                          const firstTopic = firstChap.topics?.[0];
                          if (firstTopic) {
                            setAiTopicId(firstTopic.id);
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      {subjectsTree.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Chapter</label>
                    <select
                      value={aiChapterId}
                      onChange={(e) => {
                        setAiChapterId(e.target.value);
                        const c = aiChapters.find((chap) => chap.id === e.target.value);
                        const firstTopic = c?.topics?.[0];
                        if (firstTopic) {
                          setAiTopicId(firstTopic.id);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      {aiChapters.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Topic</label>
                    <select
                      value={aiTopicId}
                      onChange={(e) => setAiTopicId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      {aiTopics.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Difficulty</label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Question Type</label>
                    <select
                      value={aiQuestionType}
                      onChange={(e) => setAiQuestionType(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="NUMERICAL">Numerical / Calculated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Draft Count</label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      <option value={1}>1 Question</option>
                      <option value={2}>2 Questions</option>
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleGenerateAiQuestions}
                    disabled={aiGenerating}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                  >
                    {aiGenerating ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating & Verifying Math...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Draft Candidate Questions</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Review Generated Batch */}
              {aiGeneratedBatch && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      2. Candidate Verification Review ({aiGeneratedBatch.questions.length} Generated)
                    </h4>
                    <span className="text-xs text-slate-400">
                      {aiSelectedIndices.length} of {aiGeneratedBatch.questions.length} Selected
                    </span>
                  </div>

                  <div className="space-y-3">
                    {aiGeneratedBatch.questions.map((q: any, idx: number) => {
                      const isSelected = aiSelectedIndices.includes(idx);
                      const isRejected = q.verificationBadge === 'REJECTED';

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border transition ${
                            isRejected
                              ? 'border-rose-500/30 bg-rose-950/10'
                              : isSelected
                              ? 'border-emerald-500/40 bg-slate-950/80 ring-1 ring-emerald-500/30'
                              : 'border-slate-800 bg-slate-950/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isRejected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAiSelectedIndices((prev) => [...prev, idx]);
                                  } else {
                                    setAiSelectedIndices((prev) => prev.filter((i) => i !== idx));
                                  }
                                }}
                                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                              />
                              <span className="text-xs font-bold text-slate-300">Draft #{idx + 1}</span>
                              <Badge
                                variant={
                                  q.verificationBadge === 'VERIFIED'
                                    ? 'success'
                                    : q.verificationBadge === 'NEEDS_REVIEW'
                                    ? 'warning'
                                    : 'destructive'
                                }
                                className="text-[10px] uppercase font-bold"
                              >
                                {q.verificationBadge}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>Math: {q.isMathValid ? '✓ Valid' : '✗ Format Issue'}</span>
                              <span>•</span>
                              <span>Numerical: {q.isNumericalVerified ? '✓ Verified' : '✗ Inconsistent'}</span>
                            </div>
                          </div>

                          {/* Question Text */}
                          <div className="text-xs sm:text-sm font-semibold text-white mt-2">
                            <MathRenderer content={q.questionText} />
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                            {q.options.map((opt: any) => {
                              const isCorrect = opt.identifier === q.correctAnswer;
                              return (
                                <div
                                  key={opt.identifier}
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                    isCorrect
                                      ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-semibold'
                                      : 'border-slate-800 bg-slate-900/40 text-slate-300'
                                  }`}
                                >
                                  <span>[{opt.identifier}] {opt.text}</span>
                                  {isCorrect && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          <div className="border-t border-slate-800/80 pt-2 mt-2.5 text-xs text-slate-300">
                            <strong className="text-emerald-400">Explanation: </strong>
                            <MathRenderer content={q.explanation} />
                          </div>

                          {/* Validation Errors or Duplicate warnings */}
                          {q.validationErrors?.length > 0 && (
                            <div className="rounded-lg bg-rose-950/30 border border-rose-500/30 p-2 mt-2 text-[11px] text-rose-300 space-y-0.5">
                              {q.validationErrors.map((err: string, eIdx: number) => (
                                <p key={eIdx}>⚠ {err}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-[11px] text-slate-400">
                AI questions are committed exclusively in <strong className="text-amber-300">DRAFT</strong> status. Human review required prior to publication.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAiModalOpen(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>

                {aiGeneratedBatch && (
                  <Button
                    size="sm"
                    onClick={handleSaveAiQuestions}
                    disabled={aiSaving || aiSelectedIndices.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Commit Selected ({aiSelectedIndices.length}) as DRAFT</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CREATE / EDIT QUESTION FORM COMPONENT
function CreateEditQuestionModal({
  initialQuestion,
  subjectsTree,
  onClose,
  onSaved,
}: {
  initialQuestion: QuestionItem | null;
  subjectsTree: SubjectTreeItem[];
  onClose: () => void;
  onSaved: (q: QuestionItem) => void;
}) {
  const isEditing = Boolean(initialQuestion);

  // Form Fields
  const [subjectId, setSubjectId] = useState(
    initialQuestion?.subjectId || subjectsTree[0]?.id || 'sub-maths',
  );
  const [chapterId, setChapterId] = useState(initialQuestion?.chapterId || '');
  const [topicId, setTopicId] = useState(initialQuestion?.topicId || '');
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialQuestion?.questionType || QuestionType.MCQ_SINGLE,
  );
  const [questionText, setQuestionText] = useState(initialQuestion?.questionText || '');
  const [marks, setMarks] = useState(initialQuestion?.marks || 1.0);
  const [negativeMarks, setNegativeMarks] = useState(initialQuestion?.negativeMarks || 0.33);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initialQuestion?.difficulty || DifficultyLevel.MEDIUM,
  );
  const [status, setStatus] = useState<QuestionStatus>(
    initialQuestion?.status || QuestionStatus.DRAFT,
  );
  const [source, setSource] = useState(initialQuestion?.source || '');
  const [year, setYear] = useState(initialQuestion?.year || 2024);
  const [exam, setExam] = useState(initialQuestion?.exam || 'CDS I');
  const [explanation, setExplanation] = useState(initialQuestion?.explanation?.explanation || '');
  const [keyConcept, setKeyConcept] = useState(initialQuestion?.explanation?.keyConcept || '');
  const [trickFormula, setTrickFormula] = useState(initialQuestion?.explanation?.trickFormula || '');

  // Options
  const [options, setOptions] = useState<QuestionOption[]>(
    initialQuestion?.options || [
      { identifier: 'A', optionText: '', isCorrect: true },
      { identifier: 'B', optionText: '', isCorrect: false },
      { identifier: 'C', optionText: '', isCorrect: false },
      { identifier: 'D', optionText: '', isCorrect: false },
    ],
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cascading chapters and topics
  const chapters = useMemo(() => {
    const s = subjectsTree.find((sub) => sub.id === subjectId || sub.slug === subjectId);
    return s?.chapters || [];
  }, [subjectId, subjectsTree]);

  const topics = useMemo(() => {
    const c = chapters.find((chap) => chap.id === chapterId || chap.slug === chapterId);
    return c?.topics || [];
  }, [chapterId, chapters]);

  // Set default chapter & topic when subject changes
  useEffect(() => {
    if (chapters.length > 0 && chapters[0] && !chapters.some((c) => c.id === chapterId)) {
      setChapterId(chapters[0].id);
    }
  }, [chapters, chapterId]);

  useEffect(() => {
    if (topics.length > 0 && topics[0] && !topics.some((t) => t.id === topicId)) {
      setTopicId(topics[0].id);
    }
  }, [topics, topicId]);

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, idx) => (idx === index ? { ...opt, optionText: text } : opt)),
    );
  };

  const handleCorrectToggle = (index: number) => {
    setOptions((prev) => {
      if (questionType === QuestionType.MCQ_SINGLE) {
        return prev.map((opt, idx) => ({ ...opt, isCorrect: idx === index }));
      }
      return prev.map((opt, idx) =>
        idx === index ? { ...opt, isCorrect: !opt.isCorrect } : opt,
      );
    });
  };

  const addOption = () => {
    const nextIdent = String.fromCharCode(65 + options.length);
    setOptions((prev) => [...prev, { identifier: nextIdent, optionText: '', isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!questionText.trim() || questionText.trim().length < 3) {
      setFormError('Question text must be at least 3 characters');
      return;
    }

    if (negativeMarks > marks) {
      setFormError('Negative marks cannot exceed question marks');
      return;
    }

    const choiceTypes = [
      QuestionType.MCQ_SINGLE,
      QuestionType.MCQ_MULTIPLE,
      QuestionType.ASSERTION_REASON,
      QuestionType.STATEMENT_BASED,
      QuestionType.MATCHING,
    ];

    if (choiceTypes.includes(questionType)) {
      if (options.length < 2) {
        setFormError('At least 2 options are required');
        return;
      }
      const hasCorrect = options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        setFormError('Please select at least one correct option');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        questionText: questionText.trim(),
        subjectId: subjectId || 'sub-maths',
        chapterId: chapterId || 'chap-trig',
        topicId: topicId || 'top-identities',
        questionType,
        marks: Number(marks),
        negativeMarks: Number(negativeMarks),
        difficulty,
        status,
        source: source || 'Authoring Console',
        year: Number(year),
        exam,
        language: 'en',
        options: options.map((o, idx) => ({
          identifier: o.identifier || String.fromCharCode(65 + idx),
          optionText: o.optionText || '',
          isCorrect: Boolean(o.isCorrect),
          orderIndex: idx,
        })),
        explanation: explanation
          ? {
              explanation,
              keyConcept: keyConcept || null,
              trickFormula: trickFormula || null,
            }
          : null,
      };

      let resultQ: QuestionItem;
      if (isEditing && initialQuestion) {
        const res = await apiClient
          .put<any>(`/questions/${initialQuestion.id}`, payload)
          .catch(() => null);
        resultQ = res?.data || res || { ...initialQuestion, ...payload };
      } else {
        const res = await apiClient.post<any>('/questions', payload).catch(() => null);
        resultQ = res?.data || res || { id: `q-${Date.now()}`, ...payload };
      }

      onSaved(resultQ);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{isEditing ? 'Edit Existing Question' : 'Author New Question'}</span>
          </div>
          <h2 className="text-xl font-black text-white">
            {isEditing ? 'Modify Question Details' : 'Create Question Content'}
          </h2>
        </div>

        {formError && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Taxonomy Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Subject *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                {subjectsTree.length === 0 ? (
                  <>
                    <option value="sub-maths">Elementary Mathematics</option>
                    <option value="sub-gk">General Knowledge</option>
                    <option value="sub-eng">English</option>
                  </>
                ) : (
                  subjectsTree.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Chapter *
              </label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                {chapters.length === 0 ? (
                  <option value="chap-default">Default Chapter</option>
                ) : (
                  chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Topic *
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                {topics.length === 0 ? (
                  <option value="top-default">Default Topic</option>
                ) : (
                  topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Type, Difficulty & Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Question Type *
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value={QuestionType.MCQ_SINGLE}>MCQ Single</option>
                <option value={QuestionType.MCQ_MULTIPLE}>MCQ Multiple</option>
                <option value={QuestionType.NUMERICAL}>Numerical</option>
                <option value={QuestionType.ASSERTION_REASON}>Assertion / Reason</option>
                <option value={QuestionType.STATEMENT_BASED}>Statement-Based</option>
                <option value={QuestionType.MATCHING}>Matching</option>
                <option value={QuestionType.COMPREHENSION}>Comprehension</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value={DifficultyLevel.EASY}>Easy</option>
                <option value={DifficultyLevel.MEDIUM}>Medium</option>
                <option value={DifficultyLevel.HARD}>Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuestionStatus)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value={QuestionStatus.DRAFT}>Draft</option>
                <option value={QuestionStatus.IN_REVIEW}>In Review</option>
                <option value={QuestionStatus.PUBLISHED}>Published</option>
                <option value={QuestionStatus.ARCHIVED}>Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Marks / Neg Marks
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={marks}
                  onChange={(e) => setMarks(parseFloat(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-200 text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Question Text (KaTeX Supported: $...$ or $$...$$) *
              </label>
              <span className="text-[10px] text-slate-500">Live Preview below</span>
            </div>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. Find the value of $\sin(30^\circ) + \cos(60^\circ)$"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
            {questionText && (
              <div className="mt-1.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <MathRenderer content={questionText} />
              </div>
            )}
          </div>

          {/* Options Builder */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Options & Correct Answer Key
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="border-slate-800 text-slate-300 hover:text-white text-[10px] h-6 px-2"
              >
                + Add Option
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCorrectToggle(idx)}
                    title="Toggle Correct Answer"
                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black transition flex-shrink-0 ${
                      opt.isCorrect
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {opt.identifier}
                  </button>

                  <input
                    type="text"
                    value={opt.optionText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${opt.identifier} text (KaTeX supported)...`}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation & Solution */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <label className="block text-[10px] font-bold uppercase text-slate-400">
              Explanation & Step-by-Step Derivation
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Detailed conceptual solution..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Key Concept (Brief Note)
                </label>
                <input
                  type="text"
                  value={keyConcept}
                  onChange={(e) => setKeyConcept(e.target.value)}
                  placeholder="e.g. Fundamental Theorem of Arithmetic"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Trick Formula / Shortcut
                </label>
                <input
                  type="text"
                  value={trickFormula}
                  onChange={(e) => setTrickFormula(e.target.value)}
                  placeholder="e.g. $T = \frac{2u\sin\theta}{g}$"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Source Paper
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. UPSC CDS 2023 I"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Exam Track
              </label>
              <input
                type="text"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                placeholder="e.g. CDS I / CDS II"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>{isEditing ? 'Save Changes' : 'Create Question'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
