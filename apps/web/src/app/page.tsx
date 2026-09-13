import React from 'react';
import { PublicLayout } from '../components/layouts/public-layout';
import { LandingHeroCta } from '../components/landing-hero-cta';
import { Card, Badge } from '@cdsprep/ui';
import {
  Shield,
  BookOpen,
  Target,
  Sparkles,
  Award,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  History,
  Clock,
  Compass,
} from 'lucide-react';

export default function HomePage() {

  const academies = [
    {
      code: 'IMA',
      name: 'Indian Military Academy',
      location: 'Dehradun, Uttarakhand',
      papers: 'English • General Knowledge • Elementary Maths',
      marks: '300 Marks',
      badge: 'ima',
      accent: 'border-emerald-500/40 bg-emerald-950/20',
    },
    {
      code: 'INA',
      name: 'Indian Naval Academy',
      location: 'Ezhimala, Kerala',
      papers: 'English • General Knowledge • Elementary Maths',
      marks: '300 Marks',
      badge: 'ina',
      accent: 'border-sky-500/40 bg-sky-950/20',
    },
    {
      code: 'AFA',
      name: 'Air Force Academy',
      location: 'Dundigal, Hyderabad',
      papers: 'English • General Knowledge • Elementary Maths',
      marks: '300 Marks',
      badge: 'afa',
      accent: 'border-amber-500/40 bg-amber-950/20',
    },
    {
      code: 'OTA',
      name: 'Officers Training Academy',
      location: 'Chennai, Tamil Nadu',
      papers: 'English • General Knowledge (No Maths)',
      marks: '200 Marks',
      badge: 'ota',
      accent: 'border-purple-500/40 bg-purple-950/20',
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28 lg:px-8">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <Shield className="h-4 w-4" />
            <span>Built for UPSC Combined Defence Services Aspirants</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Original, Disciplined Exam Prep for Future{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Commissioned Officers.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            High-yield competitive exam training for IMA, INA, AFA, and OTA aspirants. Featuring 20-year official UPSC PYQ archives, server-authoritative mock tests, and rigorous mathematical derivations.
          </p>

          <LandingHeroCta />
        </div>

        {/* 4 Academy Tracks */}
        <div className="mx-auto max-w-6xl mt-20 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Tri-Service Academy Syllabus Tracks
            </h2>
            <p className="text-xl font-black text-white">Targeted Preparation by Commission Branch</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {academies.map((acad) => (
              <Card
                key={acad.code}
                className={`p-5 space-y-3 border ${acad.accent} transition-all duration-150 hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={acad.badge as any}>{acad.code}</Badge>
                  <span className="text-xs font-bold text-slate-300">{acad.marks}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{acad.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{acad.location}</p>
                </div>
                <div className="border-t border-slate-800/80 pt-2.5">
                  <p className="text-[11px] text-slate-300 leading-snug">{acad.papers}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pillars Cards */}
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="border-slate-800 bg-slate-900/60 p-6 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <History className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">20-Year UPSC Archives (2006–2026)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete official question papers from CDS-I and CDS-II sessions. Step-by-step KaTeX mathematical derivations and speed shortcuts for rapid calculation.
            </p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 p-6 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Server-Authoritative Test Arena</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authentic UPSC marking algorithm (+0.83 / -0.28 for English & GK, +1.0 / -0.33 for Maths). 6-state official palette, countdown timers, and autosave.
            </p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 p-6 space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Projected Academy Cutoffs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time analytics comparing your mock scores directly against historical cutoff scores for IMA, INA, AFA, and OTA to measure true SSB readiness.
            </p>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
