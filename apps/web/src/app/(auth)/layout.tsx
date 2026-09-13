import React from 'react';
import Link from 'next/link';
import { Shield, Award, Compass, Target } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Left Column: Tri-Service Heritage & Defense Motivation (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-12 lg:flex">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-950/50">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wider text-white">
                CDS<span className="text-emerald-400">PREP</span>
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                UPSC CDS Examination Platform
              </p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>The Academy Awaits Your Commitment</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Prepare Smarter. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Earn The Stars.
            </span>
          </h1>

          <p className="text-base leading-relaxed text-slate-300 font-normal">
            Master English, General Knowledge, and Elementary Mathematics with 20 years of authentic UPSC previous papers, high-yield practice, and real exam test environments.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <Award className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">IMA & OTA</div>
                <div className="text-[11px] text-slate-400">Army Officer Cadre</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <Compass className="h-5 w-5 text-sky-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">INA & AFA</div>
                <div className="text-[11px] text-slate-400">Navy & Air Force Cadre</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10 border-t border-slate-800/80 pt-6">
          <blockquote className="text-xs italic text-slate-400">
            &ldquo;The safety, honour and welfare of your country come first, always and every time. The honour, welfare and comfort of the men you command come next. Your own ease, comfort and safety come last, always and every time.&rdquo;
          </blockquote>
          <p className="mt-2 text-[11px] font-semibold text-emerald-400">
            — The Chetwode Motto, Indian Military Academy
          </p>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-8 md:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Link */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-black tracking-wider text-white">
                CDS<span className="text-emerald-400">PREP</span>
              </span>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
