'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';
import { Button } from '@cdsprep/ui';
import { ArrowRight } from 'lucide-react';

export function LandingHeroCta() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
      <Link href={isAuthenticated ? '/dashboard' : '/register'}>
        <Button size="lg" className="font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2">
          <span>{isAuthenticated ? 'Open Cadet HQ' : 'Begin Free Enlistment'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link href="/practice">
        <Button variant="outline" size="lg" className="border-slate-800 text-slate-300 hover:bg-slate-900">
          Browse Practice Questions
        </Button>
      </Link>
    </div>
  );
}
