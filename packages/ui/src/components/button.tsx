import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-slate-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 shadow-sm hover:shadow-emerald-950/40',
        secondary:
          'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/60 shadow-sm',
        outline:
          'border border-slate-700/80 bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
        destructive:
          'bg-rose-600 text-white font-bold hover:bg-rose-500 shadow-sm hover:shadow-rose-950/40',
        ghost:
          'text-slate-300 hover:bg-slate-800/70 hover:text-white',
        link:
          'text-emerald-400 underline-offset-4 hover:underline p-0 h-auto font-medium',
        brass:
          'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-sm hover:shadow-amber-950/40',
        navy:
          'bg-sky-600 text-white font-bold hover:bg-sky-500 shadow-sm hover:shadow-sky-950/40',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-current" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
