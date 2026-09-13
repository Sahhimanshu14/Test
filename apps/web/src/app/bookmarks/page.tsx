'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { CadetNav } from '../../components/cadet-nav';
import { Button, Card, Badge, MathRenderer } from '@cdsprep/ui';
import { apiClient } from '../../lib/api-client';
import {
  Bookmark,
  Sparkles,
  Trash2,
  BookOpen,
  Search,
  Filter,
  Play,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BookmarkItem {
  id: string;
  questionId: string;
  notes: string | null;
  createdAt: string;
  question: {
    id: string;
    questionText: string;
    marks: number;
    negativeMarks: number;
    subject?: { id: string; name: string; slug: string };
    chapter?: { id: string; name: string; slug: string };
    topic?: { id: string; name: string; slug: string };
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

export default function BookmarksPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <CadetNav />
        <BookmarksContent />
      </div>
    </AuthGuard>
  );
}

function BookmarksContent() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookmarks = async () => {
    try {
      const data = await apiClient.get<BookmarkItem[]>('/bookmarks');
      setBookmarks(data || []);
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      await apiClient.delete(`/bookmarks/${questionId}`);
      setBookmarks((prev) => prev.filter((b) => b.questionId !== questionId));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  // Distinct subjects present in bookmarks
  const subjectList = Array.from(
    new Set(bookmarks.map((b) => b.question.subject?.name).filter(Boolean) as string[])
  );

  const filteredBookmarks = bookmarks.filter((bm) => {
    if (subjectFilter !== 'ALL' && bm.question.subject?.name !== subjectFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const inText = bm.question.questionText.toLowerCase().includes(query);
      const inTopic = bm.question.topic?.name.toLowerCase().includes(query);
      if (!inText && !inTopic) return false;
    }
    return true;
  });

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 p-6 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
              <Bookmark className="h-3.5 w-3.5" />
              <span>Cadet Question Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Saved Revision Questions
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              High-yield questions bookmarked during practice sessions and mock tests. Ideal for quick revision before your examination.
            </p>
          </div>

          {bookmarks.length > 0 && (
            <Link href="/practice?mode=BOOKMARKS" className="self-start md:self-auto flex-shrink-0">
              <Button className="h-10 px-5 font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40">
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>Practice Bookmarks ({bookmarks.length})</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        {bookmarks.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            {/* Subject Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSubjectFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  subjectFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({bookmarks.length})
              </button>
              {subjectList.map((subName) => {
                const count = bookmarks.filter((b) => b.question.subject?.name === subName).length;
                return (
                  <button
                    key={subName}
                    onClick={() => setSubjectFilter(subName)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      subjectFilter === subName
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {subName} ({count})
                  </button>
                );
              })}
            </div>

            {/* Keyword Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search saved questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bookmark className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Bookmarks Saved Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click the bookmark icon on any question in Practice Hub, 20-Year PYQs, or Mock Tests to save challenging problems here.
          </p>
          <div className="pt-2">
            <Link href="/practice">
              <Button size="sm" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs">
                Launch Practice Hub
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
          No saved questions match your search filters.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookmarks.map((bm, idx) => (
            <Card
              key={bm.id}
              className="border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-950/80 border border-amber-500/30 text-xs font-bold text-amber-400">
                    {idx + 1}
                  </span>
                  {bm.question.subject && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {bm.question.subject.name}
                    </span>
                  )}
                  {bm.question.topic && (
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      • {bm.question.topic.name}
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBookmark(bm.questionId)}
                  className="h-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 text-xs flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </Button>
              </div>

              <div className="text-sm sm:text-base font-medium text-slate-100">
                <MathRenderer content={bm.question.questionText} />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {bm.question.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-xs sm:text-sm ${
                      opt.isCorrect
                        ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300 font-semibold'
                        : 'border-slate-800 bg-slate-900/30 text-slate-300'
                    }`}
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-bold text-slate-200">
                      {opt.identifier}
                    </span>
                    <div className="flex-1 overflow-x-auto">
                      <MathRenderer content={opt.optionText} />
                    </div>
                    {opt.isCorrect && (
                      <span className="text-[11px] font-bold text-emerald-400 ml-auto">
                        Official Answer
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Step-by-Step KaTeX Explanation */}
              {bm.question.explanation && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Concept & Derivation</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed overflow-x-auto">
                    <MathRenderer content={bm.question.explanation.explanation} />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
