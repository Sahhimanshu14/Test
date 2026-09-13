import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'CDSPrep — Prepare Smarter. Practice Better.',
  description:
    'Production-grade competitive examination preparation platform for UPSC Combined Defence Services (CDS) aspirants for IMA, INA, AFA, and OTA.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased selection:bg-emerald-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
