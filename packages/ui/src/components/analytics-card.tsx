import * as React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { TrendingUp, TrendingDown, Clock, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  children?: React.ReactNode;
  className?: string;
}

export function AnalyticsCard({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = 'default',
  children,
  className,
}: AnalyticsCardProps) {
  const borderVariants = {
    default: 'border-slate-800 bg-slate-900/60',
    success: 'border-emerald-500/30 bg-slate-900/60',
    warning: 'border-amber-500/30 bg-slate-900/60',
    info: 'border-sky-500/30 bg-slate-900/60',
  };

  return (
    <Card className={cn('p-5 space-y-3', borderVariants[variant], className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black text-white">{value}</span>
        {change && (
          <span
            className={cn(
              'flex items-center text-xs font-bold',
              change.isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {change.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
            )}
            {change.value > 0 ? `+${change.value}%` : `${change.value}%`}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      {children}
    </Card>
  );
}
