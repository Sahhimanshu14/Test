import * as React from 'react';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    ({ type = 'info', title, description, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, description, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Render Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[60] flex max-w-sm w-full flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-5 bg-slate-900',
              toast.type === 'success' && 'border-emerald-500/40 text-emerald-300',
              toast.type === 'error' && 'border-rose-500/40 text-rose-300',
              toast.type === 'warning' && 'border-amber-500/40 text-amber-300',
              toast.type === 'info' && 'border-slate-700 text-slate-200'
            )}
            role="status"
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400" />}
              {toast.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
              {toast.type === 'info' && <Info className="h-4 w-4 text-sky-400" />}
            </div>
            <div className="flex-1 space-y-0.5">
              <h5 className="text-xs font-bold text-white">{toast.title}</h5>
              {toast.description && (
                <p className="text-[11px] text-slate-300 leading-snug">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
      toast: () => {},
    };
  }
  return {
    toasts: context.toasts,
    addToast: context.addToast,
    removeToast: context.removeToast,
    toast: context.addToast,
  };
}
