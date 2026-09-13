import React from 'react';
import type { Metadata } from 'next';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card } from '@cdsprep/ui';
import { Cookie } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy | CDSPrep',
  description: 'Cookie Policy for CDSPrep. Learn how we use strictly necessary session cookies and theme preferences with zero third-party advertising trackers.',
  alternates: {
    canonical: 'https://your-domain/cookie-policy',
  },
};

export default function CookiePolicyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Cookie className="h-3.5 w-3.5" />
            <span>Browser Storage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Cookie Policy</h1>
          <p className="text-xs text-slate-400">Last updated: September 13, 2026 • Zero Ad Trackers Guarantee</p>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/60 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your browser to facilitate secure session management, maintain authentication state across page navigations, and preserve candidate interface preferences.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Essential Cookies We Use</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 text-xs">
              <li>
                <strong>cdsprep_access_token & cdsprep_refresh_token:</strong> Strictly necessary HTTP-only authentication tokens used to verify candidate identity and prevent unauthorized exam session hijacking. (Lifetime: 15 minutes / 7 days).
              </li>
              <li>
                <strong>theme_preference:</strong> Stores your display settings (e.g., dark mode contrast). (Lifetime: 1 year).
              </li>
              <li>
                <strong>active_attempt_state (IndexedDB):</strong> Client-side local storage buffer used to save question choices temporarily in case of mobile network disconnection.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Third-Party Advertising Cookies</h2>
            <p>
              <strong>CDSPrep does NOT use any third-party behavioral advertising cookies, Google AdSense cookies, or marketing trackers.</strong> We maintain a quiet, distraction-free environment for defense exam preparation.
            </p>
          </section>
        </Card>
      </div>
    </PublicLayout>
  );
}
