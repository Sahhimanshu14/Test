'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { RoleType } from '@cdsprep/types';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER, RoleType.MODERATOR]}>
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse text-sm font-semibold tracking-wider text-amber-400">
          Entering CDSPrep Staff Command...
        </div>
      </div>
    </AuthGuard>
  );
}
