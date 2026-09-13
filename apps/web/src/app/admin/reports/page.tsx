'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  MessageSquare,
  FileQuestion,
  Filter,
} from 'lucide-react';
import { RoleType, ReportStatus } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface ReportItem {
  id: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  user: { id: string; email: string; fullName: string };
  question: {
    id: string;
    questionText: string;
    difficulty: string;
    status: string;
    subject?: { name: string };
    chapter?: { name: string };
  };
}

export default function AdminReportsPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.MODERATOR]}>
      <AdminLayout>
        <ReportsModerationContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function ReportsModerationContent() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiRequest<{ items: ReportItem[] }>(`/admin/reports?${params.toString()}`);
      setReports(res.items || []);
    } catch {
      // Mock fallback data if offline
      setReports([
        {
          id: 'rep-01',
          reason: 'Typo in Option C formula',
          details: 'Option C says 15 m/s but calculation yields 16.67 m/s according to NCERT formula.',
          status: ReportStatus.PENDING,
          createdAt: new Date().toISOString(),
          user: { id: 'u-1', email: 'cadet.rahul@cdsprep.in', fullName: 'Rahul Sharma' },
          question: {
            id: 'q-101',
            questionText: 'A train 150m long passes a telegraph post in 12 seconds. Find the speed of the train in km/h.',
            difficulty: 'MEDIUM',
            status: 'PUBLISHED',
            subject: { name: 'Elementary Mathematics' },
            chapter: { name: 'Arithmetic' },
          },
        },
        {
          id: 'rep-02',
          reason: 'Ambiguous statement in assertion',
          details: 'Statement 2 refers to 44th Constitutional Amendment instead of 42nd Amendment.',
          status: ReportStatus.RESOLVED,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          user: { id: 'u-2', email: 'cadet.priya@cdsprep.in', fullName: 'Priya Verma' },
          question: {
            id: 'q-102',
            questionText: 'Consider the following statements regarding the Right to Property...',
            difficulty: 'HARD',
            status: 'PUBLISHED',
            subject: { name: 'General Knowledge' },
            chapter: { name: 'Indian Polity' },
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleResolve = async (reportId: string, action: 'RESOLVE' | 'REJECT') => {
    setSubmitting(true);
    try {
      await apiRequest(`/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          notes: resolutionNotes || `Moderator marked report as ${action}`,
        }),
      });
      alert(`Report marked as ${action}`);
      setSelectedReport(null);
      setResolutionNotes('');
      fetchReports();
    } catch (err: any) {
      alert(err.message || 'Failed to update report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <span>Candidate Question Reports Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review cadet feedback on question typos, answer key discrepancies, and ambiguous explanations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value={ReportStatus.PENDING}>PENDING</option>
            <option value={ReportStatus.RESOLVED}>RESOLVED</option>
            <option value={ReportStatus.REJECTED}>REJECTED</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </Button>
        </div>
      </div>

      {/* Reports Table */}
      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Report Reason</th>
                <th className="px-4 py-3 font-semibold">Question Excerpt</th>
                <th className="px-4 py-3 font-semibold">Reported By</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading reports...</span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No reports found matching criteria.
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-bold text-white max-w-[200px] truncate">
                      {rep.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[260px] truncate">
                      {rep.question.questionText}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200 block">{rep.user.fullName}</span>
                      <span className="text-[10px] text-slate-500">{rep.user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {rep.question.subject?.name || 'General'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={rep.status === ReportStatus.PENDING ? 'warning' : rep.status === ReportStatus.RESOLVED ? 'outline' : 'destructive'}
                        className="text-[10px]"
                      >
                        {rep.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReport(rep)}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>Inspect & Resolve</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolution Drawer */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Report Resolution Console</h2>
                <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              {/* Reported Question Preview */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Reported Question:</span>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedReport.question.questionText}</p>
                <div className="flex gap-2 text-[10px] text-slate-400 pt-1">
                  <span>Subject: {selectedReport.question.subject?.name}</span>
                  <span>&bull;</span>
                  <span>Status: {selectedReport.question.status}</span>
                </div>
              </div>

              {/* Candidate Feedback */}
              <div className="p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">Issue: {selectedReport.reason}</span>
                  <span className="text-[10px] text-slate-400">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedReport.details && (
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    &ldquo;{selectedReport.details}&rdquo;
                  </p>
                )}
                <span className="text-[10px] text-slate-500 block">
                  Reported by: {selectedReport.user.fullName} ({selectedReport.user.email})
                </span>
              </div>

              {/* Moderator Notes */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Moderator Resolution Notes (Recorded in Audit Log)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain resolution (e.g. Corrected typo in Option C, clarified wording, verified answer key)..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => handleResolve(selectedReport.id, 'REJECT')}
                className="flex-1 text-xs border-rose-900/50 text-rose-400 hover:bg-rose-950/30"
              >
                Reject Report
              </Button>
              <Button
                size="sm"
                disabled={submitting}
                onClick={() => handleResolve(selectedReport.id, 'RESOLVE')}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Mark Resolved
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
