import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const alertVariants = cva(
  'relative w-full rounded-xl border p-4 text-xs [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-2px] [&:has(svg)]:pl-11',
  {
    variants: {
      variant: {
        default: 'border-slate-800 bg-slate-900/80 text-slate-200 [&>svg]:text-slate-400',
        info: 'border-sky-500/30 bg-sky-950/20 text-sky-200 [&>svg]:text-sky-400',
        success: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200 [&>svg]:text-emerald-400',
        warning: 'border-amber-500/30 bg-amber-950/20 text-amber-200 [&>svg]:text-amber-400',
        destructive: 'border-rose-500/30 bg-rose-950/20 text-rose-200 [&>svg]:text-rose-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
}

export function Alert({ className, variant = 'default', icon, children, ...props }: AlertProps) {
  const defaultIcons = {
    default: <Info className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon || defaultIcons[variant || 'default']}
      <div>{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn('mb-1 font-bold text-sm tracking-tight text-white', className)} {...props} />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-xs text-slate-300 leading-relaxed', className)} {...props} />;
}
