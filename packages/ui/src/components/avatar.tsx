import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../lib/utils';
import { Shield } from 'lucide-react';

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-slate-100',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export interface AvatarCadetProps {
  name?: string;
  academy?: 'IMA' | 'INA' | 'AFA' | 'OTA' | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarCadet({
  name = 'Cadet',
  academy = 'IMA',
  className,
  size = 'md',
}: AvatarCadetProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base font-black',
  };

  const initial = name.trim().charAt(0).toUpperCase() || 'C';

  const academyBadgeColors: Record<string, string> = {
    IMA: 'bg-emerald-500 text-slate-950',
    INA: 'bg-sky-500 text-slate-950',
    AFA: 'bg-amber-500 text-slate-950',
    OTA: 'bg-purple-500 text-slate-950',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-white font-bold shadow-md',
          sizeClasses[size]
        )}
      >
        {initial}
      </div>
      {academy && (
        <span
          className={cn(
            'absolute -bottom-1 -right-1 flex h-4 px-1 items-center justify-center rounded-sm text-[9px] font-black uppercase tracking-tight shadow-sm',
            academyBadgeColors[academy] || 'bg-slate-700 text-white'
          )}
          title={`Target Academy: ${academy}`}
        >
          {academy}
        </span>
      )}
    </div>
  );
}
