'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { Button } from '@cdsprep/ui';
import {
  Shield,
  FileCheck2,
  BookOpen,
  History,
  AlertOctagon,
  Bookmark,
  User,
  LogOut,
  LayoutDashboard,
  Search,
  Bell,
  Trophy,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { api } from '../lib/api';

export function CadetNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      api
        .get<{ unreadCount: number }>('/notifications')
        .then((res: { unreadCount: number }) => setUnreadCount(res.unreadCount || 0))
        .catch(() => {});
    }
  }, [user]);


  const isStaff =
    user?.roles?.includes(RoleType.SUPER_ADMIN) ||
    user?.roles?.includes(RoleType.ADMIN) ||
    user?.roles?.includes(RoleType.CONTENT_EDITOR) ||
    user?.roles?.includes(RoleType.MODERATOR);

  const navItems = [
    { label: 'HQ Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mock Tests', href: '/tests', icon: FileCheck2 },
    { label: 'Practice Hub', href: '/practice', icon: BookOpen },
    { label: '20-Yr PYQs', href: '/pyq', icon: History },
    { label: 'Mistakes', href: '/mistakes', icon: AlertOctagon },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Shield className="h-5 w-5 text-slate-950" />
            </div>
            <span className="text-lg font-black tracking-wider text-white">
              CDS<span className="text-emerald-400">PREP</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <Link
            href="/search"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 text-xs text-slate-400 hover:border-slate-700 hover:text-white transition"
            title="Global Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </Link>

          {/* Notifications Center */}
          <Link
            href="/notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white transition"
            title="Cadet Briefings & Alerts"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-slate-950 shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {isStaff && (
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-950/30"
              >
                Admin HQ
              </Button>
            </Link>
          )}

          <Link href="/profile">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 transition">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium hidden sm:inline">{user?.fullName || 'Cadet'}</span>
              <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/40">
                {user?.targetAcademy || 'IMA'}
              </span>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
