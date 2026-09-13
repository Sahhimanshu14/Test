import * as React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Progress } from './progress';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TopicCardProps {
  id: string;
  name: string;
  subjectName?: string;
  totalQuestions: number;
  completedQuestions: number;
  accuracyPercentage?: number;
  onPractice?: () => void;
  className?: string;
}

export function TopicCard({
  id,
  name,
  subjectName,
  totalQuestions,
  completedQuestions,
  accuracyPercentage,
  onPractice,
  className,
}: TopicCardProps) {
  const progressPercent = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

  return (
    <Card
      className={cn(
        'group flex flex-col justify-between border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-all duration-150 space-y-4',
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {subjectName && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {subjectName}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-400">
            {completedQuestions}/{totalQuestions} solved
          </span>
        </div>

        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
          {name}
        </h4>

        <div className="space-y-1 pt-1">
          <Progress value={progressPercent} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>{progressPercent}% Complete</span>
            {accuracyPercentage !== undefined && (
              <span className="text-slate-400 font-semibold">{accuracyPercentage}% Acc</span>
            )}
          </div>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onPractice}
        className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-700"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Practice Topic</span>
      </Button>
    </Card>
  );
}
