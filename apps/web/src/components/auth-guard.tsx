'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { RoleType } from '@cdsprep/types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@cdsprep/ui';
import Link from 'next/link';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400 font-medium">Verifying security clearance...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole =
      user?.roles?.includes(RoleType.SUPER_ADMIN) ||
      allowedRoles.some((role) => user?.roles?.includes(role));

    if (!hasRole) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Restricted Security Clearance
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Your account ({user?.roles?.join(', ') || 'Cadet'}) does not possess the requisite clearance levels to access this command area.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/dashboard">
              <Button variant="default" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Cadet HQ
              </Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
