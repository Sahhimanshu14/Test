import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30',
        secondary: 'bg-slate-800 text-slate-300 border-slate-700',
        outline: 'border-slate-700 bg-transparent text-slate-300',
        success: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
        warning: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
        destructive: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
        ima: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
        ina: 'bg-sky-950 text-sky-300 border-sky-500/40',
        afa: 'bg-amber-950 text-amber-300 border-amber-500/40',
        ota: 'bg-purple-950 text-purple-300 border-purple-500/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
