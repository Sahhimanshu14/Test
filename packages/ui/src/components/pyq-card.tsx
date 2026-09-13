import * as React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Clock, FileText, ArrowRight, History } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PYQCardProps {
  id: string;
  year: number;
  session: string; // 'CDS-I' or 'CDS-II'
  title: string;
  durationMinutes: number;
  totalMarks?: number;
  questionCount?: number;
  subjectName?: string;
  onOpen?: () => void;
  className?: string;
}

export function PYQCard({
  id,
  year,
  session,
  title,
  durationMinutes,
  totalMarks,
  questionCount,
  subjectName,
  onOpen,
  className,
}: PYQCardProps) {
  return (
    <Card
      className={cn(
        'group flex flex-col justify-between overflow-hidden border-slate-800 bg-slate-900/60 p-5 sm:p-6 hover:border-slate-700 transition-all duration-150 space-y-4',
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-bold">
            Year {year}
          </Badge>
          <span className="rounded bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-slate-700/60">
            {session}
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
            {title}
          </h3>
          {subjectName && (
            <p className="text-xs text-slate-400 mt-1">{subjectName}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            {durationMinutes} mins
          </span>
          {questionCount !== undefined && (
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              {questionCount} Questions
            </span>
          )}
        </div>
      </div>

      <Button
        onClick={onOpen}
        className="w-full font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs flex items-center justify-center gap-2 shadow-sm"
      >
        <span>Browse Archive Questions</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );
}
