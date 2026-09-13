'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../../../components/auth-guard';
import { AdminLayout } from '../../../../components/layouts/admin-layout';
import { Card, Button, Badge, MathRenderer } from '@cdsprep/ui';
import {
  PlusCircle,
  ArrowLeft,
  Save,
  CheckCircle,
  Eye,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import { RoleType, QuestionType, DifficultyLevel, QuestionStatus } from '@cdsprep/types';
import { apiRequest } from '../../../../lib/api';

export default function CreateQuestionPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER]}>
      <AdminLayout>
        <CreateQuestionForm />
      </AdminLayout>
    </AuthGuard>
  );
}

function CreateQuestionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const [subject, setSubject] = useState('Elementary Mathematics');
  const [chapter, setChapter] = useState('Arithmetic');
  const [topic, setTopic] = useState('Speed, Distance & Time');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MCQ_SINGLE);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState('1.00');
  const [negativeMarks, setNegativeMarks] = useState('0.33');
  const [source, setSource] = useState('UPSC CDS Official Paper');
  const [year, setYear] = useState('2023');

  const [options, setOptions] = useState([
    { identifier: 'A', optionText: '', isCorrect: true },
    { identifier: 'B', optionText: '', isCorrect: false },
    { identifier: 'C', optionText: '', isCorrect: false },
    { identifier: 'D', optionText: '', isCorrect: false },
  ]);

  const [explanation, setExplanation] = useState('');
  const [keyConcept, setKeyConcept] = useState('');
  const [trickFormula, setTrickFormula] = useState('');

  const handleOptionTextChange = (idx: number, text: string) => {
    setOptions(prev => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx].optionText = text;
      }
      return copy;
    });
  };

  const handleCorrectToggle = (idx: number) => {
    setOptions(prev =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === idx,
      })),
    );
  };

  const handleSubmit = async (targetStatus: QuestionStatus) => {
    if (!questionText.trim()) {
      alert('Question text is required');
      return;
    }
    const hasEmptyOption = options.some(o => !o.optionText.trim());
    if (hasEmptyOption) {
      alert('All 4 options must be filled in');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/questions', {
        method: 'POST',
        body: JSON.stringify({
          subjectName: subject,
          chapterName: chapter,
          topicName: topic,
          questionType,
          difficulty,
          questionText,
          marks: parseFloat(marks),
          negativeMarks: parseFloat(negativeMarks),
          source,
          year: parseInt(year, 10) || undefined,
          status: targetStatus,
          options,
          explanation: {
            explanation,
            keyConcept,
            trickFormula,
          },
        }),
      });

      alert(`Question created successfully with status: ${targetStatus}`);
      router.push('/admin/questions');
    } catch (err: any) {
      alert(err.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
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
            <h1 className="text-2xl font-black text-white">Create Question</h1>
            <p className="text-xs text-slate-400">
              Formulate official UPSC CDS questions with LaTeX mathematical support and distractor keys.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeTab === 'edit' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeTab === 'preview' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live KaTeX Preview
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'edit' ? (
        <div className="space-y-6">
          {/* Taxonomy & Metadata Card */}
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">1. Taxonomy & Classification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                >
                  <option>Elementary Mathematics</option>
                  <option>English</option>
                  <option>General Knowledge</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Chapter</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                >
                  <option value={DifficultyLevel.EASY}>EASY</option>
                  <option value={DifficultyLevel.MEDIUM}>MEDIUM</option>
                  <option value={DifficultyLevel.HARD}>HARD</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Marks</label>
                <input
                  type="number"
                  step="0.01"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Negative Marks</label>
                <input
                  type="number"
                  step="0.01"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Exam Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                />
              </div>
            </div>
          </Card>

          {/* Question Text */}
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">2. Question Statement</h3>
              <span className="text-[11px] text-slate-500">Supports KaTeX: $x^2 + y^2 = r^2$</span>
            </div>
            <textarea
              rows={4}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the question text here... You can use LaTeX math inside single dollars $...$"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </Card>

          {/* Options */}
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">3. Multiple Choice Options</h3>
            <p className="text-[11px] text-slate-400">Select the radio button to designate the authoritative correct answer.</p>

            <div className="space-y-2.5">
              {options.map((opt, i) => (
                <div
                  key={opt.identifier}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    opt.isCorrect
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleCorrectToggle(i)}
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      opt.isCorrect
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'border border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {opt.identifier}
                  </button>
                  <input
                    type="text"
                    value={opt.optionText}
                    onChange={(e) => handleOptionTextChange(i, e.target.value)}
                    placeholder={`Option ${opt.identifier} text (math supported with $...)`}
                    className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                  {opt.isCorrect && (
                    <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                      CORRECT KEY
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Official Explanation */}
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">4. Pedagogical Solution & Shortcuts</h3>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Step-by-step mathematical or grammatical derivation..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={keyConcept}
                onChange={(e) => setKeyConcept(e.target.value)}
                placeholder="Core Rule / Key Concept..."
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              />
              <input
                type="text"
                value={trickFormula}
                onChange={(e) => setTrickFormula(e.target.value)}
                placeholder="Speed formula / UPSC exam trick..."
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmit(QuestionStatus.DRAFT)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              <span>Save as DRAFT</span>
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmit(QuestionStatus.PUBLISHED)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              <span>Save & Publish Live</span>
            </Button>
          </div>
        </div>
      ) : (
        /* KaTeX Live Preview */
        <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{subject}</Badge>
              <span className="text-slate-500">&bull;</span>
              <span className="text-xs text-slate-400">{chapter} &gt; {topic}</span>
            </div>
            <Badge variant="warning">{difficulty}</Badge>
          </div>

          <div className="text-base text-slate-100 leading-relaxed">
            <MathRenderer content={questionText || '*(No question statement provided yet)*'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt) => (
              <div
                key={opt.identifier}
                className={`p-3 rounded-xl border ${
                  opt.isCorrect
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                    : 'border-slate-800 bg-slate-950 text-slate-300'
                }`}
              >
                <span className="font-bold mr-2 text-amber-400">({opt.identifier})</span>
                <MathRenderer content={opt.optionText || '---'} />
              </div>
            ))}
          </div>

          {explanation && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
              <span className="text-xs font-bold uppercase text-amber-400 block">Explanation:</span>
              <div className="text-xs text-slate-300 leading-relaxed">
                <MathRenderer content={explanation} />
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
