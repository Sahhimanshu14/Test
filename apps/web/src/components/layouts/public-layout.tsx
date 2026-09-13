'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import { Button } from '@cdsprep/ui';
import { Shield, BookOpen, History, FileCheck2, Flame, LogOut, Lock, User, Menu } from 'lucide-react';
import { RoleType } from '@cdsprep/types';

export interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isStaff =
    user?.roles?.includes(RoleType.SUPER_ADMIN) ||
    user?.roles?.includes(RoleType.ADMIN) ||
    user?.roles?.includes(RoleType.CONTENT_EDITOR) ||
    user?.roles?.includes(RoleType.MODERATOR);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 group-hover:bg-emerald-400 transition">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-wider text-white">
                  CDS<span className="text-emerald-400">PREP</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold -mt-1">
                  UPSC Defence Portal
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/practice"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                <span>Practice Hub</span>
              </Link>
              <Link
                href="/pyq"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
              >
                <History className="h-3.5 w-3.5 text-slate-400" />
                <span>20-Yr PYQs</span>
              </Link>
              <Link
                href="/tests"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Mock Tests</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
                    <Flame className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{user?.currentStreak || 0}d</span>
                  </div>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {user?.targetAcademy || 'IMA'}
                  </span>
                </div>

                <Link href="/dashboard">
                  <Button size="sm" className="font-bold">
                    Cadet HQ
                  </Button>
                </Link>

                {isStaff && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-300 hover:bg-amber-950/30">
                      <Lock className="h-3.5 w-3.5 mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Cadet Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="font-bold">
                    Enlist Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Academic Disciplined Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-base font-black tracking-wider text-white">
                  CDS<span className="text-emerald-400">PREP</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                Dedicated high-stakes preparation system for the Union Public Service Commission (UPSC) Combined Defence Services Examination. Tailored tracks for IMA (Dehradun), INA (Ezhimala), AFA (Dundigal), and OTA (Chennai).
              </p>
              <div className="text-[11px] text-slate-500 leading-normal">
                Official UPSC marking algorithms • Step-by-step KaTeX mathematical derivations • 20-year official question archives.
              </div>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Curriculum Hubs
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><Link href="/cds" className="hover:text-emerald-400">CDS Exam Overview</Link></li>
                <li><Link href="/cds-maths" className="hover:text-emerald-400">Elementary Mathematics</Link></li>
                <li><Link href="/cds-english" className="hover:text-emerald-400">English Language</Link></li>
                <li><Link href="/cds-gk" className="hover:text-emerald-400">General Knowledge</Link></li>
                <li><Link href="/cds-pyq" className="hover:text-emerald-400">20-Year PYQ Archive</Link></li>
                <li><Link href="/cds-mock-tests" className="hover:text-emerald-400">Full-Length Mocks</Link></li>
                <li><Link href="/cds-preparation" className="hover:text-emerald-400">Preparation Roadmap</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Legal & Governance
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><Link href="/privacy" className="hover:text-emerald-400">Privacy Policy (DPDPA)</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-400">Terms of Service</Link></li>
                <li><Link href="/cookie-policy" className="hover:text-emerald-400">Cookie Policy</Link></li>
                <li><Link href="/refund-policy" className="hover:text-emerald-400">Refund Policy</Link></li>
                <li><Link href="/subscription-terms" className="hover:text-emerald-400">Subscription Terms</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Platform & Support
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><Link href="/about" className="hover:text-emerald-400">About CDSPrep</Link></li>
                <li><Link href="/contact" className="hover:text-emerald-400">Cadet Support Desk</Link></li>
                <li><Link href="/practice" className="hover:text-emerald-400">Practice Hub</Link></li>
                <li><Link href="/onboarding" className="hover:text-emerald-400">Cadet Onboarding</Link></li>
                <li><Link href="/login" className="hover:text-emerald-400">Cadet Sign In</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© 2026 CDSPrep Platform • Academic UPSC Defence Candidate System.</p>
            <p className="text-[11px]">Strict anti-cheat server enforcement • Section 52(1)(q) statutory provenance • WCAG 2.2 AA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
