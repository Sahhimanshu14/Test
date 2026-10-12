'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { StudentLayout } from '../../components/layouts/student-layout';
import { Button, Card, Badge, PYQCard } from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  History,
  FileText,
  Clock,
  Sparkles,
  Filter,
  Layers,
  Search,
  BookOpen,
  Calendar,
  ArrowRight,
  ShieldCheck,
  PlayCircle,
  X,
  ExternalLink,
  Download,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

interface PYQPaperItem {
  id: string;
  year: number;
  session: string;
  exam: string;
  subjectSlug: string;
  title: string;
  totalMarks: number;
  durationMin: number;
  source?: string | null;
  licenseType?: string;
  attribution?: string | null;
  questionCount?: number;
  _count?: { questions: number };
  subject?: { id: string; name: string; slug: string; icon?: string };
}

const FALLBACK_PAPERS: PYQPaperItem[] = [
  // 1. English Papers
  {
    id: 'paper-cds-2024-2-eng',
    year: 2024,
    session: 'II',
    exam: 'CDS II',
    subjectSlug: 'english',
    title: 'UPSC CDS II (2024) — English Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 120,
    subject: { id: 's3', name: 'English', slug: 'english' },
  },
  {
    id: 'paper-cds-2024-1-eng',
    year: 2024,
    session: 'I',
    exam: 'CDS I',
    subjectSlug: 'english',
    title: 'UPSC CDS I (2024) — English Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 120,
    subject: { id: 's3', name: 'English', slug: 'english' },
  },
  {
    id: 'paper-cds-2023-2-eng',
    year: 2023,
    session: 'II',
    exam: 'CDS II',
    subjectSlug: 'english',
    title: 'UPSC CDS II (2023) — English Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 120,
    subject: { id: 's3', name: 'English', slug: 'english' },
  },
  // 2. General Knowledge (GS) Papers
  {
    id: 'paper-cds-2024-2-gk',
    year: 2024,
    session: 'II',
    exam: 'CDS II',
    subjectSlug: 'gk',
    title: 'UPSC CDS II (2024) — General Knowledge Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 120,
    subject: { id: 's2', name: 'General Knowledge', slug: 'gk' },
  },
  {
    id: 'paper-cds-2024-1-gk',
    year: 2024,
    session: 'I',
    exam: 'CDS I',
    subjectSlug: 'gk',
    title: 'UPSC CDS I (2024) — General Knowledge Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 120,
    subject: { id: 's2', name: 'General Knowledge', slug: 'gk' },
  },
  {
    id: 'paper-cds-2023-2-gk',
    year: 2023,
    session: 'II',
    exam: 'CDS II',
    subjectSlug: 'gk',
    title: 'UPSC CDS II (2023) — General Knowledge Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 120,
    subject: { id: 's2', name: 'General Knowledge', slug: 'gk' },
  },
  // 3. Mathematics Papers
  {
    id: 'paper-cds-2024-2-math',
    year: 2024,
    session: 'II',
    exam: 'CDS II',
    subjectSlug: 'elementary-maths',
    title: 'UPSC CDS II (2024) — Elementary Mathematics Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 100,
    subject: { id: 's1', name: 'Elementary Mathematics', slug: 'elementary-maths' },
  },
  {
    id: 'paper-cds-2024-1-math',
    year: 2024,
    session: 'I',
    exam: 'CDS I',
    subjectSlug: 'elementary-maths',
    title: 'UPSC CDS I (2024) — Elementary Mathematics Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 100,
    subject: { id: 's1', name: 'Elementary Mathematics', slug: 'elementary-maths' },
  },
  {
    id: 'paper-cds-2023-2-math',
    year: 2023,
    session: 'II',
    exam: 'CDS II',
    subjectSlug: 'elementary-maths',
    title: 'UPSC CDS II (2023) — Elementary Mathematics Official Paper',
    totalMarks: 100,
    durationMin: 120,
    source: 'Union Public Service Commission (UPSC)',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Government of India / UPSC. Section 52(1)(q) Indian Copyright Act.',
    questionCount: 100,
    subject: { id: 's1', name: 'Elementary Mathematics', slug: 'elementary-maths' },
  },
];

export default function PYQCatalogPage() {
  return (
    <AuthGuard>
      <StudentLayout>
        <PYQCatalogContent />
      </StudentLayout>
    </AuthGuard>
  );
}

