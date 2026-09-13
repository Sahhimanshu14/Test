import React from 'react';
import type { Metadata } from 'next';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card } from '@cdsprep/ui';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | CDSPrep',
  description: 'Terms of Service and Acceptable Use Policy for the CDSPrep examination portal. Review platform rules, copyright notices, and anti-cheat policies.',
  alternates: {
    canonical: 'https://your-domain/terms',
  },
};

export default function TermsOfServicePage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Acceptable Use & Rules</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Terms of Service</h1>
          <p className="text-xs text-slate-400">Effective Date: September 13, 2026 • CDSPrep Platform</p>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/60 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing practice questions, or taking mock examinations on CDSPrep, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must cease using the platform immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Statutory Content Provenance & Fair Use Notice</h2>
            <p>
              Official Previous Year Questions (PYQ) included in the platform archives originate from publicly administered UPSC examinations and are reproduced for research, private study, and academic preparation under <span className="text-emerald-400 font-semibold">Section 52(1)(q) of the Indian Copyright Act, 1957</span>. Original solutions, mathematical proofs, derivations, and explanations created by CDSPrep are protected proprietary works.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Anti-Cheat & Fair Play Policy</h2>
            <p>
              To protect the integrity of student ranking and leaderboard metrics, users agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
              <li>Deploy automated bots, scrapers, or browser scripts to answer questions.</li>
              <li>Reverse-engineer API endpoints or manipulate client submission scores.</li>
              <li>Share, resell, or distribute account credentials.</li>
              <li>File fraudulent or malicious question dispute reports.</li>
            </ul>
            <p className="text-xs text-slate-400">
              Violations result in immediate account suspension and revocation of all exam access without refund.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Disclaimer of Official Affiliation</h2>
            <p>
              CDSPrep is an independent educational technology platform. CDSPrep is not affiliated with, endorsed by, or operated in partnership with the Union Public Service Commission (UPSC), the Ministry of Defence, or any branch of the Indian Armed Forces.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Governing Law & Jurisdiction</h2>
            <p>
              These terms are governed by the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the competent courts in New Delhi, India.
            </p>
          </section>
        </Card>
      </div>
    </PublicLayout>
  );
}
