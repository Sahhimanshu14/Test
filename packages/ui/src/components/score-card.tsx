import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Badge } from './badge';
import { Award, CheckCircle2, XCircle, Clock, Target, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ScoreCardProps {
  score: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  accuracyPercentage: number;
  timeSpentMinutes?: number;
  targetAcademy?: string;
  isCleared?: boolean;
  expectedCutoff?: number;
  className?: string;
}

export function ScoreCard({
  score,
  totalMarks,
  correctCount,
  incorrectCount,
  unattemptedCount,
  accuracyPercentage,
  timeSpentMinutes,
  targetAcademy = 'IMA',
  isCleared,
  expectedCutoff = 135,
  className,
}: ScoreCardProps) {
  const percentage = Math.max(0, Math.min(100, (score / totalMarks) * 100));

  return (
    <Card className={cn('overflow-hidden border-slate-800 bg-slate-900/60 p-6 space-y-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Examination Assessment
          </span>
          <h2 className="text-2xl font-black text-white mt-1">Official Merit Scorecard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluated under standard UPSC negative marking rules (+1.0 / -0.33)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Target Academy
            </span>
            <Badge variant={targetAcademy.toLowerCase() as any} className="mt-1">
              {targetAcademy}
            </Badge>
          </div>
        </div>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
          <span className="text-xs font-semibold text-emerald-400">Net Marks</span>
          <p className="text-3xl font-black text-white mt-1">
            {score.toFixed(2)}
            <span className="text-xs font-normal text-slate-400"> / {totalMarks}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">Accuracy Rate</span>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            {accuracyPercentage.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">Correct Questions</span>
          <p className="text-3xl font-black text-emerald-400 mt-1">{correctCount}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <span className="text-xs font-semibold text-slate-400">Incorrect Penalty</span>
          <p className="text-3xl font-black text-rose-400 mt-1">{incorrectCount}</p>
        </div>
      </div>

      {/* Target Academy Cutoff Gauge */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-amber-400" />
            <span>Estimated {targetAcademy} Cutoff: {expectedCutoff} Marks</span>
          </span>
          <span
            className={cn(
              'font-bold',
              score >= expectedCutoff ? 'text-emerald-400' : 'text-amber-400'
            )}
          >
            {score >= expectedCutoff
              ? `Clearance Projected (+${(score - expectedCutoff).toFixed(1)})`
              : `Deficit of ${(expectedCutoff - score).toFixed(1)} Marks`}
          </span>
        </div>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn(
              'h-full transition-all duration-500',
              score >= expectedCutoff ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${Math.min(100, Math.max(5, (score / expectedCutoff) * 100))}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
