import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Shield, Target, Award, BookOpen, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About CDSPrep — The Disciplined Exam Portal for Armed Forces Aspirants | CDSPrep',
  description: 'Learn about CDSPrep, our academic philosophy, tri-service academy coverage (IMA, INA, AFA, OTA), and mission to train future commissioned officers of the Indian Armed Forces.',
  alternates: {
    canonical: 'https://your-domain/about',
  },
};

export default function AboutUsPage() {
  const pillars = [
    { title: 'Server-Authoritative Precision', desc: 'No client-side score falsification. Real exam timers and strict 1/3 negative marking mirror UPSC standards.' },
    { title: 'Rigorous KaTeX Derivations', desc: 'Every mathematics problem includes step-by-step proofs, formulas, and alternate speed-tricks for exam day.' },
    { title: '20-Year Curated Archives', desc: 'Authentic previous year question papers compliant with Indian Copyright Act Section 52(1)(q).' },
    { title: 'Cadet-First Data Privacy', desc: 'Zero behavioral ad trackers. Compliant with India DPDPA 2023 with strict student data isolation.' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Our Mission & Philosophy
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Original, Disciplined Exam Training for Future Military Officers
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            CDSPrep was built by defense aspirants and engineers to replace bloated, ad-cluttered exam portals with a serious, high-stakes military training simulator.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pillars.map((p, idx) => (
            <Card key={idx} className="p-6 border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Shield className="h-5 w-5 text-emerald-400" />
                <span>{p.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Join Thousands of Serious Defence Aspirants</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Experience the clarity, mathematical rigor, and discipline needed to earn your commission.
          </p>
          <div className="pt-2">
            <Link href="/register">
              <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                Enroll Free Cadet Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
