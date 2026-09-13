'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  Layers,
  PlusCircle,
  FolderTree,
  FileCheck,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface SubjectNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  orderIndex: number;
  chapters: {
    id: string;
    name: string;
    slug: string;
    orderIndex: number;
    topics: {
      id: string;
      name: string;
      slug: string;
      orderIndex: number;
      _count?: { questions: number };
    }[];
    _count?: { questions: number };
  }[];
  _count?: { questions: number; pyqPapers: number };
}

export default function AdminSubjectsPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <SubjectsManagementContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function SubjectsManagementContent() {
  const [taxonomy, setTaxonomy] = useState<SubjectNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState<string | null>(null);

  // Subject Form
  const [subjectName, setSubjectName] = useState('');
  const [subjectSlug, setSubjectSlug] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');

  // Chapter Form
  const [chapterName, setChapterName] = useState('');
  const [chapterSlug, setChapterSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTaxonomy = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<SubjectNode[]>('/admin/taxonomy');
      setTaxonomy(data || []);
    } catch {
      // Mock fallback if offline
      setTaxonomy([
        {
          id: 'sub-1',
          name: 'English',
          slug: 'english',
          description: 'UPSC CDS English: Vocabulary, Grammar, Reading Comprehension, Sentence Completion',
          orderIndex: 0,
          chapters: [
            { id: 'c-1', name: 'Vocabulary & Idioms', slug: 'vocabulary', orderIndex: 0, topics: [], _count: { questions: 120 } },
            { id: 'c-2', name: 'Grammar & Usage', slug: 'grammar', orderIndex: 1, topics: [], _count: { questions: 150 } },
          ],
          _count: { questions: 270, pyqPapers: 10 },
        },
        {
          id: 'sub-2',
          name: 'General Knowledge',
          slug: 'general-knowledge',
          description: 'History, Polity, Geography, General Science, Defence & Current Affairs',
          orderIndex: 1,
          chapters: [
            { id: 'c-3', name: 'Indian Polity & Constitution', slug: 'polity', orderIndex: 0, topics: [], _count: { questions: 180 } },
            { id: 'c-4', name: 'Modern Indian History', slug: 'history', orderIndex: 1, topics: [], _count: { questions: 140 } },
          ],
          _count: { questions: 320, pyqPapers: 10 },
        },
        {
          id: 'sub-3',
          name: 'Elementary Mathematics',
          slug: 'elementary-mathematics',
          description: 'Arithmetic, Algebra, Trigonometry, Geometry, Mensuration, Statistics',
          orderIndex: 2,
          chapters: [
            { id: 'c-5', name: 'Arithmetic', slug: 'arithmetic', orderIndex: 0, topics: [], _count: { questions: 220 } },
            { id: 'c-6', name: 'Trigonometry', slug: 'trigonometry', orderIndex: 1, topics: [], _count: { questions: 110 } },
          ],
          _count: { questions: 330, pyqPapers: 10 },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: subjectName,
          slug: subjectSlug,
          description: subjectDesc,
        }),
      });
      alert('Subject created successfully.');
      setShowAddSubjectModal(false);
      setSubjectName('');
      setSubjectSlug('');
      fetchTaxonomy();
    } catch (err: any) {
      alert(err.message || 'Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateChapter = async (subjectId: string) => {
    if (!chapterName.trim() || !chapterSlug.trim()) {
      alert('Name and slug are required');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/admin/chapters', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          name: chapterName,
          slug: chapterSlug,
        }),
      });
      alert('Chapter created successfully.');
      setShowAddChapterModal(null);
      setChapterName('');
      setChapterSlug('');
      fetchTaxonomy();
    } catch (err: any) {
      alert(err.message || 'Failed to create chapter');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-emerald-400" />
            <span>Syllabus Taxonomy: Subjects & Chapters</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize the core CDS syllabus hierarchy: Subject &rarr; Chapter &rarr; Topic &rarr; Questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTaxonomy}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddSubjectModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Subject</span>
          </Button>
        </div>
      </div>

      {/* Subjects Tree */}
      <div className="space-y-4">
        {taxonomy.map((sub) => (
          <Card key={sub.id} className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">{sub.name}</h2>
                  <span className="text-xs font-mono text-amber-400">/{sub.slug}</span>
                </div>
                {sub.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{sub.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold">
                  {sub._count?.questions ?? 0} Questions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddChapterModal(sub.id)}
                  className="text-xs border-slate-800 hover:border-amber-500/40 text-slate-300"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  <span>Add Chapter</span>
                </Button>
              </div>
            </div>

            {/* Chapters */}
            <div className="pl-4 space-y-2 border-l-2 border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Chapters in {sub.name} ({sub.chapters.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {sub.chapters.map((chap) => (
                  <div
                    key={chap.id}
                    className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{chap.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{chap.slug}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {chap._count?.questions ?? 0} Qs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Add New Subject</h2>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject Name</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    setSubjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  placeholder="e.g. Military Aptitude"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Slug</label>
                <input
                  type="text"
                  value={subjectSlug}
                  onChange={(e) => setSubjectSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={subjectDesc}
                  onChange={(e) => setSubjectDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSubjectModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
                  Save Subject
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Chapter Modal */}
      {showAddChapterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Add New Chapter</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Chapter Name</label>
                <input
                  type="text"
                  value={chapterName}
                  onChange={(e) => {
                    setChapterName(e.target.value);
                    setChapterSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  placeholder="e.g. Sentence Arrangement"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Slug</label>
                <input
                  type="text"
                  value={chapterSlug}
                  onChange={(e) => setChapterSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddChapterModal(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreateChapter(showAddChapterModal)}
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Save Chapter
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
