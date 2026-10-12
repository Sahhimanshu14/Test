import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { History, CheckCircle2, Shield, Download, FileText, Layers, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'UPSC CDS Previous Year Question Papers (2006–2026) with Solutions | CDSPrep',
  description:
    'Download and practice official UPSC CDS I & II previous year question papers. Comprehensive chapterwise PDFs, answer keys, step-by-step mathematical solutions, and statutory exam archives.',
  alternates: {
    canonical: 'https://your-domain/cds-pyq',
  },
};

export default function CdsPyqLandingPage() {
  const archives = [
    { year: 'CDS II 2024', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS I 2024', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS II 2023', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS I 2023', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS II 2022', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS I 2022', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Official Curriculum Archive
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            20-Year Official UPSC CDS PYQ Papers
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Authentic previous year question papers mapped strictly per Section 52(1)(q) of the Indian Copyright Act 1957. Complete with verified solutions, step-by-step mathematical derivations, and downloadable chapter-wise PDF booklets.
          </p>
        </div>

        {/* Direct Download Hub: English, GS & Math */}
        <div className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Download className="h-5 w-5 text-emerald-400" />
              <span>Download Official PYQ Booklets & Answer Keys</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              High-resolution, verified PDF documents for candidate offline preparation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* English PDF Download */}
            <Card className="p-5 border-slate-800 bg-slate-900/80 space-y-4 hover:border-purple-500/40 transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">English PYQ</h3>
                  <p className="text-xs text-purple-300 font-semibold">2,211 Qs • 14 Chapters</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Grammar errors, Synonyms, Antonyms, Idioms, PQRS jumbles & Comprehension.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <a
                  href="/api/pyq/download/english"
                  download="CDS_English_Chapterwise_PYQ.pdf"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Questions (PDF)</span>
                </a>
                <a
                  href="/api/pyq/download/english-key"
                  download="CDS_English_Chapterwise_Answer_Key.pdf"
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition"
                >
                  <CheckCircle2 className="h-3 w-3 text-purple-400" />
                  <span>Download Answer Key (PDF)</span>
                </a>
              </div>
            </Card>

            {/* GS / GK PDF Download */}
            <Card className="p-5 border-slate-800 bg-slate-900/80 space-y-4 hover:border-amber-500/40 transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">General Knowledge (GS)</h3>
                  <p className="text-xs text-amber-300 font-semibold">Official UPSC Papers • 4 Pillars</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Indian Polity, National Movement, Physical/Indian Geography, Science & Defence.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <a
                  href="/api/pyq/download/gs"
                  download="CDS_GS_Chapterwise_PYQ.pdf"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Questions (PDF)</span>
                </a>
                <a
                  href="/api/pyq/download/gs-key"
                  download="CDS_GS_Chapterwise_Answer_Key.pdf"
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <CheckCircle2 className="h-3 w-3 text-amber-400" />
                  <span>Download Answer Key (PDF)</span>
                </a>
              </div>
            </Card>

            {/* Math PDF Download */}
            <Card className="p-5 border-slate-800 bg-slate-900/80 space-y-4 hover:border-emerald-500/40 transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Elementary Maths</h3>
                  <p className="text-xs text-emerald-300 font-semibold">2,799 Qs • 13 Chapters</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Number Systems, Algebra, Trigonometry, Geometry, Mensuration & Statistics.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <a
                  href="/api/pyq/download/math"
                  download="CDS_Math_Chapterwise_PYQ.pdf"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Questions (PDF)</span>
                </a>
                <a
                  href="/api/pyq/download/math-key"
                  download="CDS_Math_Chapterwise_Answer_Key.pdf"
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Download Answer Key (PDF)</span>
                </a>
              </div>
            </Card>
          </div>
        </div>

        {/* Paper Archives Grid */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Online Interactive Examination Papers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.map((a, idx) => (
              <Card key={idx} className="p-5 border-slate-800 bg-slate-900/60 space-y-2 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">{a.year}</span>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                    {a.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{a.papers}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center pt-4">
          <Link href="/pyq">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Open 20-Year Online PYQ Vault & CBT Simulator
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
