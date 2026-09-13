import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Shield, BookOpen, Target, Award, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'UPSC CDS Exam Complete Guide (2026) — Eligibility, Syllabus, Exam Pattern | CDSPrep',
  description:
    'Comprehensive guide to UPSC Combined Defence Services (CDS I & II) examination. Master syllabus requirements for IMA, INA, AFA, and OTA with official marking scheme.',
  alternates: {
    canonical: 'https://your-domain/cds',
  },
  openGraph: {
    title: 'UPSC CDS Exam Complete Guide — Eligibility, Pattern & Cutoffs',
    description: 'Everything you need to qualify UPSC CDS exam. Official syllabus breakdown and tri-service academy requirements.',
    url: 'https://your-domain/cds',
    siteName: 'CDSPrep',
    type: 'website',
  },
};

export default function CdsOverviewPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'UPSC Combined Defence Services Examination Mastery',
    description: 'High-yield competitive exam training for IMA, INA, AFA, and OTA defense aspirants.',
    provider: {
      '@type': 'Organization',
      name: 'CDSPrep',
      url: 'https://your-domain',
    },
  };

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            UPSC Defence Career Guide
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            UPSC Combined Defence Services (CDS) Examination
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Gateway to a permanent and short service commission in the Indian Armed Forces. Prepare with precision for IMA, INA, AFA, and OTA.
          </p>
        </div>

        {/* Pattern Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              IMA, INA & AFA Pattern (300 Marks)
            </h2>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center justify-between border-b border-slate-800 py-1.5">
                <span>English Paper (120 Questions)</span>
                <span className="font-semibold text-white">100 Marks • 2h</span>
              </li>
              <li className="flex items-center justify-between border-b border-slate-800 py-1.5">
                <span>General Knowledge (120 Questions)</span>
                <span className="font-semibold text-white">100 Marks • 2h</span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span>Elementary Mathematics (100 Questions)</span>
                <span className="font-semibold text-white">100 Marks • 2h</span>
              </li>
            </ul>
            <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-3">
              Penalty: <span className="text-rose-400 font-bold">-0.333 marks</span> per incorrect answer (exact 1/3 negative marking).
            </div>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-400" />
              OTA Chennai Pattern (200 Marks)
            </h2>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center justify-between border-b border-slate-800 py-1.5">
                <span>English Paper (120 Questions)</span>
                <span className="font-semibold text-white">100 Marks • 2h</span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span>General Knowledge (120 Questions)</span>
                <span className="font-semibold text-white">100 Marks • 2h</span>
              </li>
              <li className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-slate-500">
                <span>Elementary Mathematics</span>
                <span className="font-semibold text-emerald-400">Exempt for OTA</span>
              </li>
            </ul>
            <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-3">
              Recommended Cutoff Target: <span className="text-emerald-400 font-bold">105+ Marks</span>.
            </div>
          </Card>
        </div>

        {/* Action Callouts */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Begin Targeted Preparation Today</h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Practice official UPSC question archives, sectional test series, and receive instant mathematical step-by-step solutions.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/register">
              <Button className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                Enroll Cadet Account
              </Button>
            </Link>
            <Link href="/pyq">
              <Button variant="outline">
                Browse PYQs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
