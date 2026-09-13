import * as React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { MathRenderer } from './math-renderer';
import { Bookmark, Flag, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export interface QuestionCardProps {
  questionNumber?: number;
  questionText: string;
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | string;
  subjectName?: string;
  chapterName?: string;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onReportQuestion?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function QuestionCard({
  questionNumber,
  questionText,
  marks = 1,
  negativeMarks = 0.33,
  difficulty,
  subjectName,
  chapterName,
  isBookmarked = false,
  onToggleBookmark,
  onReportQuestion,
  children,
  className,
}: QuestionCardProps) {
  return (
    <Card className={cn('p-5 sm:p-6 space-y-4 border-slate-800 bg-slate-900/60', className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {questionNumber !== undefined && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-500/30 text-xs font-black text-emerald-400">
              {questionNumber}
            </span>
          )}
          {subjectName && (
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {subjectName}
            </span>
          )}
          {chapterName && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              • {chapterName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {difficulty && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold">
              {difficulty}
            </Badge>
          )}
          <span className="rounded bg-emerald-950/60 border border-emerald-800/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
            +{marks}
          </span>
          <span className="rounded bg-rose-950/60 border border-rose-800/30 px-2 py-0.5 text-[11px] font-bold text-rose-400">
            -{negativeMarks}
          </span>
          {onToggleBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleBookmark}
              className={cn(
                'h-8 w-8',
                isBookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
              )}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
          {onReportQuestion && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReportQuestion}
              className="h-8 w-8 text-slate-500 hover:text-rose-400"
              title="Report Question Error"
            >
              <Flag className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* KaTeX Question Content */}
      <div className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed overflow-x-auto">
        <MathRenderer content={questionText} />
      </div>

      {/* Options Slot */}
      {children && <div className="space-y-2.5 pt-2">{children}</div>}
    </Card>
  );
}
