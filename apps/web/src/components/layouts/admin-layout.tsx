'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Button } from '@cdsprep/ui';
import {
  Shield,
  Users,
  FileCheck,
  BarChart3,
  Layers,
  ArrowLeft,
  Lock,
  LogOut,
  Sliders,
  LayoutDashboard,
  PlusCircle,
  UploadCloud,
  BookOpen,
  CheckSquare,
  FolderTree,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';

export interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSuperAdmin = user?.roles?.includes(RoleType.SUPER_ADMIN);

  const navSections: NavSection[] = [
    {
      title: 'Command & Telemetry',
      items: [
        { label: 'Control Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Platform Telemetry', href: '/admin/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Content & Examination',
      items: [
        { label: 'Question Bank', href: '/admin/questions', icon: FileCheck },
        { label: 'Create Question', href: '/admin/questions/create', icon: PlusCircle },
        { label: 'Bulk Question Import', href: '/admin/questions/import', icon: UploadCloud },
        { label: '20-Year PYQs', href: '/admin/pyq', icon: BookOpen },
        { label: 'Test Builder', href: '/admin/tests', icon: CheckSquare },
        { label: 'Subjects & Chapters', href: '/admin/subjects', icon: Layers },
        { label: 'Topic Taxonomy', href: '/admin/topics', icon: FolderTree },
      ],
    },
    {
      title: 'Supervision & Safety',
      items: [
        { label: 'Cadet Directory', href: '/admin/users', icon: Users },
        { label: 'Question Reports', href: '/admin/reports', icon: AlertTriangle },
        { label: 'AI Moderation Center', href: '/admin/ai', icon: Sparkles, badge: 'AI' },
        { label: 'Security Audit Trail', href: '/admin/audit-logs', icon: ShieldAlert },
        { label: 'System Settings', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-950/95 sticky top-0 h-screen z-30">
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Lock className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-white">
                CDS<span className="text-amber-400">ADMIN</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-amber-300 font-bold -mt-0.5">
                Staff Console
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-4 p-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {section.title}
              </span>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm shadow-amber-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <Link href="/dashboard" className="w-full block">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-slate-800 text-slate-300 hover:bg-slate-900 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Cadet HQ</span>
            </Button>
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden">
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 p-4 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-sm font-black text-white">Staff Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-4 py-3 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </span>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            isActive
                              ? 'bg-amber-500/15 text-amber-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="pt-2 border-t border-slate-800">
              <Link href="/dashboard" className="w-full block">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Return to Cadet HQ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/85 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Staff Clearance Level:</span>
            </span>
            <span className="rounded bg-amber-950/80 border border-amber-800/40 px-2 py-0.5 text-xs font-bold text-amber-300">
              {isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden md:inline">
              Officer: {user?.fullName || 'Staff Officer'}
            </span>
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
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
