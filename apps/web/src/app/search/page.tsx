'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CadetNav } from '../../components/cadet-nav';
import { AuthGuard } from '../../components/auth-guard';
import { SearchResponse, SearchEntityType, SearchResultItem } from '@cdsprep/types';
import { api } from '../../lib/api';
import {
  Search as SearchIcon,
  Filter,
  BookOpen,
  FileCheck2,
  HelpCircle,
  Folder,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';

export default function GlobalSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading cadet search...
        </div>
      }
    >
      <GlobalSearchContent />
    </Suspense>
  );
}

function GlobalSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || '';
  const initialSubject = searchParams.get('subject') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResponse | null>(null);

  const executeSearch = async (q: string, type?: string, subject?: string, diff?: string) => {
    if (!q && !type && !subject) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (type) params.set('type', type);
      if (subject) params.set('subject', subject);
      if (diff) params.set('difficulty', diff);
      params.set('limit', '25');

      const data = await api.get<SearchResponse>(`/search?${params.toString()}`);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery || initialType || initialSubject) {
      executeSearch(initialQuery, initialType, initialSubject);
    }
  }, [initialQuery, initialType, initialSubject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, selectedType, selectedSubject, selectedDifficulty);
  };

  const getEntityBadge = (type: SearchEntityType) => {
    switch (type) {
      case SearchEntityType.QUESTION:
        return { label: 'Question', icon: HelpCircle, color: 'text-amber-400 bg-amber-950/60 border-amber-800/40' };
      case SearchEntityType.TOPIC:
        return { label: 'Topic', icon: Folder, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40' };
      case SearchEntityType.CHAPTER:
        return { label: 'Chapter', icon: Layers, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40' };
      case SearchEntityType.PYQ:
        return { label: 'PYQ Paper', icon: BookOpen, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40' };
      case SearchEntityType.MOCK_TEST:
        return { label: 'Mock Test', icon: FileCheck2, color: 'text-rose-400 bg-rose-950/60 border-rose-800/40' };
      default:
        return { label: String(type), icon: SearchIcon, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  const getEntityLink = (item: SearchResultItem) => {
    switch (item.entityType) {
      case SearchEntityType.QUESTION:
        return `/practice?mode=CUSTOM&difficulty=${item.difficulty || 'ALL'}`;
      case SearchEntityType.TOPIC:
      case SearchEntityType.CHAPTER:
        return `/practice?mode=TOPIC&topic=${encodeURIComponent(item.title)}`;
      case SearchEntityType.PYQ:
        return `/pyq/${item.id}`;
      case SearchEntityType.MOCK_TEST:
        return `/tests/${item.id}`;
      default:
        return '#';
    }
  };

  const entityTypeOptions: SearchEntityType[] = [
    SearchEntityType.QUESTION,
    SearchEntityType.TOPIC,
    SearchEntityType.CHAPTER,
    SearchEntityType.PYQ,
    SearchEntityType.MOCK_TEST,
  ];


  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <CadetNav />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 sm:p-8 mb-8 shadow-xl">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Global Cadet Tactical Search</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Search Questions, PYQs, Mock Tests & Topics
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Discover authentic UPSC CDS questions, chapters, PYQ archives, and full tests instantly with multi-facet filters.
              </p>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try 'trigonometry heights', 'fundamental rights', 'modern history', or '2023'..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <SearchIcon className="h-4 w-4" />
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSelectedType('');
                  executeSearch(query, '', selectedSubject, selectedDifficulty);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedType === ''
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Content
              </button>
              {entityTypeOptions.map((t: SearchEntityType) => (
                <button
                  key={t}
                  onClick={() => {
                    const next = selectedType === t ? '' : t;
                    setSelectedType(next);
                    executeSearch(query, next, selectedSubject, selectedDifficulty);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedType === t
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>


            <div className="flex items-center gap-3">
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  executeSearch(query, selectedType, e.target.value, selectedDifficulty);
                }}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Subjects</option>
                <option value="English">English</option>
                <option value="General Knowledge">General Knowledge</option>
                <option value="Elementary Mathematics">Elementary Mathematics</option>
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  executeSearch(query, selectedType, selectedSubject, e.target.value);
                }}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Search Results List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-4"></div>
              <p className="text-sm text-slate-400">Searching CDS question bank and exams...</p>
            </div>
          ) : results ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-400">
                  Showing <strong className="text-white">{results.results.length}</strong> of{' '}
                  <strong className="text-white">{results.total}</strong> results for &ldquo;
                  <span className="text-emerald-400">{results.query || 'All'}</span>&rdquo;
                </span>
              </div>

              {results.results.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
                  <HelpCircle className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                  <h3 className="text-base font-semibold text-white">No exact matching records found</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                    Try adjusting your search terms or clearing the subject/type filters to find what you need.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.results.map((item: SearchResultItem) => {
                    const badge = getEntityBadge(item.entityType);
                    const Icon = badge.icon;
                    const link = getEntityLink(item);

                    return (
                      <Link
                        key={`${item.entityType}-${item.id}`}
                        href={link}
                        className="group block rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5 hover:border-slate-700 hover:bg-slate-900/90 transition shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}
                              >
                                <Icon className="h-3 w-3" />
                                <span>{badge.label}</span>
                              </span>

                              {item.subject && (
                                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                                  {item.subject}
                                </span>
                              )}

                              {item.topic && (
                                <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-400">
                                  {item.topic}
                                </span>
                              )}

                              {item.year && (
                                <span className="rounded-md bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                                  CDS {item.year}
                                </span>
                              )}

                              {item.difficulty && (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    item.difficulty === 'HARD'
                                      ? 'bg-rose-950/50 text-rose-400 border border-rose-800/30'
                                      : item.difficulty === 'MEDIUM'
                                      ? 'bg-amber-950/50 text-amber-400 border border-amber-800/30'
                                      : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/30'
                                  }`}
                                >
                                  {item.difficulty}
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-emerald-400 transition line-clamp-1">
                              {item.title}
                            </h3>

                            {item.snippet && (
                              <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {item.snippet}
                              </p>
                            )}
                          </div>

                          <div className="hidden sm:flex items-center self-center text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-12 text-center">
              <SearchIcon className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <h3 className="text-sm font-semibold text-white">Enter a search keyword</h3>
              <p className="mt-1 text-xs text-slate-500">
                Type an exam subject, topic, formula, or year above to explore the entire repository.
              </p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
