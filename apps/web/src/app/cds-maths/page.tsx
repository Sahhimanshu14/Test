import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Calculator, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CDS Elementary Mathematics Preparation (2026) — Syllabus & Topic Drills | CDSPrep',
  description:
    'Master CDS Elementary Mathematics. High-yield topic breakdowns for Arithmetic, Trigonometry, Geometry, Mensuration, Algebra, and Statistics with KaTeX derivations.',
  alternates: {
    canonical: 'https://your-domain/cds-maths',
  },
};

export default function CdsMathsPage() {
  const topics = [
    { title: 'Arithmetic & Number Theory', desc: 'Divisibility rules, modular arithmetic, HCF & LCM, prime factorization, percentages, and profit & loss.' },
    { title: 'Trigonometry & Identities', desc: 'Sine, cosine, tangent relations, height and distance problems, and trigonometric equations with step derivations.' },
    { title: 'Geometry & Coordinate Plane', desc: 'Properties of triangles, circles, chords, tangents, congruency, and Cartesian geometry.' },
    { title: 'Mensuration (2D & 3D)', desc: 'Surface areas and volumes of spheres, cones, cylinders, cuboids, and coordinate plane transforms.' },
    { title: 'Algebra & Polynomials', desc: 'Quadratic equations, remainder theorem, factor theorem, and simultaneous linear equations.' },
    { title: 'Statistics & Data Interpretation', desc: 'Mean, median, mode, frequency polygons, histograms, and standard deviation.' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Subject Mastery
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            CDS Elementary Mathematics (IMA, INA, AFA)
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            100 questions. 100 marks. 2 hours. Master speed, calculation precision, and step-by-step mathematical reasoning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topics.map((t, idx) => (
            <Card key={idx} className="p-5 border-slate-800 bg-slate-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/practice">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Start Mathematics Practice Drill
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
