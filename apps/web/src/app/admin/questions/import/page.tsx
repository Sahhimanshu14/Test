'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../../../components/auth-guard';
import { AdminLayout } from '../../../../components/layouts/admin-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  UploadCloud,
  FileCode,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Copy,
  Info,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../../lib/api';

interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  invalidRecords: { index: number; error: string }[];
  validItems: any[];
}

export default function BulkImportPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <BulkImportContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function BulkImportContent() {
  const router = useRouter();
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [inputContent, setInputContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const sampleJson = `[
  {
    "subject": "Elementary Mathematics",
    "chapter": "Arithmetic",
    "topic": "Percentage",
    "difficulty": "EASY",
    "questionText": "If the price of sugar increases by 20%, by how much percent should consumption be decreased so expenditure remains unchanged?",
    "marks": 1.0,
    "negativeMarks": 0.33,
    "options": [
      { "identifier": "A", "optionText": "16.67%", "isCorrect": true },
      { "identifier": "B", "optionText": "20%", "isCorrect": false },
      { "identifier": "C", "optionText": "25%", "isCorrect": false },
      { "identifier": "D", "optionText": "15%", "isCorrect": false }
    ],
    "explanation": "Reduction = (r / (100 + r)) * 100% = (20 / 120) * 100% = 16.67%"
  }
]`;

  const handleAnalyze = () => {
    if (!inputContent.trim()) {
      alert('Please paste or upload JSON/CSV dataset first');
      return;
    }

    setAnalyzing(true);
    try {
      let parsed: any[] = [];
      if (importFormat === 'json') {
        parsed = JSON.parse(inputContent);
        if (!Array.isArray(parsed)) {
          throw new Error('Root JSON element must be an array of question objects');
        }
      } else {
        // Basic CSV parsing
        const lines = inputContent.trim().split('\n');
        parsed = lines.slice(1).map((line, idx) => {
          const parts = line.split(',');
          return {
            subject: parts[0]?.trim(),
            chapter: parts[1]?.trim(),
            topic: parts[2]?.trim(),
            questionText: parts[3]?.trim(),
            difficulty: parts[4]?.trim() || 'MEDIUM',
            options: [
              { identifier: 'A', optionText: parts[5]?.trim(), isCorrect: true },
              { identifier: 'B', optionText: parts[6]?.trim(), isCorrect: false },
              { identifier: 'C', optionText: parts[7]?.trim(), isCorrect: false },
              { identifier: 'D', optionText: parts[8]?.trim(), isCorrect: false },
            ],
            explanation: parts[9]?.trim(),
          };
        });
      }

      const invalidRecords: { index: number; error: string }[] = [];
      const validItems: any[] = [];
      const seenTexts = new Set<string>();
      let duplicates = 0;

      parsed.forEach((item, index) => {
        const lineNum = index + 1;
        if (!item.questionText || item.questionText.length < 5) {
          invalidRecords.push({ index: lineNum, error: 'Question text is missing or shorter than 5 characters' });
          return;
        }

        const normalized = item.questionText.trim().toLowerCase();
        if (seenTexts.has(normalized)) {
          duplicates++;
          invalidRecords.push({ index: lineNum, error: 'Duplicate question detected within this batch' });
          return;
        }
        seenTexts.add(normalized);

        if (!Array.isArray(item.options) || item.options.length < 2) {
          invalidRecords.push({ index: lineNum, error: 'Must specify at least 2 options' });
          return;
        }

        const hasCorrect = item.options.some((o: any) => o.isCorrect === true);
        if (!hasCorrect) {
          invalidRecords.push({ index: lineNum, error: 'No option marked as correct (isCorrect: true)' });
          return;
        }

        validItems.push(item);
      });

      setSummary({
        total: parsed.length,
        valid: validItems.length,
        invalid: invalidRecords.length,
        duplicates,
        invalidRecords,
        validItems,
      });
    } catch (err: any) {
      alert(`Parsing failure: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!summary || summary.validItems.length === 0) return;

    setCommitting(true);
    try {
      const res = await apiRequest('/questions/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          data: summary.validItems,
          questions: summary.validItems,
          mode: 'TRANSACTIONAL',
        }),
      });

      alert(`Ingestion complete! Successfully imported ${summary.validItems.length} questions into Question Bank.`);
      router.push('/admin/questions');
    } catch (err: any) {
      alert(err.message || 'Batch commit failed. All database changes rolled back.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/questions">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Bulk Question Ingestion</h1>
            <p className="text-xs text-slate-400">
              Import authorized question sets in bulk via JSON or CSV with strict pre-insertion verification.
            </p>
          </div>
        </div>

        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          <button
            onClick={() => { setImportFormat('json'); setSummary(null); }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              importFormat === 'json' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            JSON Format
          </button>
          <button
            onClick={() => { setImportFormat('csv'); setSummary(null); }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              importFormat === 'csv' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            CSV Format
          </button>
        </div>
      </div>

      {/* Input Area */}
      <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <FileCode className="h-4 w-4 text-amber-400" />
            <span>Dataset Ingestion Payload</span>
          </label>
          <button
            onClick={() => setInputContent(sampleJson)}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
          >
            <Copy className="h-3 w-3" />
            <span>Load Sample Payload</span>
          </button>
        </div>

        <textarea
          rows={10}
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          placeholder={importFormat === 'json' ? 'Paste valid JSON array here...' : 'Subject,Chapter,Topic,Question,Difficulty,OptionA,OptionB,OptionC,OptionD,Explanation...'}
          className="w-full font-mono rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
        />

        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={analyzing || !inputContent.trim()}
            onClick={handleAnalyze}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            {analyzing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <UploadCloud className="h-3.5 w-3.5 mr-1" />}
            <span>Analyze & Pre-Validate Batch</span>
          </Button>
        </div>
      </Card>

      {/* Pre-validation Results */}
      {summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Ingested</span>
              <span className="text-2xl font-black text-white">{summary.total}</span>
            </div>
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-emerald-950/20 text-center">
              <span className="text-[10px] uppercase text-emerald-400 font-bold block">Valid Questions</span>
              <span className="text-2xl font-black text-emerald-400">{summary.valid}</span>
            </div>
            <div className="p-4 rounded-xl border border-rose-800/40 bg-rose-950/20 text-center">
              <span className="text-[10px] uppercase text-rose-400 font-bold block">Invalid Records</span>
              <span className="text-2xl font-black text-rose-400">{summary.invalid}</span>
            </div>
            <div className="p-4 rounded-xl border border-amber-800/40 bg-amber-950/20 text-center">
              <span className="text-[10px] uppercase text-amber-400 font-bold block">Duplicates</span>
              <span className="text-2xl font-black text-amber-400">{summary.duplicates}</span>
            </div>
          </div>

          {summary.invalidRecords.length > 0 && (
            <Card className="p-4 border-rose-900/50 bg-rose-950/10 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Pre-Validation Errors Detected:</span>
              </div>
              <ul className="space-y-1 text-xs text-rose-300/80 list-disc list-inside">
                {summary.invalidRecords.slice(0, 10).map((err, i) => (
                  <li key={i}>
                    Item #{err.index}: {err.error}
                  </li>
                ))}
                {summary.invalidRecords.length > 10 && (
                  <li className="text-[11px] text-slate-500 italic">
                    ...and {summary.invalidRecords.length - 10} more invalid items.
                  </li>
                )}
              </ul>
            </Card>
          )}

          {summary.valid > 0 && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Ready for Transactional Commit</span>
                <span className="text-[11px] text-slate-400">
                  {summary.valid} validated questions will be inserted atomically as DRAFT records.
                </span>
              </div>
              <Button
                size="sm"
                disabled={committing}
                onClick={handleCommit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {committing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                <span>Commit {summary.valid} Valid Records</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
