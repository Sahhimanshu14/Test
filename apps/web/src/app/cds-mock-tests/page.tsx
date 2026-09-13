import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { FileCheck2, Clock, CheckCircle2, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'UPSC CDS Mock Test Series (2026) — Full-Length Exam Simulation | CDSPrep',
  description:
    'Simulate real UPSC CDS examination conditions. Exact 2-hour sectional timer, 1/3 negative marking, anti-cheat server grading, and comprehensive scorecard analytics.',
  alternates: {
    canonical: 'https://your-domain/cds-mock-tests',
  },
};

export default function CdsMockTestsLandingPage() {
  const highlights = [
    { title: 'Server-Authoritative Clock', desc: 'Prevents client-side time manipulation and ensures strict exam duration adherence.' },
    { title: 'Negative Marking Penalty', desc: 'Exact 0.333 marks deducted per incorrect answer matching UPSC CDS official evaluation.' },
    { title: 'Heartbeat Autosave', desc: 'Automatic state rehydration preserves every selected option in case of page refresh or disconnect.' },
    { title: 'Comparative Cutoff Margins', desc: 'Compare your net score against previous year IMA, INA, AFA, and OTA cutoffs.' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Real Exam Simulation
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            UPSC CDS Full-Length Mock Test Series
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Experience the pressure, pacing, and rigor of the CDS examination room with server-timed simulations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {highlights.map((h, idx) => (
            <Card key={idx} className="p-5 border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>{h.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{h.desc}</p>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/tests">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Launch Mock Test Series
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
