import React from 'react';
import type { Metadata } from 'next';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card } from '@cdsprep/ui';
import { CreditCard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subscription Terms | CDSPrep',
  description: 'Subscription terms, billing cycles, cancellation terms, and fair use guidelines for CDSPrep Pro access.',
  alternates: {
    canonical: 'https://your-domain/subscription-terms',
  },
};

export default function SubscriptionTermsPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Membership Terms</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Subscription Terms</h1>
          <p className="text-xs text-slate-400">Effective Date: September 13, 2026</p>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/60 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Subscription Plans</h2>
            <p>
              CDSPrep offers Free Cadet tier access (20-Year PYQs and baseline topic drills) and CDSPrep Pro tier (unlimited full-length mock tests, AI mathematical explanation drawer, advanced pacing analytics, and personalized weak-topic study plans).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Billing & Auto-Renewal</h2>
            <p>
              Subscriptions are billed in advance on an annual or monthly basis according to your chosen plan. Unless canceled prior to the renewal date via account settings, memberships renew automatically.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Cancellation</h2>
            <p>
              You may cancel your subscription at any time through your Profile &amp; Settings page. Cancellation prevents future billing; your Pro benefits remain active until the end of your prepaid billing period.
            </p>
          </section>
        </Card>
      </div>
    </PublicLayout>
  );
}
