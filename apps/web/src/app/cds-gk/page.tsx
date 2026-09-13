import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Compass, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CDS General Knowledge (GK) Complete Syllabus & Cutoff Guide | CDSPrep',
  description:
    'Crack the CDS General Knowledge paper. Topic-wise strategy for Indian Polity, Modern History, Geography, Physics, Chemistry, Biology, and Current Defence Affairs.',
  alternates: {
    canonical: 'https://your-domain/cds-gk',
  },
};

export default function CdsGkPage() {
  const areas = [
    { title: 'Indian Polity & Constitution', desc: 'Fundamental Rights, DPSP, Preamble, Parliament, Judiciary, Constitutional Amendments, and emergency provisions.' },
    { title: 'History of India', desc: 'Ancient, Medieval, and Modern Indian freedom struggle (1857–1947), Governor Generals, and reform movements.' },
    { title: 'Physical & Indian Geography', desc: 'Rivers, mountain passes, soils, monsoon dynamics, planetary orbits, ocean currents, and mineral belts.' },
    { title: 'General Science (Physics, Chem, Bio)', desc: 'Class 9–10 NCERT foundation: Optics, Electricity, Periodic Table, Acids & Bases, Human Physiology, and Cell Biology.' },
    { title: 'Defence & Security Affairs', desc: 'Missile systems, joint military exercises, tri-service commands, defence procurement, and gallantry awards.' },
    { title: 'National & International Current Events', desc: 'Bilateral treaties, summits, multilateral institutions, sports achievements, and scientific milestones.' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Sectional Cutoff Gate
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            CDS General Knowledge Preparation
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            120 questions. 100 marks. 2 hours. Requires a strict 20% minimum sectional cutoff (20 marks) to qualify for SSB interview consideration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas.map((a, idx) => (
            <Card key={idx} className="p-5 border-slate-800 bg-slate-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{a.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{a.desc}</p>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/practice">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Practice General Knowledge Drills
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
