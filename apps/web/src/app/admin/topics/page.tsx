'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  FolderTree,
  PlusCircle,
  RefreshCw,
  Search,
  Layers,
  BookOpen,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface TopicItem {
  id: string;
  name: string;
  slug: string;
  chapterName: string;
  subjectName: string;
  orderIndex: number;
  questionCount: number;
}

export default function AdminTopicsPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <TopicsManagementContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function TopicsManagementContent() {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Topic Form
  const [topicName, setTopicName] = useState('');
  const [topicSlug, setTopicSlug] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [chaptersList, setChaptersList] = useState<{ id: string; name: string; subjectName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const taxonomy = await apiRequest<any[]>('/admin/taxonomy');
      const flattened: TopicItem[] = [];
      const chapList: { id: string; name: string; subjectName: string }[] = [];

      taxonomy.forEach((sub: any) => {
        sub.chapters.forEach((chap: any) => {
          chapList.push({ id: chap.id, name: chap.name, subjectName: sub.name });
          chap.topics.forEach((top: any) => {
            flattened.push({
              id: top.id,
              name: top.name,
              slug: top.slug,
              chapterName: chap.name,
              subjectName: sub.name,
              orderIndex: top.orderIndex,
              questionCount: top._count?.questions ?? 0,
            });
          });
        });
      });

      setTopics(flattened);
      setChaptersList(chapList);
      if (chapList.length > 0 && chapList[0]) setSelectedChapterId(chapList[0].id);
    } catch {
      // Mock fallback if offline
      setTopics([
        { id: 'top-1', name: 'Speed, Distance & Time', slug: 'speed-distance-time', chapterName: 'Arithmetic', subjectName: 'Elementary Mathematics', orderIndex: 0, questionCount: 45 },
        { id: 'top-2', name: 'Percentage & Profit/Loss', slug: 'percentage-profit-loss', chapterName: 'Arithmetic', subjectName: 'Elementary Mathematics', orderIndex: 1, questionCount: 60 },
        { id: 'top-3', name: 'Synonyms & Antonyms', slug: 'synonyms-antonyms', chapterName: 'Vocabulary & Idioms', subjectName: 'English', orderIndex: 0, questionCount: 75 },
        { id: 'top-4', name: 'Fundamental Rights & DPSP', slug: 'fundamental-rights', chapterName: 'Indian Polity & Constitution', subjectName: 'General Knowledge', orderIndex: 0, questionCount: 80 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/topics', {
        method: 'POST',
        body: JSON.stringify({
          chapterId: selectedChapterId,
          name: topicName,
          slug: topicSlug,
        }),
      });
      alert('Topic created successfully.');
      setShowAddModal(false);
      setTopicName('');
      setTopicSlug('');
      fetchTopics();
    } catch (err: any) {
      alert(err.message || 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTopics = topics.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.chapterName.toLowerCase().includes(search.toLowerCase()) ||
    t.subjectName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-sky-400" />
            <span>Granular Topic Taxonomy</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage granular learning topics for micro-analytics, targeted drills, and AI diagnostic mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTopics}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Topic</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter topics by name, chapter, or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Topics Grid */}
      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Topic Title</th>
                <th className="px-4 py-3 font-semibold">Parent Chapter</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold text-right">Question Bank Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTopics.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3">
                    <span className="font-bold text-white block">{t.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{t.slug}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    {t.chapterName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {t.subjectName}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-amber-400">{t.questionCount} Questions</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Create New Topic</h2>
            <form onSubmit={handleCreateTopic} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Parent Chapter</label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {chaptersList.map((chap) => (
                    <option key={chap.id} value={chap.id}>
                      {chap.subjectName} &gt; {chap.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Topic Name</label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => {
                    setTopicName(e.target.value);
                    setTopicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  placeholder="e.g. Quadratic Equations"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Slug</label>
                <input
                  type="text"
                  value={topicSlug}
                  onChange={(e) => setTopicSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
                  Save Topic
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
