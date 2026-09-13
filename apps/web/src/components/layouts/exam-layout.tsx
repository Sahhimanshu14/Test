'use client';

import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button, ExamTimer } from '@cdsprep/ui';

export interface ExamLayoutProps {
  title: string;
  sectionName?: string;
  expiresAt: string | Date;
  antiCheatViolations?: number;
  onTimeExpire?: () => void;
  onSubmitClick?: () => void;
  paletteContent?: React.ReactNode;
  children: React.ReactNode;
}

export function ExamLayout({
  title,
  sectionName = 'General',
  expiresAt,
  antiCheatViolations = 0,
  onTimeExpire,
  onSubmitClick,
  paletteContent,
  children,
}: ExamLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Distraction-Free Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{title}</h1>
              <span className="text-[11px] text-slate-400">Section: {sectionName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {antiCheatViolations > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-950/60 border border-amber-800/40 px-2 py-1 text-[11px] text-amber-300 font-semibold">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>Audits: {antiCheatViolations}</span>
              </span>
            )}

            {expiresAt && (
              <ExamTimer expiresAt={expiresAt} onExpire={onTimeExpire} />
            )}

            {onSubmitClick && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onSubmitClick}
                className="font-bold shadow-md shadow-rose-950/50 text-xs"
              >
                Finish Exam
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center Question Pane */}
        <div className="flex-1 flex flex-col overflow-y-auto">{children}</div>

        {/* Right Palette Pane */}
        {paletteContent && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/70 p-4 lg:p-6 overflow-y-auto">
            {paletteContent}
          </aside>
        )}
      </div>
    </div>
  );
}
