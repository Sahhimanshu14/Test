import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Target, CheckCircle2, Shield, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How to Prepare for UPSC CDS Exam (6-Month Roadmap) | CDSPrep',
  description:
    'Comprehensive preparation roadmap for UPSC Combined Defence Services examination. Subject-wise daily timetable, NCERT booklist, mock test strategy, and SSB interview guidance.',
  alternates: {
    canonical: 'https://your-domain/cds-preparation',
  },
};

export default function CdsPreparationGuidePage() {
  const steps = [
    { month: 'Phase 1 (Months 1–2)', title: 'NCERT Foundation & Grammar Drills', desc: 'Build solid conceptual clarity across Science (Class 9–10 NCERT) and English fundamentals (subject-verb agreement, idioms, vocabulary).' },
    { month: 'Phase 2 (Months 3–4)', title: 'Topic-Wise Mastery & Mathematics Speed', desc: 'Practice 100+ topic drills across Arithmetic, Trigonometry, and Indian Polity. Review mistake notebook daily to eliminate repeated errors.' },
    { month: 'Phase 3 (Months 5–6)', title: '20-Year PYQ Intensive & Full Mock Tests', desc: 'Solve past CDS papers under strict 2-hour exam timed conditions. Calibrate question-attempt strategy to maximize net marks.' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Cadet Strategy Roadmap
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            How to Prepare for UPSC CDS (6-Month Blueprint)
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            A disciplined, scientifically structured preparation schedule tailored for college students and working professionals aiming for an armed forces commission.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((s, idx) => (
            <Card key={idx} className="p-6 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-start gap-4">
              <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                {s.month}
              </span>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">{s.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/register">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Create Free Cadet Account & Begin
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
