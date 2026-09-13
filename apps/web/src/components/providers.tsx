'use client';

import React from 'react';
import { AuthProvider } from '../context/auth-context';
import { ToastProvider } from '@cdsprep/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
