'use client';

import React from 'react';
import { QuestionPaletteState } from '@cdsprep/types';

export interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  questionStates: Record<number, QuestionPaletteState>;
  onSelectQuestion: (index: number) => void;
  className?: string;
}

export function QuestionPalette({
  totalQuestions,
  currentIndex,
  questionStates,
  onSelectQuestion,
  className = '',
}: QuestionPaletteProps) {
  // Counts summary
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let reviewCount = 0;
  let ansReviewCount = 0;
  let unvisitedCount = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const state = questionStates[i] || QuestionPaletteState.UNVISITED;
    if (state === QuestionPaletteState.ANSWERED) answeredCount++;
    else if (state === QuestionPaletteState.NOT_ANSWERED) notAnsweredCount++;
    else if (state === QuestionPaletteState.MARKED_FOR_REVIEW) reviewCount++;
    else if (state === QuestionPaletteState.ANSWERED_AND_MARKED_FOR_REVIEW) ansReviewCount++;
    else unvisitedCount++;
  }

  const getStyleForState = (state: QuestionPaletteState, isCurrent: boolean) => {
    const ring = isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 font-bold scale-105' : '';

    switch (state) {
      case QuestionPaletteState.ANSWERED:
        return `bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-400/50 ${ring}`;
      case QuestionPaletteState.NOT_ANSWERED:
        return `bg-rose-600 text-white hover:bg-rose-500 border-rose-400/50 ${ring}`;
      case QuestionPaletteState.MARKED_FOR_REVIEW:
        return `bg-purple-600 text-white hover:bg-purple-500 border-purple-400/50 ${ring}`;
      case QuestionPaletteState.ANSWERED_AND_MARKED_FOR_REVIEW:
        return `bg-purple-700 text-white hover:bg-purple-600 border-emerald-400 border-2 relative ${ring}`;
      case QuestionPaletteState.VISITED:
        return `bg-amber-600 text-white hover:bg-amber-500 border-amber-400/50 ${ring}`;
      case QuestionPaletteState.UNVISITED:
      default:
        return `bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700 ${ring}`;
    }
  };

  return (
    <div className={`flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 ${className}`}>
      {/* Legend Header */}
      <div className="border-b border-slate-800 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Question Palette
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white">
              {answeredCount}
            </span>
            <span className="text-slate-300">Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-[10px] font-bold text-white">
              {notAnsweredCount}
            </span>
            <span className="text-slate-300">Not Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-600 text-[10px] font-bold text-white">
              {reviewCount}
            </span>
            <span className="text-slate-300">Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-emerald-400 bg-purple-700 text-[10px] font-bold text-white">
              {ansReviewCount}
            </span>
            <span className="text-slate-300">Ans & Review</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-400">
              {unvisitedCount}
            </span>
            <span className="text-slate-400">Not Visited</span>
          </div>
        </div>
      </div>

      {/* Grid of Numbers */}
      <div className="max-h-72 overflow-y-auto pr-1">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const state = questionStates[index] || QuestionPaletteState.UNVISITED;
            const isCurrent = index === currentIndex;

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectQuestion(index)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition-all duration-150 ${getStyleForState(
                  state,
                  isCurrent
                )}`}
                aria-label={`Question ${index + 1}`}
              >
                {index + 1}
                {state === QuestionPaletteState.ANSWERED_AND_MARKED_FOR_REVIEW && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
