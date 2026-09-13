'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  BookOpen,
  PlusCircle,
  ShieldCheck,
  CheckCircle,
  XCircle,
  ExternalLink,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface PYQPaperItem {
  id: string;
  year: number;
  session: string;
  exam: string;
  subjectSlug: string;
  title: string;
  totalMarks: number;
  durationMin: number;
  isPublished: boolean;
  source: string;
  licenseType: string;
  attribution: string;
  _count?: { questions: number };
}

export default function AdminPyqPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <AdminPyqContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function AdminPyqContent() {
  const [papers, setPapers] = useState<PYQPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [year, setYear] = useState('2023');
  const [session, setSession] = useState('CDS-I');
  const [subjectSlug, setSubjectSlug] = useState('english');
  const [title, setTitle] = useState('UPSC CDS (I) 2023 English Official Paper');
  const [totalMarks, setTotalMarks] = useState('100');
  const [durationMin, setDurationMin] = useState('120');
  const [source, setSource] = useState('Union Public Service Commission');
  const [licenseType, setLicenseType] = useState('PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS');
  const [attribution, setAttribution] = useState('Official examination paper conducted by Union Public Service Commission (UPSC). Reproduced for academic training and exam preparation under fair use / public domain government gazette.');
  const [submitting, setSubmitting] = useState(false);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: PYQPaperItem[] }>('/pyqs/admin/papers');
      setPapers(res.items || []);
    } catch {
      // Mock fallback data if offline
      setPapers([
        {
          id: 'pyq-paper-01',
          year: 2023,
          session: 'CDS-I',
          exam: 'CDS',
          subjectSlug: 'english',
          title: 'UPSC CDS (I) 2023 English Official Paper',
          totalMarks: 100,
          durationMin: 120,
          isPublished: true,
          source: 'UPSC Official',
          licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
          attribution: 'Official UPSC Paper',
          _count: { questions: 120 },
        },
        {
          id: 'pyq-paper-02',
          year: 2023,
          session: 'CDS-I',
          exam: 'CDS',
          subjectSlug: 'general-knowledge',
          title: 'UPSC CDS (I) 2023 General Knowledge Official Paper',
          totalMarks: 100,
          durationMin: 120,
          isPublished: false,
          source: 'UPSC Official',
          licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
          attribution: 'Official UPSC Paper',
          _count: { questions: 85 },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/pyqs/papers', {
        method: 'POST',
        body: JSON.stringify({
          year: parseInt(year, 10),
          session,
          subjectSlug,
          title,
          totalMarks: parseFloat(totalMarks),
          durationMin: parseInt(durationMin, 10),
          source,
          licenseType,
          attribution,
        }),
      });

      alert('PYQ Paper record created successfully.');
      setShowCreateModal(false);
      fetchPapers();
    } catch (err: any) {
      alert(err.message || 'Failed to create PYQ Paper');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (paperId: string) => {
    try {
      await apiRequest(`/pyqs/papers/${paperId}/publish`, { method: 'PATCH' });
      fetchPapers();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle publication status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-purple-400" />
            <span>20-Year PYQ Paper Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build authentic past papers with mandatory legal provenance, license compliance, and question sequence mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPapers}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New PYQ Paper</span>
          </Button>
        </div>
      </div>

      {/* Legal & Compliance Notice */}
      <Card className="p-4 border-slate-800 bg-slate-900/60 flex items-start gap-3">
        <Scale className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-slate-200">Legal Provenance Guarantee:</span>
          <p className="text-slate-400">
            All papers must link to authorized government public records or legally obtained datasets. Commercial proprietary scrapers are strictly banned.
          </p>
        </div>
      </Card>

      {/* Papers Table */}
      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Paper Title</th>
                <th className="px-4 py-3 font-semibold">Year / Session</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Questions Mapped</th>
                <th className="px-4 py-3 font-semibold">Legal License</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading PYQ papers...</span>
                  </td>
                </tr>
              ) : papers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No PYQ papers found.
                  </td>
                </tr>
              ) : (
                papers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{p.title}</div>
                      <div className="text-[11px] text-slate-500">{p.source}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-amber-400">{p.year}</span>
                      <span className="text-[10px] text-slate-400 block">{p.session}</span>
                    </td>
                    <td className="px-4 py-3 capitalize font-semibold text-slate-300">
                      {p.subjectSlug.replace('-', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{p._count?.questions ?? 0}</span>
                      <span className="text-[10px] text-slate-500 block">/ {p.totalMarks} Marks</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                        {p.licenseType.slice(0, 15)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.isPublished ? (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                          RELEASED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
                          DRAFT
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/pyq/${p.id}`} target="_blank">
                          <Button variant="ghost" size="sm" className="text-xs text-slate-300">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublish(p.id)}
                          className={`text-xs ${
                            p.isPublished
                              ? 'border-slate-800 text-slate-400 hover:text-white'
                              : 'border-emerald-800 text-emerald-400 hover:bg-emerald-950/20'
                          }`}
                        >
                          {p.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Paper Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Create Official UPSC PYQ Paper</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePaper} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Session</label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option>CDS-I</option>
                    <option>CDS-II</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                  <select
                    value={subjectSlug}
                    onChange={(e) => setSubjectSlug(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="english">English</option>
                    <option value="general-knowledge">General Knowledge</option>
                    <option value="elementary-mathematics">Elementary Mathematics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Paper Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold uppercase text-amber-400 block">Legal & License Attribution</span>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Source Information</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Attribution Notice</label>
                  <textarea
                    rows={2}
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {submitting ? 'Creating...' : 'Create PYQ Paper'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
