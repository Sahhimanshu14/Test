import * as React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Clock, Award, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TestCardProps {
  id: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number | null;
  isFullMock?: boolean;
  targetAcademy?: string;
  questionCount?: number;
  sections?: Array<{ id: string; name: string }>;
  isCompleted?: boolean;
  lastScore?: number | null;
  onStart?: () => void;
  className?: string;
}

export function TestCard({
  id,
  title,
  description,
  durationMinutes,
  totalMarks,
  passingMarks = 60,
  isFullMock = true,
  targetAcademy = 'IMA',
  questionCount,
  sections = [],
  isCompleted = false,
  lastScore,
  onStart,
  className,
}: TestCardProps) {
  return (
    <Card
      className={cn(
        'group flex flex-col justify-between overflow-hidden border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-150',
        className
      )}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={isFullMock ? 'default' : 'secondary'} className="text-[10px] font-bold">
            {isFullMock ? 'Full Mock Test' : 'Sectional Drill'}
          </Badge>
          <span className="text-[11px] font-semibold text-emerald-400">
            Target: {targetAcademy}
          </span>
        </div>

        {/* Title and Description */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {description ||
              'Authentic UPSC simulation with 6-state palette, server timer, and sectional scoring.'}
          </p>
        </div>

        {/* Exam Specifications */}
        <div className="grid grid-cols-3 gap-2 border-y border-slate-800/80 py-3 text-center">
          <div>
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-slate-500" />
              Time
            </span>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{durationMinutes} min</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-slate-500" />
              Marks
            </span>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{totalMarks}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Shield className="h-3 w-3 text-slate-500" />
              Cutoff
            </span>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{passingMarks || 60}</p>
          </div>
        </div>

        {/* Section Tags */}
        {Array.isArray(sections) && sections.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sections ({sections.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sections.map((sec, sIdx) => (
                <span
                  key={sec?.id || `sec_${sIdx}`}
                  className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                >
                  {sec?.name || `Section ${sIdx + 1}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="border-t border-slate-800/80 bg-slate-950/40 p-4">
        <Button
          onClick={onStart}
          className="w-full font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs flex items-center justify-center gap-2 shadow-sm"
        >
          <span>{isCompleted ? 'Retake Examination' : 'Enter Examination'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