function PYQCatalogContent() {
  const router = useRouter();
  const [papers, setPapers] = useState<PYQPaperItem[]>(FALLBACK_PAPERS);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Load real papers from API
  useEffect(() => {
    async function loadPapers() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedYear !== 'ALL') queryParams.append('year', selectedYear);
        if (selectedSubject !== 'ALL') queryParams.append('subjectSlug', selectedSubject);
        if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const data = await apiClient.get<any>(`/pyqs/papers${query}`);

        if (Array.isArray(data)) {
          setPapers(data);
        } else if (data?.data && Array.isArray(data.data)) {
          setPapers(data.data);
        }
      } catch {
        // Retain fallback data
      } finally {
        setLoading(false);
      }
    }
    loadPapers();
  }, [selectedYear, selectedSubject, searchQuery]);

  // Client-side search filtering fallback
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (selectedYear !== 'ALL' && String(p.year) !== selectedYear) return false;
      if (selectedSubject !== 'ALL' && p.subjectSlug !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSource = (p.source || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSource) return false;
      }
      return true;
    });
  }, [papers, selectedYear, selectedSubject, searchQuery]);

  // Distinct years present
  const availableYears = ['2024', '2023', '2022', '2021', '2020', '2019', '2018'];

  // Start test directly in authoritative engine
  const handleStartExam = async (paperId: string) => {
    try {
      const res = await apiClient.post<any>(`/pyqs/papers/${paperId}/start`);
      const attemptId = res?.attempt?.id || res?.data?.attempt?.id;
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 md:p-8 space-y-3 relative overflow-hidden shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Official UPSC Archive (2006 – 2026)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Previous Year Question Papers (PYQ Vault)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          Legally attributed, authentic UPSC Combined Defence Services examination papers. Practice under authoritative server-timed exam conditions or review step-by-step mathematical derivations.
        </p>

        {/* Quick Links: By Year & By Subject */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            Browse Collections:
          </span>
          <Link
            href="/pyq/year/2024"
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white transition flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>2024 Archive</span>
          </Link>
          <Link
            href="/pyq/year/2023"
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white transition flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>2023 Archive</span>
          </Link>
          <Link
            href="/pyq/subject/elementary-maths"
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white transition flex items-center gap-1"
          >
            <BookOpen className="h-3.5 w-3.5 text-sky-400" />
            <span>Mathematics Library</span>
          </Link>
          <Link
            href="/pyq/subject/gk"
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white transition flex items-center gap-1"
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>GK Library</span>
          </Link>
          <Link
            href="/pyq/subject/english"
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white transition flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5 text-purple-400" />
            <span>English Library</span>
          </Link>
        </div>
      </div>

      {/* Official 20-Year PYQ Books & Verified Answer Keys Vault */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-400" />
              <span>Official 20-Year PYQ Books & Verified Answer Keys</span>
            </h2>
            <p className="text-xs text-slate-400">
              Download complete, chapter-wise question booklets and verified UPSC answer keys for offline preparation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Full Offline PDF Suite</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. English PYQ Card */}
          <Card className="p-5 border-slate-800 bg-gradient-to-b from-slate-900/90 to-purple-950/20 space-y-4 relative overflow-hidden group hover:border-purple-500/40 transition shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">English PYQ Archive</h3>
                  <p className="text-[11px] text-purple-300 font-semibold">2,211+ Questions • 14 Chapters</p>
                </div>
              </div>
              <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[10px]">
                Official UPSC
              </Badge>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2">
              Spotting Errors, Synonyms & Antonyms, Idioms, Sentence Completion, Cloze Tests & Reading Passages.
            </p>

            <div className="space-y-2 pt-1 border-t border-slate-800/60">
              <a
                href="/api/pyq/download/english"
                download="CDS_English_Chapterwise_PYQ.pdf"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition shadow-md"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Question Book (PDF)</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/api/pyq/download/english-key"
                  download="CDS_English_Chapterwise_Answer_Key.pdf"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition"
                >
                  <CheckCircle2 className="h-3 w-3 text-purple-400" />
                  <span>Answer Key</span>
                </a>
                <a
                  href="/api/pyq/download/raw-english"
                  download="UPSC_CDS_English_Official_Archive_Raw.pdf"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white transition"
                  title="Original 294 MB Scanned Book"
                >
                  <HardDrive className="h-3 w-3" />
                  <span>Raw Scan</span>
                </a>
              </div>
            </div>
          </Card>

          {/* 2. General Knowledge (GS) PYQ Card */}
          <Card className="p-5 border-slate-800 bg-gradient-to-b from-slate-900/90 to-amber-950/20 space-y-4 relative overflow-hidden group hover:border-amber-500/40 transition shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">GS / GK PYQ Archive</h3>
                  <p className="text-[11px] text-amber-300 font-semibold">Official UPSC Papers • 4 Pillars</p>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
                Official UPSC
              </Badge>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2">
              Indian Polity & Constitution, Indian History & Freedom Struggle, Physical & Indian Geography, Science & Defence.
            </p>

            <div className="space-y-2 pt-1 border-t border-slate-800/60">
              <a
                href="/api/pyq/download/gs"
                download="CDS_GS_Chapterwise_PYQ.pdf"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Question Book (PDF)</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/api/pyq/download/gs-key"
                  download="CDS_GS_Chapterwise_Answer_Key.pdf"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <CheckCircle2 className="h-3 w-3 text-amber-400" />
                  <span>Answer Key</span>
                </a>
                <a
                  href="/api/pyq/download/raw-gs"
                  download="UPSC_CDS_GS_Official_Archive_Raw.pdf"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white transition"
                  title="Original 508 MB Scanned Book"
                >
                  <HardDrive className="h-3 w-3" />
                  <span>Raw Scan</span>
                </a>
              </div>
            </div>
          </Card>

          {/* 3. Elementary Mathematics PYQ Card */}
          <Card className="p-5 border-slate-800 bg-gradient-to-b from-slate-900/90 to-emerald-950/20 space-y-4 relative overflow-hidden group hover:border-emerald-500/40 transition shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Math PYQ Archive</h3>
                  <p className="text-[11px] text-emerald-300 font-semibold">2,799+ Questions • 13 Chapters</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                Official UPSC
              </Badge>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2">
              Number Theory, Arithmetic, Algebra, Polynomials, Trigonometry, Geometry, Mensuration & Statistics.
            </p>

            <div className="space-y-2 pt-1 border-t border-slate-800/60">
              <a
                href="/api/pyq/download/math"
                download="CDS_Math_Chapterwise_PYQ.pdf"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-md"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Question Book (PDF)</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/api/pyq/download/math-key"
                  download="CDS_Math_Chapterwise_Answer_Key.pdf"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Answer Key</span>
                </a>
                <a
                  href="/api/pyq/download/raw-math"
                  download="UPSC_CDS_Math_Official_Archive_Raw.pdf"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white transition"
                  title="Original 416 MB Scanned Book"
                >
                  <HardDrive className="h-3 w-3" />
                  <span>Raw Scan</span>
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search paper title, session, or source citation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
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

          {/* Subject Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { slug: 'ALL', label: 'All Subjects' },
              { slug: 'elementary-maths', label: 'Mathematics' },
              { slug: 'gk', label: 'General Knowledge' },
              { slug: 'english', label: 'English' },
            ].map((s) => (
              <button
                key={s.slug}
                onClick={() => setSelectedSubject(s.slug)}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  selectedSubject === s.slug
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Year Filter Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
            <Calendar className="h-3 w-3 text-emerald-400" />
            Filter Year:
          </span>
          <button
            onClick={() => setSelectedYear('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition flex-shrink-0 ${
              selectedYear === 'ALL'
                ? 'bg-slate-800 text-white font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Years
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition flex-shrink-0 ${
                selectedYear === yr
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </Card>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <Layers className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No PYQ Papers Matching Filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try resetting your year or subject selection to view other official archives.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper) => {
            const count = paper.questionCount || paper._count?.questions || 100;

            return (
              <div
                key={paper.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {paper.year} • Session {paper.session}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {paper.subject?.name || paper.subjectSlug}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {paper.exam}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition line-clamp-2">
                    {paper.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                      {count} Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {paper.durationMin} Mins
                    </span>
                    <span>{paper.totalMarks} Marks</span>
                  </div>

                  {paper.attribution && (
                    <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 line-clamp-1">
                      Source: {paper.attribution}
                    </div>
                  )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
