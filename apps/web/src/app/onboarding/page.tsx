'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Shield, Target, BookOpen, CheckCircle2, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/auth-context';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAcademy, setSelectedAcademy] = useState<'IMA' | 'INA' | 'AFA' | 'OTA'>('IMA');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Elementary Mathematics',
    'English',
    'General Knowledge',
  ]);

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl w-full space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-white tracking-wide uppercase">Cadet Enlistment Briefing</span>
            </div>
            <span className="text-emerald-400 font-semibold">Step {step} of 3</span>
          </div>

          {/* Step 1: Target Commission */}
          {step === 1 && (
            <Card className="p-6 sm:p-8 border-slate-800 bg-slate-900/80 space-y-6">
              <div className="space-y-1">
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                  Step 1 • Target Academy
                </Badge>
                <h1 className="text-xl sm:text-2xl font-black text-white">Select Your Commission Goal</h1>
                <p className="text-xs text-slate-400">
                  Your academy goal calibrates your cutoffs, sectional timers, and test series syllabus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { code: 'IMA', name: 'Indian Military Academy', desc: 'Army Permanent Commission (300 Marks)' },
                  { code: 'INA', name: 'Indian Naval Academy', desc: 'Naval Executive / Technical (300 Marks)' },
                  { code: 'AFA', name: 'Air Force Academy', desc: 'Flying & Ground Duty (300 Marks)' },
                  { code: 'OTA', name: 'Officers Training Academy', desc: 'Short Service Commission (200 Marks, No Maths)' },
                ].map((acad) => (
                  <button
                    key={acad.code}
                    type="button"
                    onClick={() => {
                      setSelectedAcademy(acad.code as any);
                      if (acad.code === 'OTA') {
                        setSelectedSubjects(['English', 'General Knowledge']);
                      } else {
                        setSelectedSubjects(['Elementary Mathematics', 'English', 'General Knowledge']);
                      }
                    }}
                    className={`p-4 rounded-xl text-left border transition flex flex-col justify-between space-y-2 ${
                      selectedAcademy === acad.code
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-950/30'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-base">{acad.code}</span>
                      {selectedAcademy === acad.code && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{acad.name}</p>
                    <p className="text-[11px] text-slate-400">{acad.desc}</p>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                Confirm Target Academy <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          )}

          {/* Step 2: Preferred Subjects */}
          {step === 2 && (
            <Card className="p-6 sm:p-8 border-slate-800 bg-slate-900/80 space-y-6">
              <div className="space-y-1">
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                  Step 2 • Curriculum Focus
                </Badge>
                <h1 className="text-xl sm:text-2xl font-black text-white">Curriculum &amp; Priority Subjects</h1>
                <p className="text-xs text-slate-400">
                  Select your core study areas for {selectedAcademy}. You can adjust these anytime in your dashboard.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Elementary Mathematics', desc: 'Arithmetic, Trigonometry, Geometry, Mensuration & Algebra (Exempt for OTA)' },
                  { name: 'English', desc: 'Grammar, Error Spotting, Comprehension & Vocabulary' },
                  { name: 'General Knowledge', desc: 'Indian Polity, History, Geography, General Science & Defence Affairs' },
                ].map((sub) => {
                  const isSelected = selectedSubjects.includes(sub.name);
                  return (
                    <button
                      key={sub.name}
                      type="button"
                      onClick={() => toggleSubject(sub.name)}
                      className={`w-full p-4 rounded-xl text-left border transition flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-sm">{sub.name}</span>
                        <p className="text-[11px] text-slate-400">{sub.desc}</p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          isSelected ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Diagnostic Baseline Test / Complete */}
          {step === 3 && (
            <Card className="p-6 sm:p-8 border-slate-800 bg-slate-900/80 space-y-6">
              <div className="space-y-1 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                  <Sparkles className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                  Step 3 • Readiness Check
                </Badge>
                <h1 className="text-xl sm:text-2xl font-black text-white">Cadet Profile Configured!</h1>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You are all set for {selectedAcademy}. You can take an optional 5-question baseline assessment now or jump straight to Cadet HQ.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => router.push('/practice')}
                  className="w-full font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 flex items-center justify-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Take 5-Min Diagnostic Test
                </Button>
                <Button
                  variant="outline"
                  onClick={handleFinish}
                  className="w-full text-slate-300 hover:text-white"
                >
                  Skip Diagnostic &amp; Go to Cadet HQ
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
