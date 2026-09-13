'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { Card, Button, Badge, MathRenderer } from '@cdsprep/ui';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  CheckCheck,
  FileCheck,
} from 'lucide-react';
import { RoleType, QuestionStatus } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface AiDraftQuestion {
  id: string;
  questionText: string;
  status: QuestionStatus;
  difficulty: string;
  validationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  source?: string;
  subject?: { name: string };
  chapter?: { name: string };
  topic?: { name: string };
  options: { id: string; identifier: string; optionText: string; isCorrect: boolean }[];
  explanation?: { explanation: string };
}

export default function AdminAiModerationPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <AiModerationContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function AiModerationContent() {
  const [questions, setQuestions] = useState<AiDraftQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<AiDraftQuestion | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

  const fetchAiDrafts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: AiDraftQuestion[] }>('/admin/ai-moderation');
      setQuestions(res.items || []);
    } catch {
      // Mock fallback data if offline
      setQuestions([
        {
          id: 'q-ai-01',
          questionText: 'A motorboat whose speed is 15 km/h in still water goes 30 km downstream and comes back in 4 hours 30 minutes. What is the speed of the stream?',
          status: QuestionStatus.DRAFT_AI,
          difficulty: 'MEDIUM',
          validationStatus: 'VERIFIED',
          subject: { name: 'Elementary Mathematics' },
          chapter: { name: 'Arithmetic' },
          topic: { name: 'Speed, Distance & Time' },
          options: [
            { id: 'o-1', identifier: 'A', optionText: '5 km/h', isCorrect: true },
            { id: 'o-2', identifier: 'B', optionText: '4 km/h', isCorrect: false },
            { id: 'o-3', identifier: 'C', optionText: '6 km/h', isCorrect: false },
            { id: 'o-4', identifier: 'D', optionText: '7 km/h', isCorrect: false },
          ],
          explanation: {
            explanation: 'Let speed of stream = x. 30/(15+x) + 30/(15-x) = 9/2 => 60*15 / (225 - x^2) = 9/2 => x = 5 km/h.',
          },
        },
        {
          id: 'q-ai-02',
          questionText: 'Which one of the following articles of the Constitution of India deals with the Advisory Jurisdiction of the Supreme Court?',
          status: QuestionStatus.DRAFT_AI,
          difficulty: 'MEDIUM',
          validationStatus: 'VERIFIED',
          subject: { name: 'General Knowledge' },
          chapter: { name: 'Indian Polity' },
          topic: { name: 'Judiciary' },
          options: [
            { id: 'o-5', identifier: 'A', optionText: 'Article 143', isCorrect: true },
            { id: 'o-6', identifier: 'B', optionText: 'Article 141', isCorrect: false },
            { id: 'o-7', identifier: 'C', optionText: 'Article 136', isCorrect: false },
            { id: 'o-8', identifier: 'D', optionText: 'Article 148', isCorrect: false },
          ],
          explanation: {
            explanation: 'Article 143 provides Power of President to consult Supreme Court (Advisory Jurisdiction).',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiDrafts();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map(q => q.id));
    }
  };

  const handleBatchApprove = async (ids: string[], targetStatus: QuestionStatus) => {
    setApproving(true);
    try {
      await apiRequest('/admin/ai-moderation/batch-approve', {
        method: 'POST',
        body: JSON.stringify({ questionIds: ids, targetStatus }),
      });
      alert(`Approved ${ids.length} questions to ${targetStatus}!`);
      setSelectedIds([]);
      setSelectedQuestion(null);
      fetchAiDrafts();
    } catch (err: any) {
      alert(err.message || 'Batch approval failed');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span>AI Moderation & Content Approval Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop verification for AI-generated drafts. All items require manual administrative review before publication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              disabled={approving}
              onClick={() => handleBatchApprove(selectedIds, QuestionStatus.APPROVED)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Approve ({selectedIds.length}) into Bank</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAiDrafts}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </Button>
        </div>
      </div>

      {/* Safety Policy Notice */}
      <Card className="p-4 border-purple-900/40 bg-purple-950/15 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-purple-200">Strict Human Oversight Rule:</span>
          <p className="text-slate-300/80 leading-relaxed">
            AI-generated questions remain strictly quarantined in <code>DRAFT_AI</code> status. They never become active candidate test content until an authorized officer verifies the mathematical derivation and approves the official answer key.
          </p>
        </div>
      </Card>

      {/* Drafts Table */}
      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.length === questions.length && questions.length > 0}
              onChange={handleSelectAll}
              className="rounded border-slate-700 bg-slate-950 text-amber-500"
            />
            <span>Select All Drafts ({questions.length})</span>
          </div>
          <span>Showing pending AI candidate drafts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 font-semibold">Question Content</th>
                <th className="px-4 py-3 font-semibold">Classification</th>
                <th className="px-4 py-3 font-semibold">Math Verification</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                    <span>Querying AI moderation queue...</span>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No pending AI draft questions in moderation queue.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={() => handleToggleSelect(q.id)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-[360px]">
                      <div className="font-semibold text-white line-clamp-2">
                        <MathRenderer content={q.questionText} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-300 block">{q.subject?.name}</span>
                      <span className="text-[10px] text-slate-500">{q.chapter?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {q.validationStatus === 'VERIFIED' ? (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px] flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>VERIFIED</span>
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px] flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>NEEDS REVIEW</span>
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[10px]">
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedQuestion(q)}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Drawer */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <h2 className="text-base font-bold text-white">Inspect AI Generated Question</h2>
                </div>
                <button onClick={() => setSelectedQuestion(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              {/* Classification */}
              <div className="flex items-center justify-between text-xs">
                <Badge variant="outline">{selectedQuestion.subject?.name}</Badge>
                <Badge variant="warning">{selectedQuestion.difficulty}</Badge>
              </div>

              {/* Question Statement */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Question Text:</span>
                <div className="text-sm text-slate-100 leading-relaxed">
                  <MathRenderer content={selectedQuestion.questionText} />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Generated Options:</span>
                <div className="space-y-1.5">
                  {selectedQuestion.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        opt.isCorrect
                          ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                          : 'border-slate-800 bg-slate-950 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400">({opt.identifier})</span>
                        <MathRenderer content={opt.optionText} />
                      </div>
                      {opt.isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-400">OFFICIAL KEY</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              {selectedQuestion.explanation && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Generated Derivation:</span>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <MathRenderer content={selectedQuestion.explanation.explanation} />
                  </div>
                </div>
              )}
            </div>

            {/* Approval Actions */}
            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedQuestion(null)}
                className="flex-1 text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                disabled={approving}
                onClick={() => handleBatchApprove([selectedQuestion.id], QuestionStatus.APPROVED)}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Approve into Bank
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
