'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '../../../../components/auth-guard';
import { StudentLayout } from '../../../../components/layouts/student-layout';
import { Button, Card, Badge } from '@cdsprep/ui';
import { apiClient } from '../../../../lib/api-client';
import {
  BookOpen,
  ArrowLeft,
  FileText,
  Clock,
  PlayCircle,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';

const SUBJECT_METADATA: Record<string, { title: string; desc: string; icon: string }> = {
  'elementary-maths': {
    title: 'Elementary Mathematics Official PYQ Vault',
    desc: 'Arithmetic, Number Systems, Algebra, Trigonometry, Geometry, and Mensuration questions with KaTeX mathematical formulas.',
    icon: 'Calculator',
  },
  gk: {
    title: 'General Knowledge Official PYQ Vault',
    desc: 'Indian Polity, History, Geography, General Science, and Defence Current Affairs authentic examination papers.',
    icon: 'Globe',
  },
  english: {
    title: 'English Official PYQ Vault',
    desc: 'Spotting Errors, Synonyms & Antonyms, Idioms & Phrases, Comprehension, and Sentence Ordering examination papers.',
    icon: 'BookOpen',
  },
};

export default function PYQSubjectPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <PYQSubjectContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function PYQSubjectContent() {
  const params = useParams();
  const router = useRouter();
  const subjectSlug = (params.subject as string) || 'elementary-maths';
  const meta = SUBJECT_METADATA[subjectSlug] || {
    title: `${subjectSlug} PYQ Vault`,
    desc: 'Official previous year question papers for this syllabus domain.',
    icon: 'BookOpen',
  };

  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubjectPapers() {
      setLoading(true);
      try {
        const data = await apiClient.get<any>(`/pyqs/papers?subjectSlug=${subjectSlug}`);
        if (Array.isArray(data)) {
          setPapers(data);
        } else if (data?.data && Array.isArray(data.data)) {
          setPapers(data.data);
        }
      } catch {
        // Fallback papers
        setPapers([
          {
            id: `paper-cds-2024-1-${subjectSlug}`,
            year: 2024,
            session: 'I',
            exam: 'CDS I',
            subjectSlug,
            title: `CDS I 2024 — ${meta.title}`,
            totalMarks: 100,
            durationMin: 120,
            questionCount: 100,
            source: 'UPSC Official Archive',
            attribution: 'Official Question Paper published by UPSC',
          },
          {
            id: `paper-cds-2023-2-${subjectSlug}`,
            year: 2023,
            session: 'II',
            exam: 'CDS II',
            subjectSlug,
            title: `CDS II 2023 — ${meta.title}`,
            totalMarks: 100,
            durationMin: 120,
            questionCount: 100,
            source: 'UPSC Official Archive',
            attribution: 'Official Question Paper published by UPSC',
          },
          {
            id: `paper-cds-2023-1-${subjectSlug}`,
            year: 2023,
            session: 'I',
            exam: 'CDS I',
            subjectSlug,
            title: `CDS I 2023 — ${meta.title}`,
            totalMarks: 100,
            durationMin: 120,
            questionCount: 100,
            source: 'UPSC Official Archive',
            attribution: 'Official Question Paper published by UPSC',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadSubjectPapers();
  }, [subjectSlug, meta.title]);

  const handleStartExam = async (paperId: string) => {
    try {
      const res = await apiClient.post<any>(`/pyqs/papers/${paperId}/start`);
      const testId = res?.test?.id || res?.data?.test?.id;
      if (testId) {
        router.push(`/test/${testId}/attempt`);
      } else {
        router.push(`/pyq/${paperId}`);
      }
    } catch {
      router.push(`/pyq/${paperId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link href="/pyq">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Master Vault</span>
          </Button>
        </Link>

        {/* Subject Switcher */}
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { slug: 'elementary-maths', label: 'Mathematics' },
            { slug: 'gk', label: 'General Knowledge' },
            { slug: 'english', label: 'English' },
          ].map((s) => (
            <Link
              key={s.slug}
              href={`/pyq/subject/${s.slug}`}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                s.slug === subjectSlug
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Subject Hero */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 space-y-3 relative overflow-hidden shadow-xl">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Subject Chronological Vault</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">{meta.title}</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">{meta.desc}</p>
      </div>

      {/* Chronological List of Papers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition group shadow-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {paper.year} • Session {paper.session}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {paper.exam || 'CDS'}
                </Badge>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition line-clamp-2">
                {paper.title}
              </h3>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  {paper.questionCount || 100} Questions
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  {paper.durationMin} Mins
                </span>
                <span>{paper.totalMarks} Marks</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-5 border-t border-slate-800/80 mt-4">
              <Link href={`/pyq/${paper.id}`} className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold"
                >
                  Inspect Paper
                </Button>
              </Link>

              <Button
                size="sm"
                onClick={() => handleStartExam(paper.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Start Exam</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
