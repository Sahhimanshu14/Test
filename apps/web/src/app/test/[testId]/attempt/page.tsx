'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../../../components/auth-guard';
import { apiClient } from '../../../../lib/api-client';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@cdsprep/ui';

export default function TestAttemptRedirectPage() {
  return (
    <AuthGuard>
      <AttemptInitializer />
    </AuthGuard>
  );
}

function AttemptInitializer() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!testId) return;

      try {
        const res = await apiClient.post<any>('/attempts/start', { testId });
        const attemptId = res?.attempt?.id || res?.data?.attempt?.id || res?.id;

        if (attemptId && isMounted) {
          router.replace(`/test/${testId}/attempt/${attemptId}`);
          return;
        }

        // Fallback to instructions page if attempt ID is not returned
        if (isMounted) {
          router.replace(`/test/${testId}/instructions`);
        }
      } catch (err: any) {
        // If start requires accepting instructions first, navigate to instructions
        if (isMounted) {
          router.replace(`/test/${testId}/instructions`);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [testId, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-6 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <Shield className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Initializing Examination Session
          </h2>
          <p className="text-xs text-slate-400">
            Establishing server-authoritative timer and authentic UPSC test environment...
          </p>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <Button
              onClick={() => router.push(`/test/${testId}/instructions`)}
              className="w-full bg-emerald-500 text-slate-950 font-bold"
            >
              Go to Test Instructions
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting to examination engine...</span>
          </div>
        )}
      </div>
    </div>
  );
}
