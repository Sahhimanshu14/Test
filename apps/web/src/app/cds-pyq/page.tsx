import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { History, CheckCircle2, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'UPSC CDS Previous Year Question Papers (2006–2026) with Solutions | CDSPrep',
  description:
    'Solve official UPSC CDS I & II previous year question papers. Comprehensive answer keys, step-by-step mathematical solutions, and statutory exam archives.',
  alternates: {
    canonical: 'https://your-domain/cds-pyq',
  },
};

export default function CdsPyqLandingPage() {
  const archives = [
    { year: 'CDS II 2023', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS I 2023', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS II 2022', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
    { year: 'CDS I 2022', papers: 'Elementary Mathematics, English, General Knowledge', status: 'Official Complete Solution' },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Official Curriculum Archive
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            20-Year Official UPSC CDS PYQ Papers
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Authentic previous year question papers mapped strictly per Section 52(1)(q) of the Indian Copyright Act 1957. Zero fabricated answer keys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archives.map((a, idx) => (
            <Card key={idx} className="p-5 border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-base">{a.year}</span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                  {a.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{a.papers}</p>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/pyq">
            <Button size="lg" className="font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Open 20-Year PYQ Vault
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
