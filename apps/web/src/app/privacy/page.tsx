import React from 'react';
import type { Metadata } from 'next';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card } from '@cdsprep/ui';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | CDSPrep',
  description: 'CDSPrep Privacy Policy. Compliant with the Digital Personal Data Protection Act (DPDPA 2023). Learn how we protect cadet records, account credentials, and learning telemetry.',
  alternates: {
    canonical: 'https://your-domain/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Digital Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Last updated: September 13, 2026 • Compliant with India DPDPA 2023</p>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/60 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Data Controller & Scope</h2>
            <p>
              CDSPrep (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the online competitive examination preparation platform. This policy explains how we collect, process, and safeguard the personal data of cadets preparing for Union Public Service Commission examinations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
              <li><strong>Account Credentials:</strong> Full name, verified email address, target academy preference (IMA, INA, AFA, OTA), and salted cryptographic password hashes (Argon2id).</li>
              <li><strong>Learning Telemetry:</strong> Test attempt submissions, response timestamps, accuracy metrics, bookmarked questions, and mistake notebook entries.</li>
              <li><strong>Technical Metadata:</strong> IP address (sanitized for brute-force defense), browser user-agent, and session identifiers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Data Minimization & Usage</h2>
            <p>
              We process data strictly for:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
              <li>Authenticating cadet access and securing exam session states.</li>
              <li>Evaluating test submissions using server-authoritative scoring algorithms.</li>
              <li>Generating personalized study plans and weak-topic analytics.</li>
              <li>Preventing automated bot abuse and brute-force intrusions.</li>
            </ul>
            <p className="text-xs text-slate-400">
              We never sell, rent, or trade cadet personal data to third-party advertisers. Zero third-party behavioral ad trackers are loaded on CDSPrep.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Data Retention & Erasure</h2>
            <p>
              Cadets hold the right to request full account erasure. Upon account deletion request via the support portal, all personal identifying records are purged within 30 days, retaining only anonymized statistical data required for statutory compliance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Grievance Officer & Contact</h2>
            <p>
              In accordance with Information Technology Rules and DPDPA 2023, for privacy inquiries or data rights requests, contact our Data Protection Officer at: <span className="text-emerald-400 font-semibold">privacy@your-domain</span>.
            </p>
          </section>
        </Card>
      </div>
    </PublicLayout>
  );
}
