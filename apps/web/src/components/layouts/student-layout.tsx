'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Button, AvatarCadet, Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@cdsprep/ui';
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  History,
  AlertOctagon,
  BarChart3,
  User,
  Settings,
  Flame,
  LogOut,
  Menu,
  Lock,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';

export interface StudentLayoutProps {
  children: React.ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isStaff =
    user?.roles?.includes(RoleType.SUPER_ADMIN) ||
    user?.roles?.includes(RoleType.ADMIN) ||
    user?.roles?.includes(RoleType.CONTENT_EDITOR) ||
    user?.roles?.includes(RoleType.MODERATOR);

  const navItems = [
    { label: 'Cadet HQ', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mock Tests', href: '/tests', icon: FileCheck2 },
    { label: 'Practice Hub', href: '/practice', icon: BookOpen },
    { label: '20-Yr PYQs', href: '/pyq', icon: History },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Mistakes', href: '/mistakes', icon: AlertOctagon },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { label: 'Candidate Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-800 bg-slate-950/95 transition-all duration-200 z-30 sticky top-0 h-screen ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-base font-black tracking-wider text-white">
                CDS<span className="text-emerald-400">PREP</span>
              </span>
            </Link>
          )}

          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black">
              <Shield className="h-4 w-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Candidate Card */}
        <div className="p-3 border-t border-slate-800">
          {!collapsed ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <AvatarCadet
                  name={user?.fullName || 'Cadet'}
                  academy={user?.targetAcademy || 'IMA'}
                  size="sm"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.fullName || 'Cadet'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                <span className="text-slate-400">Target:</span>
                <span className="font-bold text-emerald-400">{user?.targetAcademy || 'IMA'}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <AvatarCadet
                name={user?.fullName || 'Cadet'}
                academy={user?.targetAcademy || 'IMA'}
                size="sm"
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/85 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger */}
            <div className="md:hidden">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMobileDrawerOpen(true)}
                className="h-9 w-9"
                aria-label="Open mobile navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cadet Headquarters
              </span>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 hidden sm:inline font-medium">
                Preparation Status: Nominal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{user?.currentStreak || 1} Day Streak</span>
            </div>

            {/* Target Academy Tag */}
            <Link href="/profile">
              <span className="rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:border-emerald-400 transition cursor-pointer">
                {user?.targetAcademy || 'IMA'} Aspirant
              </span>
            </Link>

            {/* Admin Command Link if Staff */}
            {isStaff && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-950/30 text-xs hidden sm:flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" />
                  <span>Admin</span>
                </Button>
              </Link>
            )}

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <DrawerContent side="left" className="w-72 p-4">
            <DrawerHeader className="border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black">
                  <Shield className="h-4 w-4" />
                </div>
                <DrawerTitle className="text-base font-black">
                  CDS<span className="text-emerald-400">PREP</span>
                </DrawerTitle>
              </div>
            </DrawerHeader>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </DrawerContent>
        </Drawer>

        {/* Child Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
