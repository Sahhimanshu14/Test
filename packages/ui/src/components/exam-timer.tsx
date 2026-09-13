'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export interface ExamTimerProps {
  expiresAt: Date | string;
  onExpire?: () => void;
  className?: string;
}

export function ExamTimer({ expiresAt, onExpire, className = '' }: ExamTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const targetTime = new Date(expiresAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((targetTime - now) / 1000);
      const remaining = Math.max(0, diff);

      setRemainingSeconds(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isCritical = remainingSeconds < 300; // < 5 minutes
  const isWarning = remainingSeconds < 900 && !isCritical; // < 15 minutes

  const colorStyles = isCritical
    ? 'border-rose-500/50 bg-rose-950/40 text-rose-300 animate-pulse'
    : isWarning
    ? 'border-amber-500/50 bg-amber-950/40 text-amber-300'
    : 'border-slate-700 bg-slate-900/80 text-emerald-400';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono font-bold text-sm tracking-wider shadow-sm backdrop-blur-sm ${colorStyles} ${className}`}
      aria-label={`Time remaining: ${formattedTime}`}
    >
      {isCritical ? (
        <AlertTriangle className="h-4 w-4 text-rose-400" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
}
