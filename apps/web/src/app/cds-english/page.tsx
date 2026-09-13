import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CDS English Paper Syllabus & Practice (2026) | CDSPrep',
  description:
    'Comprehensive preparation for CDS English paper: Spotting Errors, Reading Comprehension, Sentence Ordering, Vocabulary, Synonyms & Antonyms, and Cloze Test.',
  alternates: {
    canonical: 'https://your-domain/cds-english',
  },
};

export default function CdsEnglishPage() {
  const sections = [
    { title: 'Spotting Errors', desc: 'Subject-verb agreement, tenses, prepositions, modifiers, conditionals, and parallelism.' },
    { title: 'Reading Comprehension', desc: 'Passage tone, central theme identification, inferential deduction, and vocabulary in context.' },
    { title: 'Ordering of Sentences (Para Jumbles)', desc: 'Logical sentence linking, chronological coherence, and transition marker analysis (S1–S6).' },
    { title: 'Vocabulary: Synonyms & Antonyms', desc: 'High-frequency words tested across 20-year UPSC CDS examinations with contextual usage.' },
    { title: 'Idioms, Phrases & Phrasal Verbs', desc: 'Standard defence-exam idiomatic expressions, prepositional collocations, and meanings.' },
    { title: 'Cloze Test & Fillers', desc: 'Grammar and vocabulary fill-in-the-blanks testing linguistic accuracy and syntactic flow.' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            High-Yield Scoring Paper
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            CDS English Syllabus & Strategy
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            120 questions. 100 marks. 2 hours. Common to all 4 academies (IMA, INA, AFA, OTA). Aim for 75+ marks with structured daily practice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((s, idx) => (
            <Card key={idx} className="p-5 border-slate-800 bg-slate-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{s.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/practice">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Practice English Drills
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
