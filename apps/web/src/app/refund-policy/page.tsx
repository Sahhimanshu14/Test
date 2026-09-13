import React from 'react';
import type { Metadata } from 'next';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card } from '@cdsprep/ui';
import { RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund Policy | CDSPrep',
  description: 'Refund Policy for CDSPrep subscription plans and digital mock test series. Clear, transparent refund terms.',
  alternates: {
    canonical: 'https://your-domain/refund-policy',
  },
};

export default function RefundPolicyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Candidate Billing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Refund Policy</h1>
          <p className="text-xs text-slate-400">Effective Date: September 13, 2026 • Transparent Digital Services</p>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/60 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. 7-Day Money-Back Guarantee</h2>
            <p>
              We stand behind the quality of our CDS preparation curriculum. If you purchase an annual CDSPrep Pro subscription and are unsatisfied within seven (7) days of your initial purchase, you are eligible for a full refund, provided you have attempted fewer than three (3) full-length mock examinations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Non-Refundable Scenarios</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
              <li>Requests submitted after seven (7) days from the initial transaction date.</li>
              <li>Accounts found in violation of our Anti-Cheat Policy or Terms of Service.</li>
              <li>Renewal charges that were not canceled prior to the automated billing date.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. How to Request a Refund</h2>
            <p>
              To initiate a refund request, contact our billing desk at <span className="text-emerald-400 font-semibold">billing@your-domain</span> with your registered account email, transaction ID, and reason for refund. Valid refunds are processed within 5–7 business days to the original payment method.
            </p>
          </section>
        </Card>
      </div>
    </PublicLayout>
  );
}
