import * as React from 'react';
import { MathRenderer } from './math-renderer';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface OptionCardProps {
  id: string;
  identifier: string; // 'A', 'B', 'C', 'D'
  optionText: string;
  isSelected?: boolean;
  isCorrect?: boolean; // defined in review / practice solution mode
  isRevealed?: boolean;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export function OptionCard({
  id,
  identifier,
  optionText,
  isSelected = false,
  isCorrect,
  isRevealed = false,
  disabled = false,
  onSelect,
  className,
}: OptionCardProps) {
  let stateStyle = 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80';
  let badgeStyle = 'border-slate-700 bg-slate-800 text-slate-300';

  if (isRevealed) {
    if (isCorrect) {
      stateStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-300 ring-1 ring-emerald-500 shadow-sm';
      badgeStyle = 'border-emerald-400 bg-emerald-500 text-slate-950 font-bold';
    } else if (isSelected && !isCorrect) {
      stateStyle = 'border-rose-500 bg-rose-950/30 text-rose-300 ring-1 ring-rose-500 shadow-sm';
      badgeStyle = 'border-rose-400 bg-rose-500 text-white font-bold';
    }
  } else if (isSelected) {
    stateStyle = 'border-emerald-500 bg-emerald-950/20 text-white ring-1 ring-emerald-500 shadow-sm';
    badgeStyle = 'border-emerald-400 bg-emerald-500 text-slate-950 font-black';
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(id)}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed',
        stateStyle,
        className
      )}
      aria-pressed={isSelected}
    >
      <span
        className={cn(
          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors',
          badgeStyle
        )}
      >
        {identifier}
      </span>
      <div className="flex-1 overflow-x-auto">
        <MathRenderer content={optionText} />
      </div>
      {isRevealed && isCorrect && (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
      )}
      {isRevealed && isSelected && !isCorrect && (
        <XCircle className="h-4 w-4 text-rose-400 ml-auto flex-shrink-0" />
      )}
    </button>
  );
}
